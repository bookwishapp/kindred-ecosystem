export default function Home() {
  return (
    <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '24px', fontFamily: 'Poppins' }}>
        Passportr
      </h1>
      <p style={{ fontSize: '20px', marginBottom: '32px', color: 'var(--text-secondary)' }}>
        Digital event passports for hop crawls, art walks, and more.
      </p>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/organize">
          <button>Organize a Hop</button>
        </a>
      </div>
    </div>
  )
}
