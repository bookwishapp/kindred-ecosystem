import AdminLayout from '../layout-admin';

export const dynamic = 'force-dynamic';

async function getSmallThingsData() {
  const headers = { 'x-mail-secret': process.env.MAIL_SERVICE_SECRET };

  const [log, stats] = await Promise.allSettled([
    fetch(`${process.env.MAIL_SERVICE_URL}/admin/log?product=terryheath&limit=50`, { headers }).then(r => r.json()),
    fetch(`${process.env.MAIL_SERVICE_URL}/admin/stats`, { headers }).then(r => r.json()),
  ]);

  const allStats = stats.status === 'fulfilled' ? stats.value : [];
  const terryStats = allStats.find(s => s.product === 'terryheath') || null;

  return {
    log: log.status === 'fulfilled' ? log.value : [],
    stats: terryStats,
  };
}

export default async function SmallThingsPage() {
  const { log, stats } = await getSmallThingsData();

  return (
    <AdminLayout>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Small Things</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Terry Heath newsletter send history</p>

      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { label: 'Sent', value: stats.sent },
            { label: 'Failed', value: stats.failed },
            { label: 'Pending', value: stats.pending },
          ].map(s => (
            <div key={s.label} className="card" style={{ minWidth: '140px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{s.label}</p>
              <p style={{ fontSize: '28px', fontWeight: '600' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>To</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '32px' }}>No sends yet.</td></tr>
            )}
            {log.map(row => (
              <tr key={row.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{row.to_email}</td>
                <td>{row.subject}</td>
                <td>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: row.status === 'sent' ? '#E8F7F4' : row.status === 'failed' ? '#FEE' : '#F5F5F5',
                    color: row.status === 'sent' ? '#2AB8A0' : row.status === 'failed' ? '#e55' : 'var(--text-secondary)',
                  }}>{row.status}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {row.sent_at ? new Date(row.sent_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
