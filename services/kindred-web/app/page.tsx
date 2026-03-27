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
      <footer className="main-footer">
        <div className="footer-links">
          <a href="/terms" className="footer-link">Terms</a>
          <span className="footer-separator">·</span>
          <a href="/privacy" className="footer-link">Privacy</a>
        </div>
        <div className="footer-brand">Kindred</div>
      </footer>
    </div>
  )
}