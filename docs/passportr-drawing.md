# Passportr — Drawing Feature

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Dependency Order

Task A (migration) must run before all others.
Tasks B, C, D, E, F can run in parallel after A.
Task G depends on E and F.

---

## Task A — Migration

Read all existing files in `services/passportr/migrations/` to confirm the next migration number.

Create `services/passportr/migrations/006_drawing.sql`:

```sql
ALTER TABLE hops
  ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS drawing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS drawing_winners_count INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS drawing_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drawing_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES drawing_prizes(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE(hop_id, participant_id)
);
```

---

## Task B — Drawing API routes

### B1 — Create `services/passportr/app/api/hops/[hopSlug]/drawing/route.js`

Handles GET (fetch drawing state) and POST (run the draw).

```js
export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');

export async function GET(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const prizesResult = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );

    const winnersResult = await db.query(
      `SELECT dw.*, p.user_id, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    const eligibleResult = await db.query(
      'SELECT COUNT(*) as count FROM participants WHERE hop_id = $1 AND completed_at IS NOT NULL',
      [hop.id]
    );

    return Response.json({
      prizes: prizesResult.rows,
      winners: winnersResult.rows,
      eligible_count: parseInt(eligibleResult.rows[0].count),
      drawn: winnersResult.rows.length > 0,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!hop.drawing_enabled) {
      return Response.json({ error: 'Drawing not enabled for this hop' }, { status: 400 });
    }

    // Check drawing hasn't already been run
    const existingWinners = await db.query(
      'SELECT id FROM drawing_winners WHERE hop_id = $1',
      [hop.id]
    );
    if (existingWinners.rows.length > 0) {
      return Response.json({ error: 'Drawing has already been run' }, { status: 409 });
    }

    // Get all eligible participants (completed, no repeats)
    const eligibleResult = await db.query(
      'SELECT id, user_id FROM participants WHERE hop_id = $1 AND completed_at IS NOT NULL',
      [hop.id]
    );
    const eligible = eligibleResult.rows;

    if (eligible.length === 0) {
      return Response.json({ error: 'No eligible participants' }, { status: 400 });
    }

    // Get prizes
    const prizesResult = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );
    const prizes = prizesResult.rows;

    // Shuffle eligible participants (Fisher-Yates)
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const winnerCount = Math.min(hop.drawing_winners_count, pool.length);
    const selectedWinners = pool.slice(0, winnerCount);

    // Insert winners — no repeats enforced by UNIQUE constraint
    for (let i = 0; i < selectedWinners.length; i++) {
      const prize = prizes[i] || null;
      await db.query(
        `INSERT INTO drawing_winners (hop_id, participant_id, prize_id)
         VALUES ($1, $2, $3)`,
        [hop.id, selectedWinners[i].id, prize?.id || null]
      );
    }

    // Return winners with prize labels
    const winnersResult = await db.query(
      `SELECT dw.*, p.user_id, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    return Response.json({ winners: winnersResult.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### B2 — Create `services/passportr/app/api/hops/[hopSlug]/drawing/notify/route.js`

Sends winner notification emails. Organizer triggers this separately after reviewing results.

```js
export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');
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

export async function POST(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Get unnotified winners with their email addresses
    const winnersResult = await db.query(
      `SELECT dw.id, dw.participant_id, dp.label as prize_label,
              u_email.email as winner_email
       FROM drawing_winners dw
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       JOIN participants p ON p.id = dw.participant_id
       JOIN (
         SELECT user_id, email FROM organizer_profiles
         UNION ALL
         SELECT id::text as user_id, email FROM (
           SELECT id, email FROM auth_users
         ) auth
       ) u_email ON u_email.user_id = p.user_id
       WHERE dw.hop_id = $1 AND dw.notified_at IS NULL`,
      [hop.id]
    );

    // The above join is complex — use the auth service approach instead.
    // Get participant user_ids, then look up emails from the auth service db isn't accessible.
    // Instead, store email on participants at stamp time. For now query what we have.
    // See note below — this route fetches winner emails from the participants table user_id
    // by calling the auth service profile endpoint server-side.

    const winners = await db.query(
      `SELECT dw.id, p.user_id, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1 AND dw.notified_at IS NULL
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    let notified = 0;
    for (const winner of winners.rows) {
      // Fetch winner email from auth service
      let winnerEmail;
      try {
        const authRes = await fetch(
          `${process.env.AUTH_BASE_URL}/profile/${winner.user_id}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (authRes.ok) {
          const authData = await authRes.json();
          winnerEmail = authData.profile?.email || null;
        }
      } catch {
        continue;
      }

      if (!winnerEmail) continue;

      const prizeText = winner.prize_label
        ? `You've won: ${winner.prize_label}`
        : 'You\'ve been selected as a winner!';

      await transporter.sendMail({
        from: process.env.SES_FROM_EMAIL,
        to: winnerEmail,
        subject: `You won the ${hop.name} drawing!`,
        text: [
          `Congratulations!`,
          ``,
          `You've been selected as a winner in the ${hop.name} drawing.`,
          ``,
          prizeText,
          ``,
          `The organizer will be in touch with details. You can reach them at ${user.email}.`,
          ``,
          `Thanks for participating in ${hop.name}!`,
          ``,
          `Passportr`,
        ].join('\n'),
      });

      await db.query(
        'UPDATE drawing_winners SET notified_at = NOW() WHERE id = $1',
        [winner.id]
      );

      notified++;
    }

    return Response.json({ notified });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing notify error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Important note on winner emails:** The auth service's `/profile/{userId}` endpoint returns public profile data but not email. Email is not publicly exposed. To solve this cleanly, Task C adds `email` to the `participants` table — populated at stamp time from the JWT — so winner emails are available without cross-service lookups.

---

## Task C — Store participant email at stamp time

### C1 — Migration addition

Add to `services/passportr/migrations/006_drawing.sql` (add at the end of the file before running):

```sql
ALTER TABLE participants ADD COLUMN IF NOT EXISTS email TEXT;
```

### C2 — Update stamp route

Read `services/passportr/app/api/stamp/route.js`.

In the participant INSERT, add `email`:

Find:
```js
const insertResult = await db.query(
  'INSERT INTO participants (hop_id, user_id) VALUES ($1, $2) RETURNING *',
  [hop.id, user.sub]
);
```

Replace with:
```js
const insertResult = await db.query(
  'INSERT INTO participants (hop_id, user_id, email) VALUES ($1, $2, $3) RETURNING *',
  [hop.id, user.sub, user.email]
);
```

### C3 — Update drawing notify route

Replace the complex winner email lookup in B2 with a direct query against `participants.email`:

In `drawing/notify/route.js`, replace the winners query and email lookup with:

```js
const winners = await db.query(
  `SELECT dw.id, p.user_id, p.email as winner_email, dp.label as prize_label
   FROM drawing_winners dw
   JOIN participants p ON p.id = dw.participant_id
   LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
   WHERE dw.hop_id = $1 AND dw.notified_at IS NULL
   ORDER BY dp.sort_order`,
  [hop.id]
);

let notified = 0;
for (const winner of winners.rows) {
  if (!winner.winner_email) continue;

  const prizeText = winner.prize_label
    ? `You've won: ${winner.prize_label}`
    : `You've been selected as a winner!`;

  await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to: winner.winner_email,
    subject: `You won the ${hop.name} drawing!`,
    text: [
      `Congratulations!`,
      ``,
      `You've been selected as a winner in the ${hop.name} drawing.`,
      ``,
      prizeText,
      ``,
      `The organizer will be in touch with details. You can reach them at ${user.email}.`,
      ``,
      `Thanks for participating in ${hop.name}!`,
      ``,
      `Passportr`,
    ].join('\n'),
  });

  await db.query(
    'UPDATE drawing_winners SET notified_at = NOW() WHERE id = $1',
    [winner.id]
  );

  notified++;
}

return Response.json({ notified });
```

Remove the now-unused auth service fetch block entirely from the notify route.

---

## Task D — Update hop PUT route to handle drawing fields

Read `services/passportr/app/api/hops/[hopSlug]/route.js`.

**Change 1:** Add drawing fields to the destructured body:

Find:
```js
const { name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes } = await req.json();
```

Replace with:
```js
const { name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, rewards_enabled, drawing_enabled, drawing_winners_count, banner_url, logo_url } = await req.json();
```

**Change 2:** Add drawing fields to the UPDATE query. Find the UPDATE query and add three new COALESCE lines:

Find:
```js
      banner_url = COALESCE($10, banner_url),
      logo_url = COALESCE($11, logo_url)
  WHERE id = $12
  RETURNING *`,
  [name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, banner_url, logo_url, hop.id]
```

Replace with:
```js
      banner_url = COALESCE($10, banner_url),
      logo_url = COALESCE($11, logo_url),
      rewards_enabled = COALESCE($12, rewards_enabled),
      drawing_enabled = COALESCE($13, drawing_enabled),
      drawing_winners_count = COALESCE($14, drawing_winners_count)
  WHERE id = $15
  RETURNING *`,
  [name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, banner_url, logo_url, rewards_enabled, drawing_enabled, drawing_winners_count, hop.id]
```

---

## Task E — Drawing prizes API

Create `services/passportr/app/api/hops/[hopSlug]/drawing/prizes/route.js`:

```js
export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

export async function PUT(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;
    const { prizes } = await req.json();

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Replace all prizes for this hop
    await db.query('DELETE FROM drawing_prizes WHERE hop_id = $1', [hop.id]);

    for (let i = 0; i < prizes.length; i++) {
      await db.query(
        'INSERT INTO drawing_prizes (hop_id, label, sort_order) VALUES ($1, $2, $3)',
        [hop.id, prizes[i].label, i]
      );
    }

    const result = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );

    return Response.json({ prizes: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing prizes PUT error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Task F — Update manage hop page

Read `services/passportr/app/organize/[hopSlug]/page.jsx`.

**Change 1:** Add drawing state variables alongside existing state:

```js
const [drawing, setDrawing] = useState(null);
const [drawingLoading, setDrawingLoading] = useState(false);
const [notifying, setNotifying] = useState(false);
```

**Change 2:** In `loadAll`, add drawing fetch after the invitations fetch:

```js
const drawingRes = await fetch(`/api/hops/${hopSlug}/drawing`, { credentials: 'include' });
if (drawingRes.ok) {
  const d = await drawingRes.json();
  setDrawing(d);
}
```

**Change 3:** Add drawing fields to `hopForm` state initialization in `loadAll`:

Find:
```js
setHopForm({
  name: d.hop.name,
  description: d.hop.description || '',
  start_date: d.hop.start_date?.split('T')[0],
  end_date: d.hop.end_date?.split('T')[0],
  stamp_cutoff_date: d.hop.stamp_cutoff_date?.split('T')[0],
  redeem_cutoff_date: d.hop.redeem_cutoff_date?.split('T')[0],
  coupon_expiry_minutes: d.hop.coupon_expiry_minutes,
  status: d.hop.status,
});
```

Replace with:
```js
setHopForm({
  name: d.hop.name,
  description: d.hop.description || '',
  start_date: d.hop.start_date?.split('T')[0],
  end_date: d.hop.end_date?.split('T')[0],
  stamp_cutoff_date: d.hop.stamp_cutoff_date?.split('T')[0],
  redeem_cutoff_date: d.hop.redeem_cutoff_date?.split('T')[0],
  coupon_expiry_minutes: d.hop.coupon_expiry_minutes,
  status: d.hop.status,
  rewards_enabled: d.hop.rewards_enabled !== false,
  drawing_enabled: d.hop.drawing_enabled || false,
  drawing_winners_count: d.hop.drawing_winners_count || 1,
  prizes: [],
});
```

**Change 4:** Add draw winners and notify handlers alongside other handlers:

```js
async function runDrawing() {
  if (!confirm(`Draw ${hop.drawing_winners_count} winner(s) from ${drawing?.eligible_count || 0} eligible participants? This cannot be undone.`)) return;
  setDrawingLoading(true);
  try {
    const res = await fetch(`/api/hops/${hopSlug}/drawing`, {
      method: 'POST',
      credentials: 'include',
    });
    const d = await res.json();
    if (res.ok) {
      setDrawing(prev => ({ ...prev, winners: d.winners, drawn: true }));
    } else {
      alert(d.error || 'Failed to run drawing');
    }
  } catch { alert('Network error'); }
  setDrawingLoading(false);
}

async function notifyWinners() {
  setNotifying(true);
  try {
    const res = await fetch(`/api/hops/${hopSlug}/drawing/notify`, {
      method: 'POST',
      credentials: 'include',
    });
    const d = await res.json();
    if (res.ok) {
      alert(`${d.notified} winner email(s) sent.`);
      loadAll();
    } else {
      alert(d.error || 'Failed to send notifications');
    }
  } catch { alert('Network error'); }
  setNotifying(false);
}
```

**Change 5:** Add drawing fields to the edit hop form, after the status select and before the save buttons:

```jsx
<div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Rewards & Drawing</h3>
  <div style={{ marginBottom: '12px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="checkbox"
        checked={hopForm.rewards_enabled}
        onChange={e => setHopForm({ ...hopForm, rewards_enabled: e.target.checked })}
      />
      <span style={{ fontSize: '14px' }}>Venue rewards (participants redeem coupons at each venue)</span>
    </label>
  </div>
  <div style={{ marginBottom: '12px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="checkbox"
        checked={hopForm.drawing_enabled}
        onChange={e => setHopForm({ ...hopForm, drawing_enabled: e.target.checked })}
      />
      <span style={{ fontSize: '14px' }}>Prize drawing (completers entered in a drawing)</span>
    </label>
  </div>
  {hopForm.drawing_enabled && (
    <div style={{ marginLeft: '24px' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Number of winners
        </label>
        <input
          type="number"
          min="1"
          value={hopForm.drawing_winners_count}
          onChange={e => setHopForm({ ...hopForm, drawing_winners_count: parseInt(e.target.value) })}
          style={{ width: '80px' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          Prize labels <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(one per line, in order)</span>
        </label>
        <textarea
          rows="3"
          placeholder="1st Prize — $100 gift card&#10;2nd Prize — $50 gift card"
          value={(hopForm.prizes || []).map(p => p.label).join('\n')}
          onChange={e => setHopForm({
            ...hopForm,
            prizes: e.target.value.split('\n').filter(l => l.trim()).map((label, i) => ({ label: label.trim(), sort_order: i }))
          })}
        />
      </div>
    </div>
  )}
</div>
```

**Change 6:** Update `saveHop` to also save prizes when drawing is enabled. After the existing `saveHop` fetch succeeds, add:

```js
if (hopForm.drawing_enabled && hopForm.prizes?.length > 0) {
  await fetch(`/api/hops/${hopSlug}/drawing/prizes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ prizes: hopForm.prizes }),
  });
}
```

**Change 7:** Add drawing section at the bottom of the page, after the participants section. Only shown when `drawing_enabled` is true on the hop:

```jsx
{hop.drawing_enabled && drawing && (
  <div style={{ marginTop: '48px' }}>
    <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Drawing</h2>

    <div className="card">
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {drawing.eligible_count} completed participant{drawing.eligible_count !== 1 ? 's' : ''} eligible.
        {hop.drawing_winners_count} winner{hop.drawing_winners_count !== 1 ? 's' : ''} will be selected.
      </p>

      {!drawing.drawn ? (
        <div>
          {new Date() > new Date(hop.stamp_cutoff_date) ? (
            <button
              onClick={runDrawing}
              disabled={drawingLoading || drawing.eligible_count === 0}
            >
              {drawingLoading ? 'Drawing...' : 'Draw Winners'}
            </button>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Drawing available after stamp cutoff: {new Date(hop.stamp_cutoff_date).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Winners</h3>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
            {drawing.winners.map((w, i) => (
              <div
                key={w.id}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 12px', backgroundColor: '#E8F7F4', borderRadius: '8px' }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {w.user_id}
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {w.prize_label && <span style={{ fontWeight: '500' }}>{w.prize_label}</span>}
                  {w.notified_at
                    ? <span style={{ fontSize: '12px', color: 'var(--accent-teal)' }}>✓ Notified</span>
                    : <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Not notified</span>
                  }
                </div>
              </div>
            ))}
          </div>
          {drawing.winners.some(w => !w.notified_at) && (
            <button onClick={notifyWinners} disabled={notifying}>
              {notifying ? 'Sending...' : 'Send Winner Emails'}
            </button>
          )}
          {drawing.winners.every(w => w.notified_at) && (
            <p style={{ fontSize: '14px', color: 'var(--accent-teal)', fontWeight: '500' }}>
              All winners notified ✓
            </p>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

---

## Task G — Update passport page to show drawing status

Read `services/passportr/app/[userId]/[hopSlug]/page.jsx`.

**Change 1:** Add drawing winner query after the redemptions query:

```js
let isDrawingWinner = false;
if (hop.drawing_enabled) {
  const winnerResult = await db.query(
    `SELECT dw.*, dp.label as prize_label
     FROM drawing_winners dw
     LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
     WHERE dw.hop_id = $1 AND dw.participant_id = $2`,
    [hop.id, participant.id]
  );
  if (winnerResult.rows.length > 0) {
    isDrawingWinner = winnerResult.rows[0];
  }
}
```

**Change 2:** In the completed section, add drawing status after the existing rewards section. Add before the closing tag of the completed card:

```jsx
{hop.drawing_enabled && (
  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
    {isDrawingWinner ? (
      <div>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--accent-teal)' }}>
          🎉 You won the drawing!
        </h3>
        {isDrawingWinner.prize_label && (
          <p style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '500' }}>
            {isDrawingWinner.prize_label}
          </p>
        )}
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          The organizer will be in touch with details.
        </p>
      </div>
    ) : (
      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>🎟 Prize Drawing</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          You've been entered in the drawing. The organizer will announce winners after{' '}
          {new Date(hop.stamp_cutoff_date).toLocaleDateString()}.
        </p>
      </div>
    )}
  </div>
)}
```

**Change 3:** If `rewards_enabled` is false on the hop, hide the venue coupon redemption section entirely. Wrap the existing completed rewards section:

Find the opening of the venue rewards map in the completed card:
```jsx
{venues.filter(venue => stampedVenueIds.includes(venue.id)).map(venue => (
```

Wrap it:
```jsx
{hop.rewards_enabled !== false && venues.filter(venue => stampedVenueIds.includes(venue.id)).map(venue => (
```

---

## Verification Checklist

- [ ] `migrations/006_drawing.sql` exists with drawing tables and `participants.email` column
- [ ] Stamp route stores `user.email` in `participants.email`
- [ ] Hop PUT route accepts `rewards_enabled`, `drawing_enabled`, `drawing_winners_count`, `banner_url`, `logo_url`
- [ ] `api/hops/[hopSlug]/drawing/route.js` — GET returns drawing state, POST runs draw (once only, no repeat winners)
- [ ] `api/hops/[hopSlug]/drawing/notify/route.js` — POST sends emails to unnotified winners, marks `notified_at`
- [ ] `api/hops/[hopSlug]/drawing/prizes/route.js` — PUT replaces all prizes for hop
- [ ] Manage hop edit form has rewards/drawing toggles, winner count, prize labels
- [ ] Manage hop page has Drawing section showing eligible count, Draw Winners button (only after stamp cutoff), winner list with notification status
- [ ] Passport page shows drawing entry confirmation when completed and drawing enabled
- [ ] Passport page shows winner announcement when participant won
- [ ] Passport page hides venue coupon section when `rewards_enabled` is false
- [ ] No other files modified
