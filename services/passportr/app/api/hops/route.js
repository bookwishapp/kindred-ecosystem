export const runtime = 'nodejs';

const db = require('../../../lib/db');
const { requireAuth } = require('../../../lib/auth');

export async function GET(req) {
  try {
    const user = requireAuth(req);

    const result = await db.query(
      `SELECT h.*,
        (SELECT COUNT(*) FROM venues WHERE hop_id = h.id) as venue_count,
        (SELECT COUNT(*) FROM participants WHERE hop_id = h.id) as participant_count,
        (SELECT COUNT(*) FROM participants WHERE hop_id = h.id AND completed_at IS NOT NULL) as completion_count
      FROM hops h
      WHERE organizer_user_id = $1
      ORDER BY created_at DESC`,
      [user.userId]
    );

    return Response.json({ hops: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get hops error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = requireAuth(req);
    const { slug, name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, coupon_expiry_minutes } = await req.json();

    if (!slug || !name || !start_date || !end_date || !stamp_cutoff_date || !redeem_cutoff_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO hops (organizer_user_id, slug, name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, coupon_expiry_minutes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *`,
      [user.userId, slug, name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule || { type: 'all' }, coupon_expiry_minutes || 30]
    );

    return Response.json({ hop: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create hop error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
