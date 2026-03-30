export const runtime = 'nodejs';

const db = require('../../../lib/db');
const QRCode = require('qrcode');
import PrintButton from '../PrintButton';

export default async function VenuePage({ params }) {
  const { token } = params;

  // Look up venue by stamp_token (could be stamp or redeem)
  let venueResult = await db.query(
    'SELECT * FROM venues WHERE stamp_token = $1 OR redeem_token = $1',
    [token]
  );

  if (venueResult.rows.length === 0) {
    return <div className="container"><h1>Venue not found</h1></div>;
  }

  const venue = venueResult.rows[0];

  // Get hop
  const hopResult = await db.query(
    'SELECT * FROM hops WHERE id = $1',
    [venue.hop_id]
  );

  const hop = hopResult.rows[0];

  // Get redemption count for today
  const today = new Date().toISOString().split('T')[0];
  const redemptionResult = await db.query(
    `SELECT COUNT(*) as count
    FROM redemptions
    WHERE venue_id = $1
    AND DATE(generated_at) = $2
    AND redeemed_at IS NOT NULL`,
    [venue.id, today]
  );

  const redemptionCount = redemptionResult.rows[0].count;

  // Generate QR codes
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
  const stampUrl = `${baseUrl}/stamp/${venue.stamp_token}`;
  const redeemUrl = `${baseUrl}/redeem/${venue.redeem_token}`;

  const stampQR = await QRCode.toDataURL(stampUrl, { width: 300, margin: 2 });
  const redeemQR = await QRCode.toDataURL(redeemUrl, { width: 300, margin: 2 });

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '900px' }}>
        <div className="no-print" style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{venue.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {hop.name}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Today's redemptions: <strong>{redemptionCount}</strong>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>
              Stamp QR Code
            </h2>
            <img src={stampQR} alt="Stamp QR Code" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', fontFamily: 'monospace' }}>
              {venue.stamp_token}
            </p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Scan to collect stamp
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>
              Redeem QR Code
            </h2>
            <img src={redeemQR} alt="Redeem QR Code" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', fontFamily: 'monospace' }}>
              {venue.redeem_token}
            </p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Scan to redeem reward
            </p>
          </div>
        </div>

        {venue.reward_description && (
          <div className="card no-print" style={{ marginBottom: '32px', backgroundColor: '#E8F7F4' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Reward</h3>
            <p style={{ fontSize: '18px', fontWeight: '500', color: 'var(--accent-teal)' }}>
              {venue.reward_description}
            </p>
          </div>
        )}

        <div className="no-print" style={{ textAlign: 'center' }}>
          <PrintButton />
        </div>
      </div>
  );
}
