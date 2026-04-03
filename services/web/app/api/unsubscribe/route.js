import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { validateUnsubscribeToken } from '../../../lib/unsubscribe';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { email, token } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // If token is provided, validate it (for email unsubscribe links)
    // If no token, allow direct API unsubscribe (from Kindred app)
    if (token && !validateUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Add to suppressions with ON CONFLICT DO NOTHING
      // This handles duplicates gracefully
      await client.query(
        `INSERT INTO suppressions (email, reason)
         VALUES ($1, 'unsubscribed')
         ON CONFLICT (email) DO NOTHING`,
        [normalizedEmail]
      );

      // Update subscriber status if they exist
      await client.query(
        `UPDATE subscribers
         SET status = 'suppressed'
         WHERE email = $1`,
        [normalizedEmail]
      );

      await client.query('COMMIT');

      // Also update mail service subscription
      const encodedEmail = encodeURIComponent(normalizedEmail);
      await fetch(
        `${process.env.MAIL_SERVICE_URL}/unsubscribe/terryheath/${encodedEmail}`
      ).catch(() => {}); // non-blocking, best effort

      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Unsubscribe API error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe' },
      { status: 500 }
    );
  }
}