export const runtime = 'nodejs';

const db = require('../../../../lib/db');

function verifyAdminSecret(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req) {
  try {
    verifyAdminSecret(req);

    const result = await db.query(
      `SELECT
        op.*,
        (SELECT COUNT(*) FROM hops WHERE organizer_user_id = op.user_id) as total_hops,
        (SELECT COUNT(*) FROM hops WHERE organizer_user_id = op.user_id AND status = 'active') as active_hops
       FROM organizer_profiles op
       ORDER BY op.created_at DESC`
    );

    return Response.json({ organizers: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin get organizers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
