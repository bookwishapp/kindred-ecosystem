import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, status, source, subscribed_at
       FROM subscribers
       ORDER BY subscribed_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}