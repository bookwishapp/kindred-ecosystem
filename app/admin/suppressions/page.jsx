import db from '../../../lib/db';

async function getSuppressions() {
  const result = await db.query(
    `SELECT id, email, reason, suppressed_at
     FROM suppressions
     ORDER BY suppressed_at DESC`
  );
  return result.rows;
}

export default async function SuppressionsPage() {
  const suppressions = await getSuppressions();

  return (
    <div>
      <div className="mb-4">
        <h1>Suppressions</h1>
        <p>{suppressions.length} suppressed email{suppressions.length !== 1 ? 's' : ''}</p>
      </div>

      {suppressions.length === 0 ? (
        <p>No suppressions.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {suppressions.map((suppression) => (
              <tr key={suppression.id}>
                <td>{suppression.email}</td>
                <td>{suppression.reason}</td>
                <td>
                  {new Date(suppression.suppressed_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}