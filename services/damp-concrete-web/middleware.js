import { NextResponse } from 'next/server';

export function middleware(request) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Strip port for local dev
  const host = hostname.split(':')[0];

  if (host === 'associations.dampconcrete.com' || host === 'associations.localhost') {
    url.pathname = `/associations${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // dampconcrete.com — serve root
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
