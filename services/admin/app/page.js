import AdminLayout from './layout-admin';

export const dynamic = 'force-dynamic';

async function getStats() {
  const headers = { 'x-mail-secret': process.env.MAIL_SERVICE_SECRET };
  const passportHeaders = { 'Authorization': `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}` };

  const [mailStats, passportrStats] = await Promise.allSettled([
    fetch(`${process.env.MAIL_SERVICE_URL}/admin/stats`, { headers }).then(r => r.json()),
    fetch(`${process.env.PASSPORTR_BASE_URL}/api/admin/stats`, { headers: passportHeaders }).then(r => r.json()),
  ]);

  return {
    mail: mailStats.status === 'fulfilled' ? mailStats.value : null,
    passportr: passportrStats.status === 'fulfilled' ? passportrStats.value : null,
  };
}

export default async function OverviewPage() {
  const stats = await getStats();

  return (
    <AdminLayout>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '32px' }}>Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {stats.mail && stats.mail.map(row => (
          <div key={row.product} className="card">
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{row.product}</p>
            <p style={{ fontSize: '28px', fontWeight: '600' }}>{row.sent}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '4px' }}>emails sent</p>
          </div>
        ))}
        {stats.passportr && (
          <div className="card">
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Passportr</p>
            <p style={{ fontSize: '28px', fontWeight: '600' }}>{stats.passportr.organizer_count ?? '—'}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '4px' }}>organizers</p>
          </div>
        )}
      </div>

      {(!stats.mail && !stats.passportr) && (
        <p style={{ color: 'var(--text-faint)' }}>No stats available.</p>
      )}
    </AdminLayout>
  );
}
