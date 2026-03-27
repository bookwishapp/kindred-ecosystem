export default function Home() {
  return (
    <div className="container">
      <div className="profile-card">
        <h1 className="name">Kindred</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Stay close to the people who matter
        </p>
        <a
          href="https://apps.apple.com/app/kindred"
          className="keep-button"
          style={{ textDecoration: 'none' }}
        >
          Download on App Store
        </a>
      </div>
      <div className="kindred-logo">Kindred</div>
    </div>
  )
}