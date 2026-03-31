export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import SignInForm from './SignInForm';
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');

export default async function ParticipantProfile({ params }) {
  const { userId } = params;

  // Verify cookie matches this userId
  const cookieStore = cookies();
  const token = cookieStore.get('passportr_token')?.value;

  let authenticatedUserId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      authenticatedUserId = decoded.sub;
    } catch {
      // invalid token
    }
  }

  const isOwner = authenticatedUserId === userId;

  if (!isOwner) {
    return (
      <div className="container" style={{ paddingTop: '80px', maxWidth: '500px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Your Passports</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Sign in to view your hop passports.
          </p>
          <SignInForm userId={userId} />
        </div>
      </div>
    );
  }

  // Fetch all participant records for this user
  const result = await db.query(
    `SELECT
      p.*,
      h.name as hop_name,
      h.slug as hop_slug,
      h.start_date,
      h.end_date,
      h.stamp_cutoff_date,
      h.redeem_cutoff_date,
      h.status as hop_status,
      h.banner_url,
      h.logo_url,
      (SELECT COUNT(*) FROM stamps WHERE participant_id = p.id) as stamp_count,
      (SELECT COUNT(*) FROM venues WHERE hop_id = h.id) as venue_count,
      (SELECT COUNT(*) FROM redemptions WHERE participant_id = p.id AND redeemed_at IS NOT NULL) as redemption_count
     FROM participants p
     JOIN hops h ON h.id = p.hop_id
     WHERE p.user_id = $1
     ORDER BY
       CASE WHEN h.redeem_cutoff_date >= CURRENT_DATE THEN 0 ELSE 1 END,
       h.start_date DESC`,
    [userId]
  );

  const participations = result.rows;

  if (participations.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '80px', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>No passports yet</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Scan a QR code at a participating venue to get started.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Your Passports</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {participations.length} hop{participations.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        {participations.map(p => {
          const isActive = p.stamp_cutoff_date >= today && p.hop_status === 'active';
          const isRedeemable = p.redeem_cutoff_date >= today && p.completed_at;
          const isPast = p.redeem_cutoff_date < today;

          return (
            <a
              key={p.id}
              href={`/${userId}/${p.hop_slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                cursor: 'pointer',
                opacity: isPast ? 0.7 : 1,
                borderLeft: isActive ? '4px solid var(--accent-teal)' : isPast ? '4px solid #ddd' : '4px solid #f0c040'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {p.logo_url && (
                    <img
                      src={p.logo_url}
                      alt={p.hop_name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '18px' }}>{p.hop_name}</h2>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? '#E8F7F4' : isRedeemable ? '#fff3cd' : '#f5f5f5',
                        color: isActive ? 'var(--accent-teal)' : isRedeemable ? '#856404' : '#999',
                        fontWeight: '500',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}>
                        {isActive ? 'Stamping' : isRedeemable ? 'Redeem Rewards' : 'Ended'}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                    </p>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      <span style={{ color: p.stamp_count > 0 ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                        {p.stamp_count} of {p.venue_count} stamped
                      </span>
                      {p.completed_at && (
                        <span style={{ color: 'var(--accent-teal)', fontWeight: '500' }}>
                          ✓ Completed
                        </span>
                      )}
                      {p.redemption_count > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {p.redemption_count} redeemed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
