'use client';

import { useState, useEffect } from 'react';
import OptInOverlay from './OptInOverlay';

export default function PassportWithOptIn({ children, userId, hopId, isFirstStamp }) {
  const [showOptIn, setShowOptIn] = useState(false);

  useEffect(() => {
    if (isFirstStamp) {
      // Small delay so passport renders first
      const timer = setTimeout(() => setShowOptIn(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isFirstStamp]);

  return (
    <>
      {children}
      {showOptIn && (
        <OptInOverlay
          userId={userId}
          hopId={hopId}
          onDismiss={() => setShowOptIn(false)}
        />
      )}
    </>
  );
}
