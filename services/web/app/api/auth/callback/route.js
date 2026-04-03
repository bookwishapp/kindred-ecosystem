import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

export async function GET(request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://terryheath.com';
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('access_token');
  const returnTo = searchParams.get('return_to') || '/admin/posts';

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login?error=no_token', baseUrl));
  }

  // Verify the token is for an authorized admin
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    const authorizedSub = process.env.ADMIN_USER_SUB;
    if (!authorizedSub || payload.sub !== authorizedSub) {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', baseUrl));
    }

    // Set JWT as httpOnly cookie
    const cookie = serialize('th_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    const response = NextResponse.redirect(new URL(returnTo, baseUrl));
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_token', baseUrl));
  }
}
