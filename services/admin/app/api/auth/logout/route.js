import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.dampconcrete.com';
  const clear = serialize('dc_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  const response = NextResponse.redirect(new URL('/login', baseUrl));
  response.headers.set('Set-Cookie', clear);
  return response;
}
