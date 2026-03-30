export const runtime = 'nodejs';

const db = require('../../../lib/db');

export default async function PublicHopLanding({ params }) {
  const { hopSlug } = params;

  // Get hop
  const hopResult = await db.query(
    'SELECT * FROM hops WHERE slug = $1',
    [hopSlug]
  );

  if (hopResult.rows.length === 0) {
    return <div className="container"><h1>Hop not found</h1></div>;
  }

  const hop = hopResult.rows[0];

  // Get venues
  const venuesResult = await db.query(
    'SELECT * FROM venues WHERE hop_id = $1 ORDER BY sort_order',
    [hop.id]
  );

  const venues = venuesResult.rows;

  // Generate dynamic completion text based on rule
  const completionRule = hop.completion_rule || { type: 'all' };
  let completionText = '';

  if (completionRule.type === 'all') {
    completionText = `Visit all ${venues.length} venues and earn rewards at each one.`;
  } else if (completionRule.type === 'percentage') {
    const required = Math.ceil(venues.length * (completionRule.percent / 100));
    completionText = `Visit ${required} of ${venues.length} venues and earn rewards at each one.`;
  } else if (completionRule.type === 'minimum') {
    completionText = `Visit any ${completionRule.count} of ${venues.length} venues and earn rewards at each one.`;
  } else if (completionRule.type === 'required_plus') {
    const requiredCount = completionRule.required?.length || 0;
    const optionalCount = completionRule.minimum_optional || 0;
    completionText = `Visit ${requiredCount + optionalCount} venues (${requiredCount} required) and earn rewards at each one.`;
  } else {
    completionText = `Visit ${venues.length} venues, collect stamps, and earn rewards!`;
  }

  return (
    <div className="container" style={{ paddingTop: '60px', maxWidth: '700px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '16px' }}>{hop.name}</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {new Date(hop.start_date).toLocaleDateString()} - {new Date(hop.end_date).toLocaleDateString()}
        </p>
        {hop.description && (
          <p style={{ fontSize: '16px', marginTop: '24px', lineHeight: '1.6' }}>
            {hop.description}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: '32px', textAlign: 'center', padding: '32px', backgroundColor: '#E8F7F4' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--accent-teal)' }}>
          Join the Hop
        </h2>
        <p style={{ marginBottom: '24px' }}>
          {completionText}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Scan QR codes at each venue to get started. You'll create your passport when you collect your first stamp.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Participating Venues</h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {venues.map((venue, index) => (
            <div key={venue.id} className="card">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-teal)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{venue.name}</h3>
                  {venue.address && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {venue.address}
                    </p>
                  )}
                  {venue.description && (
                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                      {venue.description}
                    </p>
                  )}
                  {venue.reward_description && (
                    <p style={{ fontSize: '14px', color: 'var(--accent-teal)', fontWeight: '500' }}>
                      🎁 {venue.reward_description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', backgroundColor: '#f9f9f9' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Stamps must be collected by {new Date(hop.stamp_cutoff_date).toLocaleDateString()}.<br />
          Rewards can be redeemed until {new Date(hop.redeem_cutoff_date).toLocaleDateString()}.
        </p>
      </div>
    </div>
  );
}
