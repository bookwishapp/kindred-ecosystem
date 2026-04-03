'use client';

import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { label: 'Overview', href: '/' },
  { label: 'Small Things', href: '/small-things' },
  { label: 'Passportr', href: '/passportr' },
  { label: 'Kindred', href: '/kindred' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--text)',
        padding: '32px 0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 24px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '600' }}>Damp Concrete</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Admin</div>
        </div>
        <div style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '10px 24px',
                fontSize: '14px',
                color: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.5)',
                background: pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div style={{ padding: '0 24px' }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '40px', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
