'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OrganizerCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');

    if (!accessToken) {
      setError(true);
      return;
    }

    try {
      // Set cookie with the access token
      // httpOnly: false so JavaScript can set it
      // Expires in 30 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      document.cookie = `passportr_token=${encodeURIComponent(accessToken)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;

      // Redirect to organize dashboard
      router.push('/organize');
    } catch (err) {
      console.error('Failed to set cookie:', err);
      setError(true);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Authentication Error</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Something went wrong with the magic link. Please try signing in again.
          </p>
          <a href="/organize/login">
            <button>Back to Sign In</button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '18px' }}>Signing you in...</p>
      </div>
    </div>
  );
}
