import { Metadata } from 'next'

interface ProfileData {
  user_id: string
  name: string
  username?: string
  photo_url?: string
  birthday?: string
  wishlist_links?: Array<{
    id: string
    label: string
    url: string
  }>
  shared_dates?: Array<{
    id: string
    label: string
    date: string
  }>
}

interface PageProps {
  params: Promise<{ username: string }>
}

async function getProfile(username: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`https://auth.terryheath.com/profile/${username}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data.profile || null
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    return {
      title: 'Profile Not Found | Kindred',
    }
  }

  return {
    title: `${profile.name} | Kindred`,
    description: `View ${profile.name}'s profile on Kindred`,
    openGraph: {
      title: `${profile.name} | Kindred`,
      description: `View ${profile.name}'s profile on Kindred`,
      type: 'profile',
      images: profile.photo_url ? [profile.photo_url] : undefined,
    },
  }
}

function formatBirthday(dateString: string): string {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    return (
      <div className="container">
        <div className="error-container">
          <h1 className="error-title">Profile not found</h1>
          <p className="error-message">
            This profile doesn't exist or has been removed.
          </p>
        </div>
        <div className="kindred-logo">Kindred</div>
      </div>
    )
  }

  const deepLink = `kindred://profile/${username}`

  return (
    <div className="container">
      <div className="profile-card">
        <div className="avatar-container">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="avatar"
            />
          ) : (
            <div className="avatar-placeholder">
              {getInitial(profile.name)}
            </div>
          )}
        </div>

        <h1 className="name">{profile.name}</h1>

        {profile.birthday && (
          <p className="birthday">
            {formatBirthday(profile.birthday)}
          </p>
        )}

        {/* Mobile: deep link opens app */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }} className="mobile-only">
          <a href={deepLink} className="keep-button">
            Keep {profile.name} in Kindred
          </a>
          <div className="keep-button" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            Get it on Google Play (Coming Soon)
          </div>
        </div>

        {/* Desktop: prompt to get the app */}
        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div className="keep-button">
            <p className="keep-desktop-text">Keep {profile.name} in Kindred</p>
            <a href="https://apps.apple.com/app/kindred-stay-close/id6761225471" className="app-store-link">Get Kindred on iPhone</a>
          </div>
          <div className="keep-button" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            <p className="keep-desktop-text">Keep {profile.name} in Kindred</p>
            <span className="app-store-link" style={{ opacity: 1 }}>Get it on Google Play (Coming Soon)</span>
          </div>
        </div>
      </div>

      <div className="profile-footer">
        <a href="/privacy" className="profile-footer-link">Privacy</a>
        <span className="profile-footer-separator">·</span>
        <a href="/terms" className="profile-footer-link">Terms</a>
      </div>

      <div className="kindred-logo">Kindred</div>
    </div>
  )
}