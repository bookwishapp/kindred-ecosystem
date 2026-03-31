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

    const [organizers, hops, participants, stamps, redemptions] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM organizer_profiles WHERE status = $1', ['active']),
      db.query('SELECT COUNT(*) as count FROM hops'),
      db.query('SELECT COUNT(*) as count FROM participants'),
      db.query('SELECT COUNT(*) as count FROM stamps'),
      db.query('SELECT COUNT(*) as count FROM redemptions WHERE redeemed_at IS NOT NULL'),
    ]);

    const nonprofit = await db.query(
      'SELECT COUNT(*) as count FROM organizer_profiles WHERE nonprofit_pending = true AND nonprofit_verified = false'
    );

    return Response.json({
      active_organizers: parseInt(organizers.rows[0].count),
      total_hops: parseInt(hops.rows[0].count),
      total_participants: parseInt(participants.rows[0].count),
      total_stamps: parseInt(stamps.rows[0].count),
      total_redemptions: parseInt(redemptions.rows[0].count),
      pending_nonprofit_verifications: parseInt(nonprofit.rows[0].count),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
