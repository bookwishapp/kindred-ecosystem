import { NextResponse } from 'next/server';

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for login page and API login route
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  // Check auth for all admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const cookieHeader = request.headers.get('cookie');
    const hasSession = cookieHeader && cookieHeader.includes('admin_session=');

    if (!hasSession) {
      // Redirect to login for page requests
      if (!pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      // Return 401 for API requests
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For API routes, verify the session properly in the route handler
    // For pages, verify in the page component
    // This middleware just checks for session existence
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};