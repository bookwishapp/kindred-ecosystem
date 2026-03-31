export const runtime = 'nodejs';

const db = require('../../../../../lib/db');

function verifyAdminSecret(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req, { params }) {
  try {
    verifyAdminSecret(req);
    const { userId } = params;

    const profileResult = await db.query(
      'SELECT * FROM organizer_profiles WHERE user_id = $1',
      [userId]
    );
    if (profileResult.rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const hopsResult = await db.query(
      `SELECT h.*, COUNT(v.id) as venue_count, COUNT(p.id) as participant_count
       FROM hops h
       LEFT JOIN venues v ON v.hop_id = h.id
       LEFT JOIN participants p ON p.hop_id = h.id
       WHERE h.organizer_user_id = $1
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [userId]
    );

    return Response.json({
      organizer: profileResult.rows[0],
      hops: hopsResult.rows,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin get organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    verifyAdminSecret(req);
    const { userId } = params;
    const { nonprofit_verified, nonprofit_pending, status, plan, tier } = await req.json();

    const result = await db.query(
      `UPDATE organizer_profiles
       SET nonprofit_verified = COALESCE($1, nonprofit_verified),
           nonprofit_pending = COALESCE($2, nonprofit_pending),
           status = COALESCE($3, status),
           plan = COALESCE($4, plan),
           tier = COALESCE($5, tier),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [nonprofit_verified, nonprofit_pending, status, plan, tier, userId]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ organizer: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin update organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
