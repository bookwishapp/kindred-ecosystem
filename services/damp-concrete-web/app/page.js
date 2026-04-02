import Image from 'next/image';

export const metadata = {
  title: 'Damp Concrete — Software from Port Orchard, WA.',
  description: 'Damp Concrete builds software for writers, collectors, and the people who show up. Built by Terry Heath.',
  metadataBase: new URL('https://dampconcrete.com'),
  alternates: { canonical: 'https://dampconcrete.com' },
  openGraph: {
    title: 'Damp Concrete',
    description: 'Software from Port Orchard, WA.',
    url: 'https://dampconcrete.com',
    siteName: 'Damp Concrete',
    type: 'website',
    images: [{ url: '/damp-concrete-logo.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'Damp Concrete',
    description: 'Software from Port Orchard, WA.',
  },
};

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      gap: '48px',
    }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Damp Concrete",
            "url": "https://dampconcrete.com",
            "logo": "https://dampconcrete.com/damp-concrete-logo.png",
            "description": "Software from Port Orchard, WA.",
            "founder": {
              "@type": "Person",
              "name": "Terry Heath",
              "url": "https://terryheath.com"
            },
            "sameAs": [
              "https://terryheath.com"
            ],
            "makesOffer": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "Associations",
                  "url": "https://associations.dampconcrete.com",
                  "applicationCategory": "WritingApplication",
                  "operatingSystem": "macOS"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "Passportr",
                  "url": "https://passportr.dampconcrete.com",
                  "applicationCategory": "EventManagement",
                  "operatingSystem": "Web"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "Kindred",
                  "url": "https://kindred.dampconcrete.com",
                  "applicationCategory": "SocialNetworkingApplication",
                  "operatingSystem": "iOS"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "SoftwareApplication",
                  "name": "AnalogList",
                  "url": "https://analoglist.dampconcrete.com",
                  "applicationCategory": "LifestyleApplication",
                  "operatingSystem": "iOS"
                }
              }
            ]
          })
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <Image
          src="/damp-concrete-logo.png"
          alt="Damp Concrete"
          width={120}
          height={120}
          style={{ marginBottom: '24px' }}
        />
        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '13px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          marginBottom: '12px',
        }}>
          Damp Concrete
        </p>
        <p style={{
          fontFamily: "'Lora', serif",
          fontStyle: 'italic',
          fontSize: '18px',
          color: 'var(--text-muted)',
          lineHeight: '1.6',
        }}>
          Software from Port Orchard, WA.
        </p>
      </div>

      <nav style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Small Things', url: 'https://terryheath.com' },
          { label: 'Associations', url: 'https://associations.dampconcrete.com' },
          { label: 'Kindred', url: 'https://fromkindred.com' },
          { label: 'AnalogList', url: 'https://analoglist.io' },
          { label: 'BookWish', url: 'https://bookwish.io' },
          { label: 'North Star Postal', url: 'https://northstarpostal.com' },
        ].map(link => (
          <a key={link.label} href={link.url} style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '14px',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}>
            {link.label}
          </a>
        ))}
      </nav>

      <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: '13px', color: 'var(--text-faint)', lineHeight: '1.9' }}>
        Damp Concrete builds software for writers, collectors, and the people who show up.<br/>
        Built by <a href="https://terryheath.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terry Heath</a> in Port Orchard, WA.
      </p>
    </main>
  );
}
