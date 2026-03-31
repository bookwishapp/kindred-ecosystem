# Passportr — Monetization: Prompt 4 of 7
# Hop and Venue Creation Gates + Paywall UI

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Prerequisite

Prompts 1, 2, and 3 must be fully deployed before this prompt runs.

---

## Task A — Gate Hop Creation

Read `services/passportr/app/api/hops/route.js`.

In the POST handler, after `const user = await requireOrganizer(req)`, add hop limit enforcement:

```js
const profile = user.organizerProfile;

// Enforce hop limits
const hopLimit = profile.plan === 'single' ? 1
  : profile.plan === 'occasional' ? 3
  : profile.plan === 'regular' ? 12
  : null; // unlimited

if (hopLimit !== null && profile.hops_used_this_period >= hopLimit) {
  return Response.json({
    error: 'Hop limit reached',
    code: 'HOP_LIMIT_REACHED',
    plan: profile.plan,
    tier: profile.tier,
    hops_used: profile.hops_used_this_period,
    hop_limit: hopLimit,
  }, { status: 403 });
}
```

After successfully inserting the hop, increment `hops_used_this_period`:

```js
await db.query(
  'UPDATE organizer_profiles SET hops_used_this_period = hops_used_this_period + 1 WHERE user_id = $1',
  [user.sub]
);
```

---

## Task B — Gate Venue Invitation

Read `services/passportr/app/api/hops/[hopSlug]/invitations/route.js`.

In the POST handler, after verifying hop ownership, add venue limit enforcement before inserting the invitation:

```js
const profile = user.organizerProfile;

// Tier 1: max 10 venues per hop
if (profile.tier === 1) {
  const venueCount = await db.query(
    'SELECT COUNT(*) as count FROM venues WHERE hop_id = $1',
    [hop.id]
  );
  if (parseInt(venueCount.rows[0].count) >= 10) {
    return Response.json({
      error: 'Venue limit reached for your plan',
      code: 'VENUE_LIMIT_REACHED',
      tier: profile.tier,
    }, { status: 403 });
  }
}
```

---

## Task C — Gate Venue Setup (Stranded Invitation)

Read `services/passportr/app/api/venue/setup/route.js`.

After verifying the invitation is valid, check if the hop is at its venue limit before creating the venue record. If at limit, send the organizer a notification email and return a friendly error.

Add after the invitation lookup:

```js
// Check venue limit for this hop's organizer
const hopOrgResult = await db.query(
  `SELECT op.*, h.name as hop_name
   FROM organizer_profiles op
   JOIN hops h ON h.organizer_user_id = op.user_id
   WHERE h.id = $1`,
  [invitation.hop_id]
);
const orgProfile = hopOrgResult.rows[0];

if (orgProfile && orgProfile.tier === 1) {
  const venueCount = await db.query(
    'SELECT COUNT(*) as count FROM venues WHERE hop_id = $1',
    [invitation.hop_id]
  );
  if (parseInt(venueCount.rows[0].count) >= 10) {
    // Notify organizer
    try {
      const transporter = require('nodemailer').createTransport({
        host: process.env.SES_SMTP_HOST,
        port: parseInt(process.env.SES_SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SES_SMTP_USERNAME,
          pass: process.env.SES_SMTP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: process.env.SES_FROM_EMAIL,
        to: orgProfile.email,
        subject: `Action needed: ${invitation.venue_name} couldn't complete setup for ${orgProfile.hop_name}`,
        text: `Hi ${orgProfile.name},\n\n${invitation.venue_name} tried to complete their venue setup for "${orgProfile.hop_name}" but your hop has reached its 10-venue limit for Tier 1.\n\nTo make room, remove a venue from your hop, or upgrade to Tier 2 to allow 11+ venues.\n\nManage your hop: ${process.env.NEXT_PUBLIC_BASE_URL}/organize/${invitation.hop_slug}\nUpgrade your plan: ${process.env.NEXT_PUBLIC_BASE_URL}/organize/billing\n\nPassportr`,
      });
    } catch (emailErr) {
      console.error('Failed to send venue limit notification:', emailErr);
    }

    return Response.json({
      error: 'venue_limit_reached',
      message: 'This hop is currently full. The organizer has been notified and may be able to make room for you.',
    }, { status: 403 });
  }
}
```

---

## Task D — Paywall UI on Organize Dashboard

Read `services/passportr/app/organize/page.jsx`.

**Change 1:** Add a `PaywallModal` component that shows when hop limit is reached. Add this component definition before the main `OrganizeDashboard` export:

```jsx
function PaywallModal({ profile, onClose }) {
  const [loading, setLoading] = useState(false);

  async function selectPlan(priceKey) {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ price_key: priceKey }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
    } catch { setLoading(false); }
  }

  const creditAmount = profile?.plan === 'single' && !profile?.single_hop_credited
    ? (profile.tier === 1 ? 49 : 79)
    : null;

  const upgradePlans = profile?.plan === 'single' ? [
    { key: `tier${profile.tier}_occasional`, name: 'Occasional', price: profile.tier === 1 ? 79 : 129, hops: 'Up to 3 hops/year' },
    { key: `tier${profile.tier}_regular`,    name: 'Regular',    price: profile.tier === 1 ? 129 : 189, hops: 'Up to 12 hops/year' },
    { key: `tier${profile.tier}_unlimited`,  name: 'Unlimited',  price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ] : profile?.plan === 'occasional' ? [
    { key: `tier${profile.tier}_regular`,   name: 'Regular',   price: profile.tier === 1 ? 129 : 189, hops: 'Up to 12 hops/year' },
    { key: `tier${profile.tier}_unlimited`, name: 'Unlimited', price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ] : [
    { key: `tier${profile.tier}_unlimited`, name: 'Unlimited', price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Hop Limit Reached</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          You've used all {profile?.plan === 'single' ? '1' : profile?.plan === 'occasional' ? '3' : '12'} hop{profile?.plan !== 'single' ? 's' : ''} included in your current plan. Upgrade to create more hops.
        </p>

        {creditAmount && (
          <div style={{ backgroundColor: '#E8F7F4', borderRadius: '8px', padding: '12px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--accent-teal)', fontSize: '14px', fontWeight: '500' }}>
              Your ${creditAmount} single hop credit will be applied automatically.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {upgradePlans.map(plan => (
            <div key={plan.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #eee', borderRadius: '8px' }}>
              <div>
                <p style={{ fontWeight: '500', marginBottom: '2px' }}>{plan.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{plan.hops}</p>
                {creditAmount && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-teal)' }}>
                    After credit: ${plan.price - creditAmount}/first year
                  </p>
                )}
              </div>
              <button
                onClick={() => selectPlan(plan.key)}
                disabled={loading}
                style={{ fontSize: '14px', padding: '8px 20px' }}
              >
                ${plan.price}/yr
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', backgroundColor: 'var(--text-secondary)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**Change 2:** Add paywall state to the dashboard:

```js
const [showPaywall, setShowPaywall] = useState(false);
const [organizerProfile, setOrganizerProfile] = useState(null);
```

**Change 3:** Fetch organizer profile on load. In `fetchHops`, after setting hops state add:

```js
// Fetch organizer profile for paywall
const profileRes = await fetch('/api/organizer/profile', { credentials: 'include' });
if (profileRes.ok) {
  const pd = await profileRes.json();
  setOrganizerProfile(pd.profile);
}
```

**Change 4:** Update `createHop` to handle the hop limit response. Find the error handling in `createHop`:

```js
} else {
  alert('Failed to create hop');
}
```

Replace with:

```js
} else {
  const errData = await response.json();
  if (errData.code === 'HOP_LIMIT_REACHED') {
    setShowPaywall(true);
  } else {
    alert('Failed to create hop');
  }
}
```

**Change 5:** Add the paywall modal to the JSX. Add before the closing container `</div>`:

```jsx
{showPaywall && (
  <PaywallModal
    profile={organizerProfile}
    onClose={() => setShowPaywall(false)}
  />
)}
```

---

## Task E — Venue Setup Page: Show Friendly Error for Full Hop

Read `services/passportr/app/venue/setup/[token]/page.jsx`.

Update `handleSubmit` to handle the venue limit response specifically:

Find:
```js
if (!res.ok) { setError(data.error || 'Failed to create venue'); setSubmitting(false); return; }
```

Replace with:
```js
if (!res.ok) {
  if (data.error === 'venue_limit_reached') {
    setError(data.message);
  } else {
    setError(data.error || 'Failed to create venue');
  }
  setSubmitting(false);
  return;
}
```

---

## Verification Checklist

- [ ] Hop creation blocked when at plan limit, returns `HOP_LIMIT_REACHED` code
- [ ] `hops_used_this_period` incremented on successful hop creation
- [ ] Venue invitation blocked when at 10 venues on Tier 1
- [ ] Stranded venue setup returns friendly message, sends organizer notification email
- [ ] Organize dashboard shows paywall modal on hop limit, with correct upgrade options and credit display
- [ ] Venue setup page shows human-readable message when hop is full
- [ ] No other files modified
