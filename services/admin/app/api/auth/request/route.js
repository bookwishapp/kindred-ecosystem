import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const allowedEmail = process.env.ADMIN_EMAIL;
    if (!allowedEmail || email.toLowerCase() !== allowedEmail.toLowerCase()) {
      return NextResponse.json({ success: true }); // silent rejection
    }

    const res = await fetch(`${process.env.AUTH_BASE_URL}/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        app_name: 'Damp Concrete Admin',
      }),
    });

    if (!res.ok) return NextResponse.json({ error: 'Auth service error' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
  }
}
