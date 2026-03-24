import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function GET() {
  const cookie = serialize('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  const response = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  response.headers.set('Set-Cookie', cookie);
  return response;
}