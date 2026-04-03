import AdminLayout from '../layout-admin';

export default function KindredPage() {
  return (
    <AdminLayout>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Kindred</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Subscriber management — coming soon.</p>
      <div className="card" style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '48px' }}>
        Kindred opt-in launches in the next iteration.
      </div>
    </AdminLayout>
  );
}
