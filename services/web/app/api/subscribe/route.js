export const runtime = 'nodejs';

import db from '../../../lib/db';

export async function POST(request) {
  try {
    // Parse JSON body
    const body = await request.json();
    const { email, source = 'kindred' } = body;

    // Validate email is present and is a string
    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Insert subscriber with ON CONFLICT DO NOTHING
    // If email already exists, this will silently do nothing (no error)
    await db.query(
      `INSERT INTO subscribers (email, status, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim(), 'active', source]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}