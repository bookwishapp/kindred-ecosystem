# Passportr — Marketing Landing Page

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

---

## Context

Read `docs/ARCHITECTURE.md` and `docs/CLAUDE.md` before starting.

The root `app/page.jsx` is currently a stub. Replace it entirely with the marketing landing page. The layout and globals.css are already correct — do not modify them.

Fonts already loaded: Poppins (300, 400, 500, 600) and Lora (400, italic). Use only these.

CSS variables already defined:
- `--bg-warm: #F0EDE6`
- `--accent-teal: #2AB8A0`
- `--text-primary: #1A1A1A`
- `--text-secondary: #6B6B6B`

---

## Task A — Update layout.jsx metadata

Read `services/passportr/app/layout.jsx`.

Replace the metadata block:

```js
export const metadata = {
  title: 'Passportr',
  description: 'Digital event passports',
  openGraph: {
    title: 'Passportr — Digital event passports',
    description: 'Replace paper passports with digital ones. No app required. Built for hops, crawls, and multi-venue events.',
    images: [
      {
        url: 'https://passportr.io/og.png',
        width: 1200,
        height: 630,
        alt: 'Passportr — Digital event passports',
      },
    ],
  },
}
```

Also add `font-display: swap` to the Google Fonts URL by appending `&display=swap` if not already present. No other changes to this file.

---

## Task B — Replace app/page.jsx

Read `services/passportr/app/page.jsx`. Replace entirely with:

```jsx
export default function Home() {
  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", background: '#F0EDE6', color: '#1A1A1A', maxWidth: '720px', margin: '0 auto' }}>

      {/* ── HERO ── */}
      <div style={{ padding: '80px 48px 72px' }}>
        <div style={{
          display: 'inline-block', fontSize: '12px', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#2AB8A0', border: '1.5px solid #2AB8A0',
          padding: '6px 16px', borderRadius: '20px', marginBottom: '36px'
        }}>
          passportr.io
        </div>

        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '20px', color: '#6B6B6B', marginBottom: '10px' }}>
          Hops. Crawls. Multi-stop events.
        </p>

        <h1 style={{ fontSize: '58px', fontWeight: '600', lineHeight: '1.05', marginBottom: '52px', letterSpacing: '-0.02em' }}>
          Paper passports<br />are <span style={{ color: '#2AB8A0' }}>a lot of work.</span>
        </h1>

        <div style={{ borderLeft: '4px solid #2AB8A0', paddingLeft: '28px', marginBottom: '52px' }}>
          <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '2', color: '#3A3A3A', marginBottom: '14px' }}>
            Printing. Cutting. Distributing.<br />Hoping nobody loses theirs.
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '2', color: '#6B6B6B', fontStyle: 'italic', marginBottom: '14px' }}>
            There's a simpler way.
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '2', color: '#3A3A3A', marginBottom: '14px' }}>
            Passportr turns any multi-venue event into a digital passport.<br />
            No apps. No paper. No friction.
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: '18px', lineHeight: '2', color: '#3A3A3A' }}>
            Participants scan a QR code with their phone.{' '}
            <em style={{ color: '#1A1A1A' }}>That's it.</em><br />
            Each stop checks itself in. Progress tracks automatically.<br />
            Completion just… happens.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <a href="/organize/signup" style={{
            background: '#2AB8A0', color: 'white', padding: '18px 40px',
            borderRadius: '6px', fontSize: '15px', fontWeight: '500',
            textDecoration: 'none', letterSpacing: '0.04em'
          }}>
            Get Started
          </a>
          <a href="#how-it-works" style={{
            fontSize: '15px', color: '#6B6B6B', fontFamily: "'Lora', serif",
            fontStyle: 'italic', textDecoration: 'none',
            borderBottom: '1px solid #c8c5bd', paddingBottom: '2px'
          }}>
            See how it works
          </a>
        </div>
      </div>

      <div style={{ height: '0.5px', background: '#c8c5bd', margin: '0 48px' }} />

      {/* ── HOW IT WORKS ── */}
      <div id="how-it-works" style={{ padding: '72px 48px' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>
          How it works
        </p>
        <h2 style={{ fontSize: '42px', fontWeight: '600', lineHeight: '1.15', marginBottom: '52px', letterSpacing: '-0.01em' }}>
          Three things.<br />That's the whole list.
        </h2>

        {[
          {
            n: '01',
            title: 'You set it up',
            body: <>Create your hop, add venues, set the rules. Invite venues by email — they set up their own details and get their QR codes instantly. <em style={{ color: '#3A3A3A' }}>Done in minutes.</em></>
          },
          {
            n: '02',
            title: 'They show up and scan',
            body: <>Participants use their phone camera. No download. No account setup. <em style={{ color: '#3A3A3A' }}>Just scan and go.</em> Their passport builds itself as they move through the event.</>
          },
          {
            n: '03',
            title: 'Rewards take care of themselves',
            body: <>When someone completes the hop, their reward is ready. No punch cards. No manual tracking. No counting stamps. <em style={{ color: '#3A3A3A' }}>It works the way these events already do.</em> Just without the paper.</>
          },
        ].map((step, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr',
            padding: '36px 0',
            borderBottom: i < 2 ? '0.5px solid #c8c5bd' : 'none',
            alignItems: 'start'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '600', color: '#2AB8A0', lineHeight: '1', letterSpacing: '-0.03em', opacity: '0.6' }}>
              {step.n}
            </div>
            <div style={{ paddingTop: '4px' }}>
              <p style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>{step.title}</p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '16px', color: '#6B6B6B', lineHeight: '1.8' }}>{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── VENUE INVITATIONS ── */}
      <div style={{ padding: '64px 48px', background: '#F7F4EE', borderTop: '0.5px solid #c8c5bd', borderBottom: '0.5px solid #c8c5bd' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>
          Venues
        </p>
        <h2 style={{ fontSize: '36px', fontWeight: '600', lineHeight: '1.2', marginBottom: '20px', letterSpacing: '-0.01em' }}>
          Invite venues by email.<br />Re-invite them next year<br />with one click.
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '17px', color: '#6B6B6B', lineHeight: '1.85', maxWidth: '520px' }}>
          Each venue gets a private link to set up their own details — name, address, store hours, reward description. They download their own QR codes. You don't have to chase anyone down.
        </p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '17px', color: '#6B6B6B', lineHeight: '1.85', maxWidth: '520px', marginTop: '16px' }}>
          When you run the hop again next year, import all your previous venues and send new invitations in one step.
        </p>
      </div>

      {/* ── WHAT YOU CAN SEE ── */}
      <div style={{ padding: '72px 48px', background: '#1A1A1A', color: '#F0EDE6' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>
          What you can see
        </p>
        <h2 style={{ fontSize: '42px', fontWeight: '600', lineHeight: '1.15', marginBottom: '44px', letterSpacing: '-0.01em', color: '#F0EDE6' }}>
          You can see what's<br />happening as it happens.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#2e2e2e', border: '1px solid #2e2e2e', borderRadius: '14px', overflow: 'hidden' }}>
          {[
            { title: 'Who's participating', body: 'Real-time count. See who joined and when.' },
            { title: 'Which stops they visit', body: 'Stamp activity across every venue, live.' },
            { title: 'When they finish', body: 'Completion detected automatically. No guessing.' },
            { title: 'Prize drawings', body: 'Optional. Draw winners from completers after the hop ends.' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#242424', padding: '32px 28px' }}>
              <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '10px', color: '#F0EDE6' }}>{item.title}</p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '15px', color: '#888', lineHeight: '1.75' }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PARTICIPANT NOTIFICATIONS ── */}
      <div style={{ padding: '64px 48px', borderBottom: '0.5px solid #c8c5bd' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>
          Your audience
        </p>
        <h2 style={{ fontSize: '36px', fontWeight: '600', lineHeight: '1.2', marginBottom: '20px', letterSpacing: '-0.01em' }}>
          Participants opt in once.<br />You reach them again<br />next time.
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '17px', color: '#6B6B6B', lineHeight: '1.85', maxWidth: '520px' }}>
          After their first stamp, participants can opt in to hear about future hops near them. They enter their zip code. That's all.
        </p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: '17px', color: '#6B6B6B', lineHeight: '1.85', maxWidth: '520px', marginTop: '16px' }}>
          When your next event launches, you have a ready audience — people who already know what a hop is and showed up for the last one.
        </p>
      </div>

      {/* ── PRICING ── */}
      <div style={{ padding: '72px 48px' }}>
        <p style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>
          Pricing
        </p>
        <h2 style={{ fontSize: '42px', fontWeight: '600', lineHeight: '1.15', marginBottom: '12px', letterSpacing: '-0.01em' }}>
          Fair prices.<br />No surprises.
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: '#6B6B6B', marginBottom: '44px', lineHeight: '1.6' }}>
          Two tiers based on venue count.<br />Pay by how often you run events.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {[
            {
              tag: 'Tier 1', name: 'Up to 10 venues', venues: 'per hop', featured: false,
              rows: [
                { label: 'Single hop', price: '$49', unit: 'one-time' },
                { label: 'Occasional (3/yr)', price: '$79', unit: '/year' },
                { label: 'Regular (12/yr)', price: '$129', unit: '/year' },
                { label: 'Unlimited', price: '$179', unit: '/year' },
              ]
            },
            {
              tag: 'Tier 2', name: 'Unlimited venues', venues: 'per hop', featured: true,
              rows: [
                { label: 'Single hop', price: '$79', unit: 'one-time' },
                { label: 'Occasional (3/yr)', price: '$129', unit: '/year' },
                { label: 'Regular (12/yr)', price: '$189', unit: '/year' },
                { label: 'Unlimited', price: '$249', unit: '/year' },
              ]
            },
          ].map((plan, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '14px', padding: '36px 32px',
              border: plan.featured ? '2px solid #2AB8A0' : '1px solid #d4d0c8'
            }}>
              <p style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2AB8A0', marginBottom: '10px', fontWeight: '500' }}>{plan.tag}</p>
              <p style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>{plan.name}</p>
              <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '14px', color: '#6B6B6B', marginBottom: '28px' }}>{plan.venues}</p>
              <div style={{ borderTop: '0.5px solid #e8e5de', paddingTop: '20px' }}>
                {plan.rows.map((row, j) => (
                  <div key={j} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '10px 0',
                    borderBottom: j < plan.rows.length - 1 ? '0.5px solid #f0ede6' : 'none'
                  }}>
                    <span style={{ fontSize: '14px', color: '#6B6B6B' }}>{row.label}</span>
                    <span style={{ fontSize: '16px', fontWeight: '500' }}>
                      {row.price} <span style={{ fontSize: '12px', fontWeight: '400', color: '#9A9A9A' }}>{row.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#E8F7F4', borderRadius: '12px', padding: '28px 32px', border: '1px solid #b8e8e0' }}>
          <p style={{ fontSize: '17px', fontWeight: '600', color: '#0F6E56', marginBottom: '8px' }}>
            Downtown associations, main street programs, community organizations
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: '15px', color: '#1D9E75', lineHeight: '1.75' }}>
            Running hops for your district or membership? Passportr is built for exactly this. Tier 2 gives you unlimited venues per hop — room for every storefront on the block.
          </p>
        </div>
      </div>

      {/* ── CLOSE ── */}
      <div style={{ padding: '96px 48px', textAlign: 'center', borderTop: '0.5px solid #c8c5bd' }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: '42px', fontWeight: '400', fontStyle: 'italic', lineHeight: '1.35', marginBottom: '16px' }}>
          "It works the way these<br />events already do."
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', color: '#6B6B6B', marginBottom: '44px' }}>
          Just without the paper.
        </p>
        <a href="/organize/signup" style={{
          display: 'inline-block', background: '#2AB8A0', color: 'white',
          padding: '20px 56px', borderRadius: '6px', fontSize: '16px',
          fontWeight: '500', textDecoration: 'none', letterSpacing: '0.04em'
        }}>
          Get Started →
        </a>
      </div>

    </div>
  )
}
```

---

## Verification Checklist

- [ ] `app/page.jsx` replaced entirely — stub is gone
- [ ] `app/layout.jsx` metadata updated with description and OG block
- [ ] Page renders correctly at `passportr.io/`
- [ ] "Get Started" links to `/organize/signup`
- [ ] "See how it works" anchor-links to `#how-it-works` section
- [ ] Fonts load correctly (Poppins and Lora)
- [ ] No changes to `globals.css`
- [ ] No other files modified
