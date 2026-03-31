'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function PaywallModal({ profile, onClose }) {
  const [loading, setLoading] = useState(false);

  async function selectPlan(priceKey) {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ price_key: priceKey }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
    } catch { setLoading(false); }
  }

  const creditAmount = profile?.plan === 'single' && !profile?.single_hop_credited
    ? (profile.tier === 1 ? 49 : 79)
    : null;

  const upgradePlans = profile?.plan === 'single' ? [
    { key: `tier${profile.tier}_occasional`, name: 'Occasional', price: profile.tier === 1 ? 79 : 129, hops: 'Up to 3 hops/year' },
    { key: `tier${profile.tier}_regular`,    name: 'Regular',    price: profile.tier === 1 ? 129 : 189, hops: 'Up to 12 hops/year' },
    { key: `tier${profile.tier}_unlimited`,  name: 'Unlimited',  price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ] : profile?.plan === 'occasional' ? [
    { key: `tier${profile.tier}_regular`,   name: 'Regular',   price: profile.tier === 1 ? 129 : 189, hops: 'Up to 12 hops/year' },
    { key: `tier${profile.tier}_unlimited`, name: 'Unlimited', price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ] : [
    { key: `tier${profile.tier}_unlimited`, name: 'Unlimited', price: profile.tier === 1 ? 179 : 249, hops: 'Unlimited hops' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Hop Limit Reached</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          You've used all {profile?.plan === 'single' ? '1' : profile?.plan === 'occasional' ? '3' : '12'} hop{profile?.plan !== 'single' ? 's' : ''} included in your current plan. Upgrade to create more hops.
        </p>

        {creditAmount && (
          <div style={{ backgroundColor: '#E8F7F4', borderRadius: '8px', padding: '12px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--accent-teal)', fontSize: '14px', fontWeight: '500' }}>
              Your ${creditAmount} single hop credit will be applied automatically.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {upgradePlans.map(plan => (
            <div key={plan.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #eee', borderRadius: '8px' }}>
              <div>
                <p style={{ fontWeight: '500', marginBottom: '2px' }}>{plan.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{plan.hops}</p>
                {creditAmount && (
                  <p style={{ fontSize: '12px', color: 'var(--accent-teal)' }}>
                    After credit: ${plan.price - creditAmount}/first year
                  </p>
                )}
              </div>
              <button
                onClick={() => selectPlan(plan.key)}
                disabled={loading}
                style={{ fontSize: '14px', padding: '8px 20px' }}
              >
                ${plan.price}/yr
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', backgroundColor: 'var(--text-secondary)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function OrganizeDashboard() {
  const [hops, setHops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchHops();
  }, []);

  async function fetchHops() {
    try {
      const response = await fetch('/api/hops', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setHops(data.hops);

        // Fetch organizer profile for paywall
        const profileRes = await fetch('/api/organizer/profile', { credentials: 'include' });
        if (profileRes.ok) {
          const pd = await profileRes.json();
          setOrganizerProfile(pd.profile);
        }
      } else if (response.status === 401) {
        // Not authenticated - redirect to login
        router.push('/organize/login');
        return;
      } else if (response.status === 403) {
        // Organizer access denied
        setAccessDenied(true);
      } else {
        // Other error - show empty state
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch hops:', err);
      setLoading(false);
    }
  }

  async function createHop(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch('/api/hops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slug: formData.get('slug'),
          name: formData.get('name'),
          description: formData.get('description'),
          start_date: formData.get('start_date'),
          end_date: formData.get('end_date'),
          stamp_cutoff_date: formData.get('stamp_cutoff_date'),
          redeem_cutoff_date: formData.get('redeem_cutoff_date'),
          coupon_expiry_minutes: parseInt(formData.get('coupon_expiry_minutes') || '30')
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateForm(false);
        router.push(`/organize/${data.hop.slug}`);
      } else {
        const errData = await response.json();
        if (errData.code === 'HOP_LIMIT_REACHED') {
          setShowPaywall(true);
        } else {
          alert('Failed to create hop');
        }
      }
    } catch (err) {
      console.error('Failed to create hop:', err);
      alert('Network error');
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Start Running Hops</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
            Replace paper passports with digital ones. No app required for participants — they just scan and go.
          </p>
          <a href="/organize/signup">
            <button style={{ width: '100%' }}>Get Started →</button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px' }}>Your Hops</h1>
        <button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New Hop'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Create a New Hop</h2>
          <form onSubmit={createHop}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Hop Name
              </label>
              <input type="text" name="name" required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                URL Slug
              </label>
              <input type="text" name="slug" required placeholder="e.g., summer-hop-2024" />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Used in URLs: passportr.io/hop/your-slug
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Description
              </label>
              <textarea name="description" rows="3" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Start Date
                </label>
                <input type="date" name="start_date" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  End Date
                </label>
                <input type="date" name="end_date" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Stamp Cutoff Date
                </label>
                <input type="date" name="stamp_cutoff_date" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                  Redeem Cutoff Date
                </label>
                <input type="date" name="redeem_cutoff_date" required />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Coupon Expiry (minutes)
              </label>
              <input type="number" name="coupon_expiry_minutes" defaultValue="30" min="1" />
            </div>

            <button type="submit">Create Hop</button>
          </form>
        </div>
      )}

      {hops.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
            No hops yet. Create your first one!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {hops.map(hop => (
            <a key={hop.id} href={`/organize/${hop.slug}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '20px' }}>{hop.name}</h2>
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: hop.status === 'active' ? 'var(--accent-teal)' : '#ccc',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {hop.status}
                  </span>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {new Date(hop.start_date).toLocaleDateString()} - {new Date(hop.end_date).toLocaleDateString()}
                </p>

                <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                  <span>{hop.venue_count} venues</span>
                  <span>{hop.participant_count} participants</span>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: '500' }}>
                    {hop.completion_count} completed
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {showPaywall && (
        <PaywallModal
          profile={organizerProfile}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}
