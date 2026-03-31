export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');
const { randomBytes } = require('crypto');

export async function POST(req) {
  try {
    const user = requireAuth(req);
    const { hop_id, zip_code, opt_in = true } = await req.json();

    const unsubscribeToken = randomBytes(20).toString('hex');

    await db.query(
      `INSERT INTO participant_preferences (user_id, email, zip_code, opt_in, opted_in_hop_id, unsubscribe_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET opt_in = EXCLUDED.opt_in,
           zip_code = COALESCE(EXCLUDED.zip_code, participant_preferences.zip_code),
           opted_in_hop_id = COALESCE(EXCLUDED.opted_in_hop_id, participant_preferences.opted_in_hop_id)`,
      [user.sub, user.email, zip_code || null, opt_in, hop_id || null, unsubscribeToken]
    );

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Opt-in error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
