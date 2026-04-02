export const runtime = 'nodejs';

const db = require('../../../../../lib/db');

export async function GET(req, { params }) {
  try {
    const { token } = params;
    const result = await db.query(
      `SELECT vi.*, h.name as hop_name, v.stamp_token as existing_stamp_token
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       LEFT JOIN venues v ON v.invitation_id = vi.id
       WHERE vi.token = $1`,
      [token]
    );
    if (result.rows.length === 0) return Response.json({ error: 'Invalid' }, { status: 404 });

    const invitation = result.rows[0];

    // If already accepted and venue exists, return redirect info
    if (invitation.status === 'accepted' && invitation.existing_stamp_token) {
      return Response.json({
        invitation,
        redirect: `/venue/${invitation.existing_stamp_token}`
      });
    }

    return Response.json({ invitation });
  } catch (error) {
    console.error('Setup GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
