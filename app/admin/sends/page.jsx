import db from '../../../lib/db';

async function getSends() {
  const result = await db.query(
    `SELECT s.*, p.title as post_title
     FROM sends s
     LEFT JOIN posts p ON s.post_id = p.id
     ORDER BY s.created_at DESC`
  );
  return result.rows;
}

export default async function SendsPage() {
  const sends = await getSends();

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'badge-gray',
      'queued': 'badge-blue',
      'sending': 'badge-yellow',
      'complete': 'badge-green',
      'failed': 'badge-red',
    };
    return statusClasses[status] || 'badge-gray';
  };

  return (
    <div>
      <h1>Newsletter Sends</h1>

      {sends.length === 0 ? (
        <p>No newsletter sends yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Post</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Recipients</th>
              <th>Sent</th>
              <th>Started</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {sends.map((send) => (
              <tr key={send.id}>
                <td>{send.post_title || '-'}</td>
                <td>{send.subject}</td>
                <td>
                  <span className={`badge ${getStatusBadge(send.status)}`}>
                    {send.status}
                  </span>
                </td>
                <td>{send.recipient_count || 0}</td>
                <td>{send.sent_count || 0}</td>
                <td>
                  {send.started_at
                    ? new Date(send.started_at).toLocaleString()
                    : '-'}
                </td>
                <td>
                  {send.completed_at
                    ? new Date(send.completed_at).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style jsx>{`
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-gray {
          background: #e5e7eb;
          color: #374151;
        }
        .badge-blue {
          background: #dbeafe;
          color: #1e40af;
        }
        .badge-yellow {
          background: #fef3c7;
          color: #92400e;
        }
        .badge-green {
          background: #d1fae5;
          color: #065f46;
        }
        .badge-red {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
}