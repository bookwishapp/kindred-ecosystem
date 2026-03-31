import db from '../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSubscribers() {
  const result = await db.query(
    `SELECT id, email, first_name, last_name, status, source, subscribed_at
     FROM subscribers
     ORDER BY subscribed_at DESC`
  );
  return result.rows;
}

export default async function SubscribersPage() {
  const subscribers = await getSubscribers();
  const activeCount = subscribers.filter(s => s.status === 'active').length;

  return (
    <div>
      <div className="mb-4">
        <h1>Subscribers</h1>
        <p>{activeCount} active subscriber{activeCount !== 1 ? 's' : ''} out of {subscribers.length} total</p>
      </div>

      {subscribers.length === 0 ? (
        <p>No subscribers yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th>Source</th>
              <th>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td>{subscriber.email}</td>
                <td>
                  {subscriber.first_name || subscriber.last_name
                    ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
                    : '-'}
                </td>
                <td>{subscriber.status}</td>
                <td>{subscriber.source}</td>
                <td>
                  {new Date(subscriber.subscribed_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
