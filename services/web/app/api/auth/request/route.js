import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const allowedEmail = process.env.ADMIN_EMAIL;
    if (!allowedEmail || email.toLowerCase() !== allowedEmail.toLowerCase()) {
      // Return success anyway — don't reveal whether the email is valid
      return NextResponse.json({ success: true });
    }

    const response = await fetch(`${process.env.AUTH_BASE_URL}/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        app_name: 'Terry Heath',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 500 });
  }
}
