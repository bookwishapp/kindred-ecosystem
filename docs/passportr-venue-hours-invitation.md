# Passportr — Venue Hours + Invitation Email

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No TODOs, no placeholders. Everything must work.

## Dependency Order

Task A (migration) must run before any other task deploys.
Tasks B through I can run in parallel after A.

---

## Task A — Migration: Add hours to venues

Read all existing files in `services/passportr/migrations/` to confirm the next migration number.

Create `services/passportr/migrations/004_venue_hours.sql`:

```sql
ALTER TABLE venues ADD COLUMN IF NOT EXISTS hours TEXT;
```

Run via `migrate.js` on deploy. It will execute automatically as part of `node migrate.js && next build && next start`.

---

## Task B — Venue setup page: Add hours field

Read `services/passportr/app/venue/setup/[token]/page.jsx`.

**Change 1:** Add `hours` to the initial form state:

Find:
```js
const [form, setForm] = useState({ name: '', address: '', description: '', reward_description: '' });
```

Replace with:
```js
const [form, setForm] = useState({ name: '', address: '', description: '', reward_description: '', hours: '' });
```

**Change 2:** Add hours input to the form, after the reward_description field and before the submit button:

```jsx
<div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
    Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
  </label>
  <input
    type="text"
    value={form.hours}
    onChange={e => setForm({ ...form, hours: e.target.value })}
    placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm"
  />
</div>
```

---

## Task C — Venue setup POST route: Include hours

Read `services/passportr/app/api/venue/setup/route.js`.

**Change 1:** Add `hours` to the destructured body:

Find:
```js
const { token, name, address, description, reward_description } = await req.json();
```

Replace with:
```js
const { token, name, address, description, reward_description, hours } = await req.json();
```

**Change 2:** Add `hours` to the INSERT:

Find:
```js
await db.query(
  `INSERT INTO venues (hop_id, name, address, description, reward_description, stamp_token, redeem_token, required, sort_order)
   VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)`,
  [invitation.hop_id, name, address, description, reward_description, stampToken, redeemToken, sortOrder]
);
```

Replace with:
```js
await db.query(
  `INSERT INTO venues (hop_id, name, address, description, reward_description, hours, stamp_token, redeem_token, required, sort_order)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)`,
  [invitation.hop_id, name, address, description, reward_description, hours, stampToken, redeemToken, sortOrder]
);
```

---

## Task D — Venue self-service page: Add hours to edit form and display

Read `services/passportr/app/venue/[token]/page.jsx`.

**Change 1:** Add `hours` to the form state initialization in `loadVenue`:

Find:
```js
setForm({
  name: data.venue.name,
  address: data.venue.address || '',
  description: data.venue.description || '',
  reward_description: data.venue.reward_description || '',
});
```

Replace with:
```js
setForm({
  name: data.venue.name,
  address: data.venue.address || '',
  description: data.venue.description || '',
  reward_description: data.venue.reward_description || '',
  hours: data.venue.hours || '',
});
```

**Change 2:** Add hours input to the edit form, after reward_description and before the error/button row:

```jsx
<div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
    Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
  </label>
  <input
    type="text"
    value={form.hours}
    onChange={e => setForm({ ...form, hours: e.target.value })}
    placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm"
  />
</div>
```

**Change 3:** Add hours to the read-only display view, after reward_description:

```jsx
{venue.hours && <div><strong>Hours:</strong> {venue.hours}</div>}
```

---

## Task E — Venue PUT route: Include hours in update

Read `services/passportr/app/api/hops/[hopSlug]/venues/[venueId]/route.js`.

**Change 1:** Add `hours` to the destructured body in the PUT handler:

Find:
```js
const { name, address, description, reward_description, required, sort_order, logo_url } = await req.json();
```

Replace with:
```js
const { name, address, description, reward_description, hours, required, sort_order, logo_url } = await req.json();
```

**Change 2:** Add `hours` to the UPDATE query:

Find:
```js
const result = await db.query(
  `UPDATE venues
   SET name = COALESCE($1, name),
       address = COALESCE($2, address),
       description = COALESCE($3, description),
       reward_description = COALESCE($4, reward_description),
       required = COALESCE($5, required),
       sort_order = COALESCE($6, sort_order),
       logo_url = COALESCE($7, logo_url)
   WHERE id = $8
   RETURNING *`,
  [name, address, description, reward_description, required, sort_order, logo_url, venueId]
);
```

Replace with:
```js
const result = await db.query(
  `UPDATE venues
   SET name = COALESCE($1, name),
       address = COALESCE($2, address),
       description = COALESCE($3, description),
       reward_description = COALESCE($4, reward_description),
       hours = COALESCE($5, hours),
       required = COALESCE($6, required),
       sort_order = COALESCE($7, sort_order),
       logo_url = COALESCE($8, logo_url)
   WHERE id = $9
   RETURNING *`,
  [name, address, description, reward_description, hours, required, sort_order, logo_url, venueId]
);
```

---

## Task F — Manage hop page: Add hours to add and edit forms

Read `services/passportr/app/organize/[hopSlug]/page.jsx`.

**Change 1:** Add hours input to the Add Venue form, after reward_description and before the required checkbox:

```jsx
<div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
    Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
  </label>
  <input type="text" name="hours" placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm" />
</div>
```

**Change 2:** Include `hours` in the `addVenue` fetch body:

Find:
```js
body: JSON.stringify({
  name: fd.get('name'),
  address: fd.get('address'),
  description: fd.get('description'),
  reward_description: fd.get('reward_description'),
  required: fd.get('required') === 'on',
  sort_order: venues.length,
}),
```

Replace with:
```js
body: JSON.stringify({
  name: fd.get('name'),
  address: fd.get('address'),
  description: fd.get('description'),
  reward_description: fd.get('reward_description'),
  hours: fd.get('hours'),
  required: fd.get('required') === 'on',
  sort_order: venues.length,
}),
```

**Change 3:** Add `hours` to the inline venue edit form state initialization:

Find:
```js
setVenueForm({
  name: venue.name,
  address: venue.address,
  description: venue.description,
  reward_description: venue.reward_description,
});
```

Replace with:
```js
setVenueForm({
  name: venue.name,
  address: venue.address,
  description: venue.description,
  reward_description: venue.reward_description,
  hours: venue.hours || '',
});
```

**Change 4:** Add hours input to the inline venue edit form, after reward_description and before the save/cancel buttons:

```jsx
<div style={{ marginBottom: '12px' }}>
  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
    Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
  </label>
  <input
    type="text"
    value={venueForm.hours || ''}
    onChange={e => setVenueForm({ ...venueForm, hours: e.target.value })}
    placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm"
  />
</div>
```

---

## Task G — Venues POST route: Include hours

Read `services/passportr/app/api/hops/[hopSlug]/venues/route.js`.

**Change 1:** Add `hours` to the destructured body in the POST handler:

Find:
```js
const { name, address, description, reward_description, required, sort_order } = await req.json();
```

Replace with:
```js
const { name, address, description, reward_description, hours, required, sort_order } = await req.json();
```

**Change 2:** Add `hours` to the INSERT:

Find:
```js
const result = await db.query(
  `INSERT INTO venues (hop_id, name, address, description, reward_description, stamp_token, redeem_token, required, sort_order)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *`,
  [hop.id, name, address, description, reward_description, stampToken, redeemToken, required !== false, sort_order || 0]
);
```

Replace with:
```js
const result = await db.query(
  `INSERT INTO venues (hop_id, name, address, description, reward_description, hours, stamp_token, redeem_token, required, sort_order)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *`,
  [hop.id, name, address, description, reward_description, hours, stampToken, redeemToken, required !== false, sort_order || 0]
);
```

---

## Task H — Hop landing page and passport page: Display hours

**H1:** Read `services/passportr/app/hop/[hopSlug]/page.jsx`.

In the venue list, add hours display after the address line:

Find:
```jsx
{venue.address && (
  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
    {venue.address}
  </p>
)}
```

Replace with:
```jsx
{venue.address && (
  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
    {venue.address}
  </p>
)}
{venue.hours && (
  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
    🕐 {venue.hours}
  </p>
)}
```

**H2:** Read `services/passportr/app/[userId]/[hopSlug]/page.jsx`.

In the venue list, add hours display after the address line using the same pattern as H1.

---

## Task I — Invitation email: Add hop details and hours

Read `services/passportr/app/api/hops/[hopSlug]/invitations/route.js`.

**Change 1:** Add a `getCompletionText` helper function before the POST export:

```js
function getCompletionText(rule) {
  if (!rule) return 'Visit all participating venues';
  if (rule.type === 'all') return 'Visit all participating venues';
  if (rule.type === 'percentage') return `Visit ${rule.percent}% of participating venues`;
  if (rule.type === 'minimum') return `Visit at least ${rule.count} participating venues`;
  if (rule.type === 'required_plus') return `Visit all required venues plus at least ${rule.minimum_optional || 0} optional venues`;
  return 'Visit all participating venues';
}
```

**Change 2:** Replace the email text body with a version that includes full hop details. Find the `sendMail` call and replace only the `text` field value:

Find:
```js
text: `Hi,\n\nYou've been invited to participate in "${hop.name}" on Passportr as a venue.\n\nVenue name: ${venue_name}\n\nClick the link below to set up your venue:\n${setupUrl}\n\nThis link is unique to your venue — don't share it.\n\nPassportr`,
```

Replace with:
```js
text: [
  `Hi,`,
  ``,
  `You've been invited to participate in "${hop.name}" on Passportr as a venue.`,
  ``,
  `Venue name: ${venue_name}`,
  ``,
  `── Hop Details ──────────────────────`,
  `Event dates: ${new Date(hop.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(hop.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  `Stamp cutoff: ${new Date(hop.stamp_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  `Reward redemption deadline: ${new Date(hop.redeem_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
  `Completion requirement: ${getCompletionText(hop.completion_rule)}`,
  `Coupon expiry: ${hop.coupon_expiry_minutes} minutes after scanning`,
  `────────────────────────────────────`,
  ``,
  `Click the link below to set up your venue:`,
  `${setupUrl}`,
  ``,
  `This link is unique to your venue — don't share it.`,
  ``,
  `Passportr`,
].join('\n'),
```

---

## Verification Checklist

- [ ] `migrations/004_venue_hours.sql` exists
- [ ] `hours` column present in venues table after migration runs
- [ ] Venue setup page includes hours field
- [ ] Venue setup POST includes hours in INSERT
- [ ] Venue self-service page shows and edits hours
- [ ] Venue PUT route includes hours in COALESCE update
- [ ] Manage hop page add form includes hours
- [ ] Manage hop page inline edit form includes hours
- [ ] Venues POST route includes hours in INSERT
- [ ] Hop landing page displays hours when present
- [ ] Passport page displays hours when present
- [ ] Invitation email includes all hop dates, completion requirement, coupon expiry
- [ ] No other files modified
