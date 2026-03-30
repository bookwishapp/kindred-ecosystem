export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { generateToken } = require('../../../../lib/tokens');

export async function POST(req) {
  try {
    const { token, name, address, description, reward_description } = await req.json();

    if (!token || !name) return Response.json({ error: 'token and name required' }, { status: 400 });

    const invResult = await db.query(
      `SELECT vi.*, h.id as hop_id
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       WHERE vi.token = $1 AND vi.status = 'pending'`,
      [token]
    );
    if (invResult.rows.length === 0) return Response.json({ error: 'Invalid or already used' }, { status: 400 });

    const invitation = invResult.rows[0];
    const stampToken = generateToken();
    const redeemToken = generateToken();

    const countResult = await db.query(
      'SELECT COUNT(*) as c FROM venues WHERE hop_id = $1',
      [invitation.hop_id]
    );
    const sortOrder = parseInt(countResult.rows[0].c);

    await db.query(
      `INSERT INTO venues (hop_id, name, address, description, reward_description, stamp_token, redeem_token, required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)`,
      [invitation.hop_id, name, address, description, reward_description, stampToken, redeemToken, sortOrder]
    );

    await db.query(
      `UPDATE venue_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    return Response.json({ stamp_token: stampToken });
  } catch (error) {
    console.error('Venue setup POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
