# Passportr — Bulk Venue Import from Previous Hop

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Tasks A and B can run in parallel.

---

## Task A — API: Bulk import invitations from previous hop

Create `services/passportr/app/api/hops/[hopSlug]/invitations/import/route.js`:

```js
export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');
const { randomBytes } = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

function getCompletionText(rule) {
  if (!rule) return 'Visit all participating venues';
  if (rule.type === 'all') return 'Visit all participating venues';
  if (rule.type === 'percentage') return `Visit ${rule.percent}% of participating venues`;
  if (rule.type === 'minimum') return `Visit at least ${rule.count} participating venues`;
  if (rule.type === 'required_plus') return `Visit all required venues plus at least ${rule.minimum_optional || 0} optional venues`;
  return 'Visit all participating venues';
}

export async function POST(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;
    const { source_hop_slug } = await req.json();

    if (!source_hop_slug) {
      return Response.json({ error: 'source_hop_slug required' }, { status: 400 });
    }

    // Verify destination hop ownership
    const destHopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (destHopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const destHop = destHopResult.rows[0];
    if (destHop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Verify source hop ownership
    const sourceHopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [source_hop_slug]);
    if (sourceHopResult.rows.length === 0) return Response.json({ error: 'Source hop not found' }, { status: 404 });
    const sourceHop = sourceHopResult.rows[0];
    if (sourceHop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden — source hop not yours' }, { status: 403 });

    // Get accepted invitations from source hop
    const sourceInvitations = await db.query(
      `SELECT email, venue_name FROM venue_invitations
       WHERE hop_id = $1 AND status = 'accepted'`,
      [sourceHop.id]
    );

    if (sourceInvitations.rows.length === 0) {
      return Response.json({ error: 'No accepted venues found in source hop' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const results = { sent: [], skipped: [] };

    for (const inv of sourceInvitations.rows) {
      // Skip if already invited to destination hop
      const existing = await db.query(
        'SELECT id FROM venue_invitations WHERE hop_id = $1 AND email = $2',
        [destHop.id, inv.email]
      );
      if (existing.rows.length > 0) {
        results.skipped.push(inv.email);
        continue;
      }

      const token = randomBytes(20).toString('hex');

      await db.query(
        `INSERT INTO venue_invitations (hop_id, email, venue_name, token)
         VALUES ($1, $2, $3, $4)`,
        [destHop.id, inv.email, inv.venue_name, token]
      );

      const setupUrl = `${baseUrl}/venue/setup/${token}`;

      await transporter.sendMail({
        from: process.env.SES_FROM_EMAIL,
        to: inv.email,
        subject: `You're invited to join ${destHop.name} on Passportr`,
        text: [
          `Hi,`,
          ``,
          `You've been invited to participate in "${destHop.name}" on Passportr as a venue.`,
          ``,
          `Venue name: ${inv.venue_name}`,
          ``,
          `── How Passportr Works ──────────────`,
          `Passportr is a digital passport experience — no app to download, no paper to print.`,
          ``,
          `Participants visit your venue, scan your QR code with their phone's camera, and`,
          `their digital passport is automatically stamped. Once they've collected enough`,
          `stamps across participating venues, they unlock a reward at each one they visited.`,
          ``,
          `As a venue, your only job is to print your two QR codes and display them where`,
          `customers can easily scan them — at the register, on the counter, or in your window.`,
          `One QR code is for stamping passports. The other is for customers to redeem their`,
          `reward when they've completed the hop. Your setup link below gives you access to`,
          `both codes, your store details, and today's redemption count.`,
          ``,
          `── Hop Details ──────────────────────`,
          `Event dates: ${new Date(destHop.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(destHop.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Stamp cutoff: ${new Date(destHop.stamp_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Reward redemption deadline: ${new Date(destHop.redeem_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Completion requirement: ${getCompletionText(destHop.completion_rule)}`,
          `Coupon expiry: ${destHop.coupon_expiry_minutes} minutes after scanning`,
          `────────────────────────────────────`,
          ``,
          `Click the link below to set up your venue:`,
          `${setupUrl}`,
          ``,
          `This link is unique to your venue — don't share it.`,
          ``,
          `Passportr`,
        ].join('\n'),
      });

      results.sent.push(inv.email);
    }

    return Response.json({
      success: true,
      sent: results.sent.length,
      skipped: results.skipped.length,
      details: results,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Import invitations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Task B — Manage Hop Page: Import venues UI

Read `services/passportr/app/organize/[hopSlug]/page.jsx`.

**Change 1:** Add import state alongside existing state declarations:

```js
const [showImportModal, setShowImportModal] = useState(false);
const [importSourceSlug, setImportSourceSlug] = useState('');
const [importing, setImporting] = useState(false);
const [importResult, setImportResult] = useState(null);
const [allHops, setAllHops] = useState([]);
```

**Change 2:** In `loadAll`, fetch the organizer's other hops for the import dropdown. Add after the invitations fetch:

```js
const allHopsRes = await fetch('/api/hops', { credentials: 'include' });
if (allHopsRes.ok) {
  const d = await allHopsRes.json();
  // Exclude current hop from the list
  setAllHops(d.hops.filter(h => h.slug !== hopSlug));
}
```

**Change 3:** Add import handler alongside other handlers:

```js
async function importVenues(e) {
  e.preventDefault();
  if (!importSourceSlug) return;
  setImporting(true);
  setImportResult(null);
  try {
    const res = await fetch(`/api/hops/${hopSlug}/invitations/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ source_hop_slug: importSourceSlug }),
    });
    const data = await res.json();
    if (res.ok) {
      setImportResult(data);
      loadAll();
    } else {
      alert(data.error || 'Import failed');
    }
  } catch { alert('Network error'); }
  setImporting(false);
}
```

**Change 4:** Add an "Import from Previous Hop" button next to the existing "Invite Venue" button in the venues section header. Find:

```jsx
<button
  onClick={() => setShowInviteModal(true)}
  style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
>
  Invite Venue
</button>
```

Replace with:

```jsx
{allHops.length > 0 && (
  <button
    onClick={() => { setShowImportModal(true); setImportResult(null); }}
    style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
  >
    Import from Previous Hop
  </button>
)}
<button
  onClick={() => setShowInviteModal(true)}
  style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
>
  Invite Venue
</button>
```

**Change 5:** Add import modal. Place it directly after the invite modal block:

```jsx
{showImportModal && (
  <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--accent-teal)' }}>
    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Import Venues from Previous Hop</h3>
    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
      Sends new invitations to all venues that accepted in a previous hop. Already-invited venues are skipped.
    </p>
    {importResult ? (
      <div>
        <p style={{ fontSize: '14px', marginBottom: '8px' }}>
          ✅ Sent {importResult.sent} invitation{importResult.sent !== 1 ? 's' : ''}.
          {importResult.skipped > 0 && ` Skipped ${importResult.skipped} already invited.`}
        </p>
        <button
          onClick={() => setShowImportModal(false)}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Done
        </button>
      </div>
    ) : (
      <form onSubmit={importVenues}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Select Previous Hop
          </label>
          <select
            value={importSourceSlug}
            onChange={e => setImportSourceSlug(e.target.value)}
            required
            style={{ width: '100%' }}
          >
            <option value="">Choose a hop...</option>
            {allHops.map(h => (
              <option key={h.id} value={h.slug}>{h.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={importing || !importSourceSlug}>
            {importing ? 'Sending invitations...' : 'Import & Send Invitations'}
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(false)}
            style={{ backgroundColor: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    )}
  </div>
)}
```

---

## Verification Checklist

- [ ] `api/hops/[hopSlug]/invitations/import/route.js` — new file exists
- [ ] Import route verifies organizer owns both source and destination hops
- [ ] Import route skips venues already invited to destination hop
- [ ] Import route sends full invitation email with hop details and how-it-works copy
- [ ] Manage hop page loads all organizer hops on mount
- [ ] "Import from Previous Hop" button only appears when other hops exist
- [ ] Import modal shows hop dropdown, sends invitations, reports sent/skipped count
- [ ] No other files modified
