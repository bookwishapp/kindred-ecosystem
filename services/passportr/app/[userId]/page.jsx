export const runtime = 'nodejs';

const db = require('../../lib/db');

export default async function UserPassportHistory({ params }) {
  const { username } = params;

  // Get all participants for this user
  const participantsResult = await db.query(
    `SELECT p.*, h.name as hop_name, h.slug as hop_slug, h.start_date, h.end_date
    FROM participants p
    JOIN hops h ON p.hop_id = h.id
    WHERE p.username = $1
    ORDER BY p.joined_at DESC`,
    [username]
  );

  const participants = participantsResult.rows;

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>
        {username}'s Passports
      </h1>

      {participants.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No hops yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {participants.map(participant => (
            <a key={participant.id} href={`/${username}/${participant.hop_slug}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{participant.hop_name}</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {new Date(participant.start_date).toLocaleDateString()} - {new Date(participant.end_date).toLocaleDateString()}
                </p>
                {participant.completed_at && (
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: 'var(--accent-teal)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Completed ✓
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
