import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export async function GET() {
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