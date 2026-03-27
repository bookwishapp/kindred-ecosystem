import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use | Kindred',
  description: 'Terms of Use for Kindred',
}

export default function TermsPage() {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1 className="legal-title">Terms of Use</h1>

        <section className="legal-section">
          <h2>The basics</h2>
          <p>
            Kindred is provided as-is. We'll do our best to keep it running smoothly,
            but we can't guarantee uninterrupted service.
          </p>
        </section>

        <section className="legal-section">
          <h2>Your data</h2>
          <p>
            You own your data. The notes you write about your people stay on your device.
            Your profile information (what you choose to share) is stored on our servers.
          </p>
        </section>

        <section className="legal-section">
          <h2>Using Kindred</h2>
          <p>
            Don't misuse the service. Don't try to break things. Don't impersonate others.
            Just use it to keep your people present.
          </p>
        </section>

        <section className="legal-section">
          <h2>Changes</h2>
          <p>
            We may update these terms from time to time. We'll do our best to notify you
            of significant changes if you've provided an email.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions or concerns? Reach out at{' '}
            <a href="mailto:terry@terryheath.com" className="legal-link">
              terry@terryheath.com
            </a>
          </p>
        </section>

        <div className="legal-footer">
          <p className="legal-date">Last updated: March 2025</p>
        </div>
      </div>

      <div className="legal-nav">
        <a href="/privacy" className="legal-nav-link">Privacy</a>
        <span className="legal-nav-separator">·</span>
        <a href="/" className="legal-nav-link">Kindred</a>
      </div>
    </div>
  )
}