import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

export async function POST() {
  const clearNew = serialize('th_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  const clearOld = serialize('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', clearNew);
  response.headers.append('Set-Cookie', clearOld);
  return response;
}
