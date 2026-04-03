import { NextResponse } from 'next/server';

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for login page and auth routes
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Check auth for all admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const cookieHeader = request.headers.get('cookie');
    const hasSession = cookieHeader && (
      cookieHeader.includes('th_session=') ||
      cookieHeader.includes('admin_session=') // keep old cookie working during transition
    );

    if (!hasSession) {
      if (!pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
