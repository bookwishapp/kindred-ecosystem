export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import db from '../../../lib/db';

async function getSmallThingsStats() {
  const [subscribers, sends, posts] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM subscribers`),
    db.query(`SELECT COUNT(*) as total, MAX(completed_at) as last_send FROM sends`),
    db.query(`SELECT COUNT(*) as total FROM posts WHERE status = 'published' AND is_page = false`),
  ]);
  return {
    total_subscribers: parseInt(subscribers.rows[0].total),
    active_subscribers: parseInt(subscribers.rows[0].active),
    total_sends: parseInt(sends.rows[0].total),
    last_send: sends.rows[0].last_send,
    published_posts: parseInt(posts.rows[0].total),
  };
}

async function getPassportrStats() {
  try {
    const res = await fetch(
      `${process.env.PASSPORTR_BASE_URL}/api/admin/stats`,
      { headers: { 'x-admin-secret': process.env.PASSPORTR_ADMIN_SECRET }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function OverviewPage() {
  const [smallThings, passportr] = await Promise.all([
    getSmallThingsStats(),
    getPassportrStats(),
  ]);

  const sections = [
    {
      title: 'Small Things',
      href: '/admin/small-things/posts',
      stats: smallThings ? [
        { label: 'Active Subscribers', value: smallThings.active_subscribers },
        { label: 'Total Sends', value: smallThings.total_sends },
        { label: 'Published Posts', value: smallThings.published_posts },
        { label: 'Last Send', value: smallThings.last_send ? new Date(smallThings.last_send).toLocaleDateString() : 'Never' },
      ] : null,
    },
    {
      title: 'Passportr',
      href: '/admin/passportr/organizers',
      alert: passportr?.pending_nonprofit_verifications > 0
        ? `${passportr.pending_nonprofit_verifications} nonprofit verification${passportr.pending_nonprofit_verifications > 1 ? 's' : ''} pending`
        : null,
      stats: passportr ? [
        { label: 'Active Organizers', value: passportr.active_organizers },
        { label: 'Total Hops', value: passportr.total_hops },
        { label: 'Participants', value: passportr.total_participants },
        { label: 'Opt-Ins', value: passportr.total_optins ?? '—' },
      ] : null,
    },
    {
      title: 'Kindred',
      href: '/admin/kindred',
      stats: null,
      placeholder: 'Coming soon',
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '40px' }}>Ecosystem Overview</h1>

      <div style={{ display: 'grid', gap: '24px' }}>
        {sections.map(section => (
          <div
            key={section.title}
            style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: section.alert ? '2px solid #f59e0b' : '1px solid #eee',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <a href={section.href} style={{ fontSize: '18px', fontWeight: '600', textDecoration: 'none', color: '#1A1A1A' }}>
                {section.title} →
              </a>
              {section.alert && (
                <span style={{ fontSize: '13px', color: '#92400e', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '6px' }}>
                  ⚠ {section.alert}
                </span>
              )}
            </div>

            {section.stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {section.stats.map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '14px' }}>{section.placeholder || 'No data available'}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
