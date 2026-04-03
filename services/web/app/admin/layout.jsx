'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return children;
  }

  const isActive = (path) => pathname.startsWith(path);

  return (
    <>
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Small Things</h1>
          <nav className="admin-nav">
            <Link href="/admin/small-things/posts" className={isActive('/admin/small-things/posts') ? 'active' : ''}>
              Posts
            </Link>
            <Link href="/admin/small-things/sends" className={isActive('/admin/small-things/sends') ? 'active' : ''}>
              Sends
            </Link>
            <a href="https://terryheath.com" target="_blank" rel="noopener" style={{ opacity: 0.6 }}>
              terryheath.com ↗
            </a>
            <form action="/api/admin/logout" method="POST" style={{ display: 'inline' }}>
              <button type="submit" className="logout-btn">Logout</button>
            </form>
          </nav>
        </div>
      </div>
      <div className="container-wide">{children}</div>
    </>
  );
}
