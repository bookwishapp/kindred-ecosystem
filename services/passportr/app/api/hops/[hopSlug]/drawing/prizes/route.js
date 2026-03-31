export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

export async function PUT(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;
    const { prizes } = await req.json();

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Replace all prizes for this hop
    await db.query('DELETE FROM drawing_prizes WHERE hop_id = $1', [hop.id]);

    for (let i = 0; i < prizes.length; i++) {
      await db.query(
        'INSERT INTO drawing_prizes (hop_id, label, sort_order) VALUES ($1, $2, $3)',
        [hop.id, prizes[i].label, i]
      );
    }

    const result = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );

    return Response.json({ prizes: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing prizes PUT error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
