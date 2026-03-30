export const runtime = 'nodejs';

const db = require('../../../../../lib/db');

export async function GET(req, { params }) {
  try {
    const { token } = params;
    const result = await db.query(
      `SELECT vi.*, h.name as hop_name
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       WHERE vi.token = $1 AND vi.status = 'pending'`,
      [token]
    );
    if (result.rows.length === 0) return Response.json({ error: 'Invalid' }, { status: 404 });
    return Response.json({ invitation: result.rows[0] });
  } catch (error) {
    console.error('Setup GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
