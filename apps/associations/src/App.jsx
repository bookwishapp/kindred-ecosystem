import { useState, useEffect } from 'react';
import './styles/globals.css';
import Compose from './components/Compose';
import apiClient from './api/client';

export default function App() {
  const [mode, setMode] = useState('compose');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const token = await window.electron.getToken();
      setAuthed(!!token);
      setChecking(false);
    }
    checkAuth();

    // Listen for deep link auth callback
    window.electron.onDeepLink((url) => {
      const params = new URL(url);
      const token = params.searchParams.get('access_token');
      if (token) {
        window.electron.saveToken(token).then(() => setAuthed(true));
      }
    });
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (authed) {
      apiClient.getMe().then(setUserProfile).catch(console.error);
    }
  }, [authed]);

  if (checking) return null;

  if (!authed) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)'
        }}>
          Associations
        </p>
        <button
          onClick={() => {
            const url = `${import.meta.env.VITE_API_BASE_URL}/auth/request`;
            window.electron.openExternal(
              `https://auth.terryheath.com/auth/request?redirect_uri=associations://auth/verify&app_name=Associations`
            );
          }}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            background: 'none',
            border: '0.5px solid var(--text-faint)',
            color: 'var(--text-muted)',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            letterSpacing: '0.06em'
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  // Trial exhaustion screen
  if (authed && userProfile && !userProfile.can_write) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        padding: '48px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'Lora', serif",
          fontStyle: 'italic',
          fontSize: '22px',
          color: 'var(--text)',
          lineHeight: '1.6',
          maxWidth: '400px',
        }}>
          Your ghosts know you a little now.
        </p>
        <p style={{
          fontFamily: "'Lora', serif",
          fontSize: '15px',
          color: 'var(--text-muted)',
        }}>
          Subscribe to keep writing.
        </p>
        <button
          onClick={async () => {
            // TODO: Implement Stripe checkout URL fetching
            // For now, open the portal
            try {
              const { url } = await apiClient.createPortalSession();
              window.electron.openExternal(url);
            } catch (error) {
              console.error('Failed to create portal session:', error);
            }
          }}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            background: 'none',
            border: '0.5px solid var(--text-faint)',
            color: 'var(--text-muted)',
            padding: '10px 28px',
            borderRadius: '6px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            marginTop: '8px',
          }}
        >
          Subscribe
        </button>
      </div>
    );
  }

  return <Compose />;
}