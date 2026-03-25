import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM subscribers
       WHERE status = 'active'
         AND email NOT IN (
           SELECT email FROM suppressions
         )`
    );
    return NextResponse.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error counting subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to count subscribers' },
      { status: 500 }
    );
  }
}