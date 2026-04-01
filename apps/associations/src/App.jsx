import { useState, useEffect } from 'react';
import './styles/globals.css';
import Compose from './components/Compose';

export default function App() {
  const [mode, setMode] = useState('compose');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

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

  return <Compose />;
}