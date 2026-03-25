'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return children;
  }

  const isActive = (path) => {
    if (path === '/admin/posts') {
      return pathname === '/admin' || pathname === '/admin/posts' || pathname.startsWith('/admin/posts/');
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin</h1>
          <nav className="admin-nav">
            <Link href="/admin/posts" className={isActive('/admin/posts') ? 'active' : ''}>
              Posts
            </Link>
            <Link href="/admin/subscribers" className={isActive('/admin/subscribers') ? 'active' : ''}>
              Subscribers
            </Link>
            <Link href="/admin/suppressions" className={isActive('/admin/suppressions') ? 'active' : ''}>
              Suppressions
            </Link>
            <Link href="/admin/sends" className={isActive('/admin/sends') ? 'active' : ''}>
              Sends
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