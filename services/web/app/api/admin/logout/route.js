import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

// Reject GET requests to prevent prefetch from destroying session
export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function POST() {
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