'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PassportrAdminLayout({ children }) {
  const pathname = usePathname();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <div>
      <div style={{ borderBottom: '1px solid #eee', marginBottom: '32px' }}>
        <nav style={{ display: 'flex', gap: '0' }}>
          {[
            { href: '/admin/passportr/organizers', label: 'Organizers' },
            { href: '/admin/passportr/subscribers', label: 'Subscribers' },
            { href: '/admin/passportr/send', label: 'Send' },
          ].map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                borderBottom: isActive(tab.href) ? '2px solid #1A1A1A' : '2px solid transparent',
                color: isActive(tab.href) ? '#1A1A1A' : '#666',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
