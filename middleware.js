import { NextResponse } from 'next/server';
import { getAuthFromRequest } from './lib/auth';

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Skip auth check for login page and API login route
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  // Check auth for all admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const auth = getAuthFromRequest(request);

    if (!auth) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};