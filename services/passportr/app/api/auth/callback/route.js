export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get('access_token');
  const returnTo = searchParams.get('return_to') || '/';

  if (!accessToken) {
    return NextResponse.redirect(new URL('/organize/login', req.url));
  }

  // Validate return_to is a relative path to prevent open redirect
  const safePath = returnTo.startsWith('/') ? returnTo : '/';

  const response = NextResponse.redirect(new URL(safePath, req.url));

  response.cookies.set('passportr_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days, matches auth service JWT expiry
    path: '/',
  });

  return response;
}
