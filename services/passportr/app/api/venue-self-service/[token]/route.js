export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const QRCode = require('qrcode');

export async function GET(req, { params }) {
  try {
    const { token } = params;

    const venueResult = await db.query(
      'SELECT * FROM venues WHERE stamp_token = $1',
      [token]
    );
    if (venueResult.rows.length === 0) {
      return Response.json({ error: 'Venue not found' }, { status: 404 });
    }

    const venue = venueResult.rows[0];
    const hopResult = await db.query('SELECT * FROM hops WHERE id = $1', [venue.hop_id]);
    const hop = hopResult.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const redemptionResult = await db.query(
      `SELECT COUNT(*) as count FROM redemptions
       WHERE venue_id = $1 AND DATE(generated_at) = $2 AND redeemed_at IS NOT NULL`,
      [venue.id, today]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const stampQR = await QRCode.toDataURL(`${baseUrl}/stamp/${venue.stamp_token}`, { width: 300, margin: 2 });
    const redeemQR = await QRCode.toDataURL(`${baseUrl}/redeem/${venue.redeem_token}`, { width: 300, margin: 2 });

    return Response.json({
      venue,
      hop,
      redemption_count: parseInt(redemptionResult.rows[0].count),
      stamp_qr: stampQR,
      redeem_qr: redeemQR,
    });
  } catch (error) {
    console.error('Venue self-service GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
