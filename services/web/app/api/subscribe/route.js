export const runtime = 'nodejs';

import db from '../../../lib/db';

export async function POST(request) {
  try {
    // Parse JSON body
    const body = await request.json();
    const { email } = body;

    // Validate email is present and is a string
    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Insert subscriber with ON CONFLICT DO NOTHING
    await db.query(
      `INSERT INTO subscribers (email, status, source)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [email, 'active', 'web']
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