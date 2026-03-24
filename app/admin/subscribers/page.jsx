import db from '../../../lib/db';

async function getSubscribers() {
  const result = await db.query(
    `SELECT id, email, first_name, last_name, status, source, subscribed_at
     FROM subscribers
     ORDER BY subscribed_at DESC`
  );
  return result.rows;
}

async function deleteSubscriber(formData) {
  'use server';
  const id = formData.get('id');
  await db.query('DELETE FROM subscribers WHERE id = $1', [id]);
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
              <th>Actions</th>
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
                <td>
                  <form action={deleteSubscriber} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={subscriber.id} />
                    <button
                      type="submit"
                      className="btn btn-danger btn-small"
                      onClick={(e) => {
                        if (!confirm('Are you sure you want to delete this subscriber?')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}