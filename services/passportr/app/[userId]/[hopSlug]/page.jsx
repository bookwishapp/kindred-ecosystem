export const runtime = 'nodejs';

const db = require('../../../lib/db');

export default async function PassportPage({ params }) {
  const { userId, hopSlug } = params;

  // Get hop
  const hopResult = await db.query(
    'SELECT * FROM hops WHERE slug = $1',
    [hopSlug]
  );

  if (hopResult.rows.length === 0) {
    return <div className="container"><h1>Hop not found</h1></div>;
  }

  const hop = hopResult.rows[0];

  // Get participant
  const participantResult = await db.query(
    'SELECT * FROM participants WHERE hop_id = $1 AND user_id = $2',
    [hop.id, userId]
  );

  if (participantResult.rows.length === 0) {
    return <div className="container"><h1>Participant not found</h1></div>;
  }

  const participant = participantResult.rows[0];

  // Get all venues
  const venuesResult = await db.query(
    'SELECT * FROM venues WHERE hop_id = $1 ORDER BY sort_order',
    [hop.id]
  );
  const venues = venuesResult.rows;

  // Get stamps
  const stampsResult = await db.query(
    'SELECT venue_id FROM stamps WHERE participant_id = $1',
    [participant.id]
  );
  const stampedVenueIds = stampsResult.rows.map(s => s.venue_id);

  const redemptionsResult = await db.query(
    'SELECT venue_id FROM redemptions WHERE participant_id = $1 AND redeemed_at IS NOT NULL',
    [participant.id]
  );
  const redeemedVenueIds = redemptionsResult.rows.map(r => r.venue_id);

  const isCompleted = participant.completed_at !== null;
  const stampedCount = stampedVenueIds.length;

  function getCompletionText(rule, totalVenues) {
    if (rule.type === 'all') {
      return `Visit all ${totalVenues} venues and earn rewards at each one.`;
    }
    if (rule.type === 'percentage' || rule.type === 'minimum') {
      const required = rule.type === 'percentage'
        ? Math.ceil(totalVenues * (rule.percent / 100))
        : rule.count;
      return `Visit ${required} of ${totalVenues} venues to earn rewards at each visited.`;
    }
  }
  const completionRule = hop.completion_rule || { type: 'all' };
  const completionText = getCompletionText(completionRule, venues.length);

  return (
    <div className="container" style={{ maxWidth: '600px', paddingTop: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{hop.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {new Date(hop.start_date).toLocaleDateString()} - {new Date(hop.end_date).toLocaleDateString()}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Progress</h2>
        <p style={{ fontSize: '24px', fontWeight: '600', color: 'var(--accent-teal)', marginBottom: '16px' }}>
          {stampedCount} of {venues.length} venues stamped
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {venues.map(venue => {
            const isStamped = stampedVenueIds.includes(venue.id);
            return (
              <div
                key={venue.id}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: `2px solid ${isStamped ? 'var(--accent-teal)' : '#ddd'}`,
                  backgroundColor: isStamped ? 'var(--accent-teal)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: 'white'
                }}
              >
                {isStamped ? '✓' : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Venues</h2>
        {venues.map(venue => {
          const isStamped = stampedVenueIds.includes(venue.id);
          return (
            <div key={venue.id} className="card" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${isStamped ? 'var(--accent-teal)' : '#ddd'}`,
                    backgroundColor: isStamped ? 'var(--accent-teal)' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    color: 'white',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  {isStamped ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{venue.name}</h3>
                  {venue.address && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {venue.address}
                    </p>
                  )}
                  {venue.hours && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      🕐 {venue.hours}
                    </p>
                  )}
                  {isStamped && !redeemedVenueIds.includes(venue.id) && (
                    <p style={{ fontSize: '14px', color: 'var(--accent-teal)', fontWeight: '500' }}>
                      Stamped ✓
                    </p>
                  )}
                  {redeemedVenueIds.includes(venue.id) && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      Redeemed ✓
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isCompleted && (
        <div className="card" style={{ backgroundColor: '#E8F7F4', borderColor: 'var(--accent-teal)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>
            You've completed the hop! 🎉
          </h2>
          <p style={{ marginBottom: '16px' }}>Redeem your rewards at these venues:</p>
          {venues.filter(venue => stampedVenueIds.includes(venue.id)).map(venue => (
            venue.reward_description && (
              <div key={venue.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{venue.name}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {venue.reward_description}
                </p>
                {redeemedVenueIds.includes(venue.id) ? (
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Redeemed ✓
                  </p>
                ) : (
                  <a href={`/redeem/${venue.redeem_token}`}>
                    <button style={{ padding: '8px 16px', fontSize: '14px' }}>
                      Redeem
                    </button>
                  </a>
                )}
              </div>
            )
          ))}
        </div>
      )}

      {!isCompleted && (
        <div className="card" style={{ backgroundColor: '#f9f9f9', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {completionText}
          </p>
        </div>
      )}
    </div>
  );
}
