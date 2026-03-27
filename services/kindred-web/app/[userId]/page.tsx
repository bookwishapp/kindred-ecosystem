import { Metadata } from 'next'

interface ProfileData {
  id: string
  name: string
  photo_url?: string
  birthday?: string
}

interface PageProps {
  params: Promise<{ userId: string }>
}

async function getProfile(userId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`https://api.fromkindred.com/profiles/${userId}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })

    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params
  const profile = await getProfile(userId)

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
  const { userId } = await params
  const profile = await getProfile(userId)

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

  const deepLink = `kindred://${profile.id}`

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
            Birthday: {formatBirthday(profile.birthday)}
          </p>
        )}

        <a href={deepLink} className="keep-button">
          Keep in Kindred
        </a>
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