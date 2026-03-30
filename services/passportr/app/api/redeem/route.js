export const runtime = 'nodejs';

const db = require('../../../lib/db');
const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../../../lib/tokens');

export async function POST(req) {
  try {
    const { redeem_token } = await req.json();

    if (!redeem_token) {
      return Response.json({ error: 'Missing redeem_token' }, { status: 400 });
    }

    // Get user from cookie
    const cookies = parse(req.headers.get('cookie') || '');
    const token = cookies.passportr_token;

    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Look up venue by redeem_token
    const venueResult = await db.query(
      'SELECT * FROM venues WHERE redeem_token = $1',
      [redeem_token]
    );

    if (venueResult.rows.length === 0) {
      return Response.json({ error: 'Invalid redeem token' }, { status: 404 });
    }

    const venue = venueResult.rows[0];

    // Get hop details
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE id = $1',
      [venue.hop_id]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];

    // Verify today is before redeem_cutoff_date
    const today = new Date().toISOString().split('T')[0];
    if (today > hop.redeem_cutoff_date) {
      return Response.json({ error: 'Redemption period has ended' }, { status: 400 });
    }

    // Get participant
    const participantResult = await db.query(
      'SELECT * FROM participants WHERE hop_id = $1 AND user_id = $2',
      [hop.id, user.userId]
    );

    if (participantResult.rows.length === 0) {
      return Response.json({ error: 'You have not joined this hop' }, { status: 404 });
    }

    const participant = participantResult.rows[0];

    // Verify participant has completed the hop
    if (!participant.completed_at) {
      return Response.json({ error: 'Complete the hop first' }, { status: 400 });
    }

    // Check if coupon already exists
    let redemptionResult = await db.query(
      'SELECT * FROM redemptions WHERE participant_id = $1 AND venue_id = $2',
      [participant.id, venue.id]
    );

    let redemption;
    if (redemptionResult.rows.length === 0) {
      // Generate new coupon
      const couponCode = generateToken();
      const expiresAt = new Date(Date.now() + (hop.coupon_expiry_minutes * 60 * 1000));

      const insertResult = await db.query(
        'INSERT INTO redemptions (participant_id, venue_id, coupon_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [participant.id, venue.id, couponCode, expiresAt]
      );
      redemption = insertResult.rows[0];
    } else {
      redemption = redemptionResult.rows[0];
    }

    return Response.json({
      coupon_code: redemption.coupon_code,
      expires_at: redemption.expires_at,
      reward_description: venue.reward_description,
      venue_name: venue.name,
      redeemed_at: redemption.redeemed_at
    });

  } catch (error) {
    console.error('Redeem error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
