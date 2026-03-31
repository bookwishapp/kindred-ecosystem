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
          <h1>Admin</h1>
          <nav className="admin-nav">
            <Link href="/admin/overview" className={isActive('/admin/overview') ? 'active' : ''}>
              Overview
            </Link>
            <Link href="/admin/small-things/posts" className={isActive('/admin/small-things') ? 'active' : ''}>
              Small Things
            </Link>
            <Link href="/admin/passportr/organizers" className={isActive('/admin/passportr') ? 'active' : ''}>
              Passportr
            </Link>
            <Link href="/admin/kindred" className={isActive('/admin/kindred') ? 'active' : ''}>
              Kindred
            </Link>
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
