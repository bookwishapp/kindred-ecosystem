import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create session token (simplified for Edge Runtime)
    const sessionData = {
      admin: true,
      timestamp: Date.now(),
      // Add a random component for uniqueness
      random: Math.random().toString(36).substring(2)
    };

    // Simple base64 encoding for the session
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Set cookie
    const cookie = serialize('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}