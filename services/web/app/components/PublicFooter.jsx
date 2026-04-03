'use client';

import { usePathname } from 'next/navigation';

export default function PublicFooter() {
  const pathname = usePathname();

  // Don't show footer on admin pages or API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return null;
  }

  return (
    <footer style={{
      marginTop: '80px',
      paddingTop: '32px',
      paddingBottom: '32px',
      borderTop: '1px solid #e5e5e5',
      textAlign: 'center',
      fontSize: '13px',
      color: '#999',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      Part of{' '}
      <a
        href="https://dampconcrete.com"
        style={{ color: '#666', textDecoration: 'none' }}
      >
        Damp Concrete
      </a>
      {' '}— software built by Terry Heath in Port Orchard, WA.
    </footer>
  );
}
