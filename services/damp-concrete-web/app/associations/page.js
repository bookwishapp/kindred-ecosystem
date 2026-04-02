import Image from 'next/image';

export const metadata = {
  title: 'Associations — See what connects.',
  description: 'A writing notebook that isn\'t linear. It connects the dots. Not organizes them.',
  metadataBase: new URL('https://associations.dampconcrete.com'),
  alternates: { canonical: 'https://associations.dampconcrete.com' },
  openGraph: {
    title: 'Associations — See what connects.',
    description: 'A writing notebook that isn\'t linear. It connects the dots. Not organizes them.',
    url: 'https://associations.dampconcrete.com',
    siteName: 'Associations',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Associations — See what connects.',
    description: 'A writing notebook that isn\'t linear. It connects the dots. Not organizes them.',
  },
};

export default async function AssociationsPage() {
  // Fetch current version from S3
  let downloadUrl = 'https://associations-releases.s3.amazonaws.com/Associations-1.0.0-universal.dmg';
  try {
    const res = await fetch('https://associations-releases.s3.amazonaws.com/latest-mac.yml', {
      next: { revalidate: 3600 } // cache for 1 hour
    });
    if (res.ok) {
      const yaml = await res.text();
      const match = yaml.match(/url:\s+(.+\.dmg)/);
      if (match) {
        downloadUrl = `https://associations-releases.s3.amazonaws.com/${match[1].trim()}`;
      }
    }
  } catch (e) {
    // fall back to hardcoded URL
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Associations",
            "applicationCategory": "WritingApplication",
            "operatingSystem": "macOS 13+",
            "url": "https://associations.dampconcrete.com",
            "downloadUrl": downloadUrl,
            "description": "A writing notebook that isn't linear. It connects the dots in your writing — without organizing them, sorting them, or asking you to manage anything.",
            "offers": {
              "@type": "Offer",
              "price": "9.00",
              "priceCurrency": "USD",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "9.00",
                "priceCurrency": "USD",
                "unitText": "MONTH"
              }
            },
            "author": {
              "@type": "Organization",
              "name": "Damp Concrete",
              "url": "https://dampconcrete.com"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Damp Concrete",
              "url": "https://dampconcrete.com"
            },
            "featureList": [
              "Semantic ghost connections from your own writing",
              "Local embeddings — your writing never leaves your device",
              "Q&A questions generated from your existing content",
              "Folder watch — import existing writing into the pool",
              "Project and document management",
              "Export to RTF and plain text",
              "Outline mode with kept connections",
              "Auto-save"
            ],
            "screenshot": "https://associations.dampconcrete.com/og-image.png"
          })
        }}
      />


      {/* Nav */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 8vw',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 100,
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <polygon points="14,0 28,14 24,14 14,4 4,14 0,14" fill="#C8A96E" opacity="0.4"/>
            <polygon points="14,3 26,15 22,15 14,7 6,15 2,15" fill="#C8A96E" opacity="0.55"/>
            <polygon points="14,6 24,16 20,16 14,10 8,16 4,16" fill="#C8A96E" opacity="0.75"/>
            <polygon points="14,9 22,17 18,17 14,13 10,17 6,17" fill="#C8A96E"/>
          </svg>
          <span style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '15px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text)',
          }}>Associations</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#how" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>How it works</a>
          <a href="#pricing" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</a>
          <a href="/docs" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none' }}>Docs</a>
          <a href={downloadUrl} style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '14px',
            color: 'var(--bg)',
            background: 'var(--text)',
            padding: '11px 22px',
            borderRadius: '6px',
            textDecoration: 'none',
          }}>Download for Mac</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 8vw 80px', maxWidth: '680px' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '28px' }}>Mac</p>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '17px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>What if a writing notebook wasn't linear?</p>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: 'clamp(40px, 5vw, 60px)', fontWeight: '400', lineHeight: '1.2', color: 'var(--text)', marginBottom: '32px' }}>See what connects.</h1>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '19px', lineHeight: '1.9', color: 'var(--text-muted)', marginBottom: '48px' }}>
          Associations watches what you write and brings back<br/>
          related things you've already written.<br/>
          Not suggestions. Not generated text.<br/>
          Your own words — returning when they matter.
        </p>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={downloadUrl} style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '15px',
            color: 'var(--bg)',
            background: 'var(--text)',
            padding: '16px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-block',
          }}>Download for Mac — free trial</a>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)' }}>macOS 13+</span>
        </div>
      </section>

      {/* Demo window */}
      <section style={{ padding: '0 8vw 100px' }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '0.5px solid var(--border)',
          overflow: 'hidden',
          maxWidth: '720px',
          boxShadow: '0 2px 40px rgba(42,40,37,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: '8px', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }}/>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }}/>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)', margin: '0 auto' }}>Chapter Three</span>
          </div>
          <div style={{ position: 'relative' }}>
            {/* Ghost overlay */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '28px 10%',
              background: 'rgba(250,250,248,0.92)',
              borderBottom: '0.5px solid var(--border)',
            }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '12px' }}>from your writing</p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '20px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>Did she know she was leaving for good?</p>
              <div style={{ display: 'flex', gap: '24px' }}>
                {['let it go', 'watch', 'keep'].map(a => (
                  <span key={a} style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{a}</span>
                ))}
              </div>
            </div>
            {/* Writing */}
            <div style={{ padding: '32px 10% 40px' }}>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '19px', lineHeight: '2.1', color: 'var(--text)', marginBottom: 0 }}>
                The morning had gone the way most mornings did — quietly, without ceremony. He made coffee. He stood at the window. The street below was empty except for a dog that seemed uncertain which direction it wanted to go.
              </p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '19px', lineHeight: '2.1', color: 'var(--text)', textIndent: '2em' }}>
                He thought about calling her. He thought about it the way you think about things you've already decided not to do.
              </p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '19px', lineHeight: '2.1', color: 'var(--text)', textIndent: '2em' }}>
                She left the door open when she went. I told myself it was an accident.
              </p>
            </div>
            <p style={{ padding: '0 10% 16px', textAlign: 'right', fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)' }}>74 words</p>
          </div>
        </div>
        <p style={{ marginTop: '16px', fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)', fontStyle: 'italic', maxWidth: '560px' }}>
          A question from your own writing — not a prompt, not a suggestion. Something you already knew, arriving when it's needed.
        </p>
      </section>

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '0 8vw' }}/>

      {/* How it works */}
      <section id="how" style={{ padding: '100px 8vw' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '48px' }}>How it works</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', maxWidth: '860px' }}>
          {[
            { num: '01', head: 'You write.', body: 'Everything goes into the pool — your drafts, your notes, your story bible. It accumulates.' },
            { num: '02', head: 'Something appears.', body: "When what you're writing now connects to something you've written before, it fades in. Not because you searched. Because it connects." },
            { num: '03', head: 'You decide.', body: 'Let it go. Watch it. Keep it. A kept connection stays attached to exactly where you found it — the moment in the writing where it arrived.' },
          ].map(step => (
            <div key={step.num}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '16px' }}>{step.num}</p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '22px', color: 'var(--text)', lineHeight: '1.4', marginBottom: '12px' }}>{step.head}</p>
              <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '16px', lineHeight: '1.8', color: 'var(--text-muted)' }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Truth section */}
      <section style={{ background: 'var(--text)', padding: '100px 8vw' }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: '400', color: 'var(--bg)', lineHeight: '1.4', maxWidth: '640px', marginBottom: '24px' }}>
          The dots are already there. They just haven't connected yet.
        </h2>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '18px', color: 'rgba(245,243,239,0.5)', lineHeight: '1.8', maxWidth: '480px', marginBottom: '48px' }}>
          Day one, it listens. Month three, it starts to surprise you. The more you write, the more it finds.
        </p>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', letterSpacing: '0.06em', color: 'rgba(245,243,239,0.4)', textTransform: 'uppercase' }}>
          It is always your own words. Associations never generates text.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 8vw' }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '48px' }}>Pricing</p>
        <div style={{ display: 'flex', gap: '16px', maxWidth: '540px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {[
            { label: 'Monthly', amount: '$9', period: 'per month', note: 'Cancel anytime.', featured: false },
            { label: 'Annual', amount: '$79', period: 'per year', note: 'Two months free.', featured: true },
          ].map(plan => (
            <div key={plan.label} style={{
              flex: 1,
              minWidth: '180px',
              background: plan.featured ? 'var(--text)' : 'white',
              border: '0.5px solid rgba(42,40,37,0.1)',
              borderRadius: '10px',
              padding: '28px 24px',
            }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: plan.featured ? 'rgba(245,243,239,0.4)' : 'var(--text-faint)', marginBottom: '16px' }}>{plan.label}</p>
              <p style={{ fontFamily: "'Lora', serif", fontSize: '36px', color: plan.featured ? 'var(--bg)' : 'var(--text)', marginBottom: '4px' }}>{plan.amount}</p>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', color: plan.featured ? 'rgba(245,243,239,0.4)' : 'var(--text-faint)', marginBottom: '16px' }}>{plan.period}</p>
              <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: plan.featured ? 'rgba(245,243,239,0.5)' : 'var(--text-muted)', lineHeight: '1.6' }}>{plan.note}</p>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: 'var(--text-faint)', maxWidth: '420px', lineHeight: '1.7' }}>
          Includes a 15,000 word free trial — enough to write past the empty-pool phase and into the first genuine connections.
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 8vw',
        borderTop: '0.5px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Image src="/damp-concrete-logo.png" alt="Damp Concrete" width={32} height={32} />
            <a href="https://dampconcrete.com" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontFamily: "'Poppins', sans-serif", fontSize: '13px' }}>Damp Concrete</a>
          </div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)', lineHeight: '1.9' }}>
            Associations is part of{' '}
            <a href="https://dampconcrete.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Damp Concrete
            </a>
            {' '}— software for writers, collectors, and the people who show up.<br/>
            Built by{' '}
            <a href="https://terryheath.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Terry Heath
            </a>
            .<br/>
            terry@terryheath.com
          </div>
        </div>
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '15px', color: 'var(--text-faint)' }}>
          A notebook where the dots connect.
        </p>
      </footer>

      {/* Cloudflare Web Analytics */}
      <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}></script>

    </main>
  );
}
