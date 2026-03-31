export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
const db = require('../../lib/db');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  try {
    const result = await db.query(
      `UPDATE participant_preferences
       SET opt_in = false, unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>Already unsubscribed</h2>
          <p>This email address is not subscribed to Passportr notifications.</p>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new NextResponse(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>Unsubscribed</h2>
        <p>You've been removed from Passportr hop notifications.</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse('Something went wrong.', { status: 500 });
  }
}
