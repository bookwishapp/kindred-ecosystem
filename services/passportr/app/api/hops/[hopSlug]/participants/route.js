export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');

export async function GET(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const result = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM stamps WHERE participant_id = p.id) as stamp_count
       FROM participants p
       WHERE p.hop_id = $1
       ORDER BY p.joined_at DESC`,
      [hop.id]
    );

    return Response.json({ participants: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Get participants error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
