import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy | Kindred',
  description: 'Privacy policy for Kindred',
}

export default function PrivacyPage() {
  const currentDate = new Date()
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' })
  const currentYear = currentDate.getFullYear()

  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1 className="legal-title">Privacy</h1>

        <section className="legal-section">
          <h2>What we collect</h2>
          <p>
            When you create a profile, we store the information you choose to share:
            your name, photo, birthday, and any wishlist links or dates you add.
          </p>
          <p>
            We use your email address only for authentication (magic links) and
            updates if you opt in. We don't share it with anyone.
          </p>
        </section>

        <section className="legal-section">
          <h2>What we don't collect</h2>
          <p>
            Your notes about people stay on your device. We can't see them.
            We don't track you. No analytics. No ads. No selling data.
          </p>
        </section>

        <section className="legal-section">
          <h2>How your data is used</h2>
          <p>
            Your profile information is only visible to people you share your profile link with.
            When someone adds you to their Kin, they see what you've chosen to share.
          </p>
        </section>

        <section className="legal-section">
          <h2>Deleting your data</h2>
          <p>
            You can delete your account at any time from the app settings.
            This removes your profile and all associated data from our servers.
            Your local notes remain on your device.
          </p>
        </section>

        <section className="legal-section">
          <h2>Security</h2>
          <p>
            We use industry-standard security practices to protect your data.
            Your connection to Kindred is encrypted. Your private notes never leave your device.
          </p>
        </section>

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            Questions about privacy? Email{' '}
            <a href="mailto:terry@terryheath.com" className="legal-link">
              terry@terryheath.com
            </a>
          </p>
        </section>

        <div className="legal-footer">
          <p className="legal-date">Last updated: {currentMonth} {currentYear}</p>
        </div>
      </div>

      <div className="legal-nav">
        <a href="/terms" className="legal-nav-link">Terms</a>
        <span className="legal-nav-separator">·</span>
        <a href="/" className="legal-nav-link">Kindred</a>
      </div>
    </div>
  )
}