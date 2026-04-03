import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://admin.dampconcrete.com';
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('access_token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no_token', baseUrl));
  }

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const authorizedSub = process.env.ADMIN_USER_SUB;

    if (!authorizedSub || payload.sub !== authorizedSub) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', baseUrl));
    }

    const cookie = serialize('dc_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    const response = NextResponse.redirect(new URL('/', baseUrl));
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl));
  }
}
