import Image from 'next/image';

export const metadata = {
  title: 'Damp Concrete',
  description: 'Software from Port Orchard, WA.',
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

      <p style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: '12px',
        color: 'var(--text-faint)',
        letterSpacing: '0.04em',
      }}>
        terry@terryheath.com
      </p>
    </main>
  );
}
