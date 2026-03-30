# Passportr — V2 Roadmap

## What V1 Delivers

V1 is a web-only proof of concept built for the Kitsap Peninsula Book Hop (April 26, 2026). It proves the core mechanic — QR stamp collection, completion detection, timed coupon redemption — with a single organizer (Terry) and a single hop type (all/percentage completion).

---

## V2 Goals

V2 turns Passportr into a product anyone can use to organize a hop. It adds self-serve organizer onboarding, a Flutter app for participants and venues, map-based hop discovery, and proper monetization.

---

## Auth & Roles

**V1:** Organizer access gated by `ORGANIZER_EMAILS` env var.

**V2:**
- Proper organizer role in the database: `users.role = 'organizer'`
- Self-serve organizer signup: any authenticated user can apply to become an organizer
- Organizer approval flow (manual for now — Terry approves via admin)
- Venue accounts: venues can log in to manage their own participation, update reward descriptions, view redemption stats
- Surface organizer/venue roles in the central auth service so other ecosystem apps can respect them

---

## Completion Rules

**V1:** All venues, percentage, minimum count, required+optional.

**V2:**
- **Tiered completion:** Bronze/Silver/Gold tiers with different rewards at each threshold
- **Category-based:** "Visit at least 2 bookstores AND 1 coffee shop"
- **Time-based:** Bonus stamps for visiting during specific hours ("happy hour stamp")
- **Sequential:** Must visit venues in a specific order (scavenger hunt mode)

---

## Redemption

**V1:** Single coupon per venue, 30-minute expiry, shown on screen.

**V2:**
- Organizer sets expiry duration per hop (15 min, 30 min, 1 hour, end of day)
- Venue staff redemption confirmation: venue scans participant's completion QR to mark redeemed (eliminates screenshot fraud)
- Digital prize fulfillment: coupon codes for online stores, emailed gift cards
- Grand prize drawing: all completions entered into a drawing, winner selected by organizer

---

## Organizer Dashboard

**V1:** Create hop, add venues, download QR codes, view basic stats.

**V2:**
- Real-time participant map showing where people are in the hop
- Venue-by-venue heat map (which stops are most/least visited)
- Export participant list with email addresses (for post-hop marketing)
- Duplicate a hop (run the same event next year with one click)
- Co-organizer support: invite another user to co-manage a hop
- Scheduled publish: set a hop to go live at a specific date/time
- Waitlist: cap participant count, collect waitlist emails

---

## Venue Experience

**V1:** Static venue page with two QR codes to print.

**V2:**
- Venue app (Flutter): see real-time visitor count, scan redemption codes, manage their own reward description
- Digital QR display: venues without a printer can show QR code on a tablet/phone
- Venue analytics: how many people visited, what time of day, completion rate of visitors
- Multi-hop venues: one venue participating in multiple hops simultaneously

---

## Participant Experience

**V1:** Web passport, email authentication, stamp + redeem in browser.

**V2 — Flutter app:**
- Passport history: all hops, all stamps, across all time
- Hop discovery: browse upcoming hops nearby (map view)
- Push notifications: "The hop starts tomorrow", "You're 1 stamp away from completing"
- Offline passport: cached locally so it works without signal
- Social: share your completed passport, see friends' progress
- If user has Kindred account: unified identity, username shared across apps

**V2 — Web improvements:**
- Animated stamp collection (satisfying visual feedback)
- Passport sharing: generate a shareable image of completed passport
- Leaderboard (opt-in): see top completers for a hop

---

## Monetization

**V1:** None (internal use only).

**V2:**
- **Per-hop fee:** Organizer pays a flat fee to create a hop (e.g., $49 for up to 10 venues, $99 for unlimited)
- **Per-venue fee:** Venues pay to participate (organizer sets the price, Passportr takes a cut)
- **Participant premium:** Optional paid tier for participants — early access to hops, exclusive rewards, no ads
- **White label:** Organizations (downtown associations, tourism boards) pay for branded hop experiences
- RevenueCat for in-app purchases if Flutter app adds premium features

---

## Ecosystem Integration

**V1:** Shares central auth. Participant email creates an ecosystem account.

**V2:**
- **BookWish integration:** Completing a bookstore hop surfaces a "Add to your BookWish list" prompt
- **Kindred integration:** Venues and fellow hoppers can be added to your Kin
- **terryheath.com/admin:** Passportr hop stats visible in the central admin (Terry's hops only)
- **Hop discovery in Kindred:** Nearby hops surfaced quietly in the Kindred app for relevant users
- **AnalogList integration:** Completing a record store hop prompts wishlist additions

---

## Technical Debt to Address in V2

- Extract API routes from Next.js into a dedicated `services/passportr-api` (Node/Express) when traffic warrants it
- Add rate limiting on stamp endpoint (prevent rapid-fire scanning)
- Add webhook support so organizers can integrate with their own systems
- Proper organizer role in auth service (not env var)
- Admin interface folded into terryheath.com/admin for Terry's own hops
- CDN for QR code images (currently generated on-demand)
- Analytics: proper event tracking for organizer insights

---

## App Architecture (when ready)

```
apps/
  passportr/    → Flutter app (participant + venue + organizer)
```

Shares:
- `packages/ui_kit` — Cupertino components, warm off-white, teal accent
- `packages/core` — ApiClient, SecureStorage, DateUtils
- Central auth at auth.terryheath.com

Separate from Kindred but same visual language and auth identity.

---

## Naming / Branding Notes

- Domain: passportr.io
- The product name is Passportr (no e)
- Tagline candidates: "Your hop, your stamp." / "Every stop, remembered."
- The paper passport is the emotional reference — digital should feel like an upgrade, not a replacement
- Stamps should feel satisfying. Completion should feel earned.
