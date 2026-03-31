'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizerWelcome() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/organize');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="container" style={{ paddingTop: '120px', maxWidth: '500px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>You're all set!</h1>
      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
        Welcome to Passportr. Your account is active and ready to go.
      </p>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        Redirecting to your dashboard in {countdown}...
      </p>
      <button onClick={() => router.push('/organize')} style={{ marginTop: '16px' }}>
        Go to Dashboard Now
      </button>
    </div>
  );
}
