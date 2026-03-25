import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { validateUnsubscribeToken } from '../../../lib/unsubscribe';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Validate token
    if (!validateUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      );
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Add to suppressions
      await client.query(
        `INSERT INTO suppressions (email, reason)
         VALUES ($1, 'unsubscribed')
         ON CONFLICT (email) DO NOTHING`,
        [email]
      );

      // Update subscriber status
      await client.query(
        `UPDATE subscribers
         SET status = 'suppressed'
         WHERE email = $1`,
        [email]
      );

      await client.query('COMMIT');
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