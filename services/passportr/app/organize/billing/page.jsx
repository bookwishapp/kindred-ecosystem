'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PLAN_LABELS = {
  single_tier1:     'Single Hop',
  single_tier2:     'Single Hop',
  occasional_tier1: 'Occasional',
  occasional_tier2: 'Occasional',
  regular_tier1:    'Regular',
  regular_tier2:    'Regular',
  unlimited_tier1:  'Unlimited',
  unlimited_tier2:  'Unlimited',
};

const HOP_LIMITS = {
  single_tier1:     1,
  single_tier2:     1,
  occasional_tier1: 3,
  occasional_tier2: 3,
  regular_tier1:    12,
  regular_tier2:    12,
  unlimited_tier1:  null,
  unlimited_tier2:  null,
};

export default function BillingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/organizer/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.profile) {
          router.push('/organize/signup');
          return;
        }
        setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        credentials: 'include',
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert('Failed to open billing portal');
    } catch { alert('Network error'); }
    setPortalLoading(false);
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (!profile) return null;

  const hopLimit = HOP_LIMITS[profile.plan];
  const hopsRemaining = hopLimit !== null ? hopLimit - (profile.hops_used_this_period || 0) : null;

  const singleExpired = profile.plan?.startsWith('single') &&
    profile.single_hop_expires_at &&
    new Date(profile.single_hop_expires_at) < new Date();

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '600px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/organize" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>← Back to dashboard</a>
      </div>

      <h1 style={{ fontSize: '32px', marginBottom: '32px' }}>Billing</h1>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Current Plan</h2>
        <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Plan</span>
            <span style={{ fontWeight: '500' }}>
              {PLAN_LABELS[profile.plan] || 'None'} — Tier {profile.tier}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status</span>
            <span style={{
              fontWeight: '500',
              color: profile.subscription_status === 'active' ? 'var(--accent-teal)'
                : profile.subscription_status === 'past_due' ? '#e55'
                : 'var(--text-secondary)'
            }}>
              {profile.subscription_status === 'active' ? 'Active'
                : profile.subscription_status === 'past_due' ? 'Past Due'
                : profile.subscription_status === 'canceled' ? 'Canceled'
                : 'Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Venue limit per hop</span>
            <span style={{ fontWeight: '500' }}>
              {profile.tier === 1 ? 'Up to 10' : 'Unlimited'}
            </span>
          </div>
          {hopLimit !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Hops this period</span>
              <span style={{ fontWeight: '500' }}>
                {profile.hops_used_this_period} of {hopLimit} used
                {hopsRemaining !== null && hopsRemaining <= 1 && (
                  <span style={{ color: '#e55', marginLeft: '8px' }}>
                    ({hopsRemaining === 0 ? 'None remaining' : '1 remaining'})
                  </span>
                )}
              </span>
            </div>
          )}
          {profile.plan?.startsWith('single') && profile.single_hop_expires_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Expires</span>
              <span style={{ fontWeight: '500', color: singleExpired ? '#e55' : undefined }}>
                {new Date(profile.single_hop_expires_at).toLocaleDateString()}
                {singleExpired && ' (Expired)'}
              </span>
            </div>
          )}
          {profile.period_start && !profile.plan?.startsWith('single') && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Period started</span>
              <span style={{ fontWeight: '500' }}>
                {new Date(profile.period_start).toLocaleDateString()}
              </span>
            </div>
          )}
          {profile.nonprofit_verified && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Nonprofit</span>
              <span style={{ fontWeight: '500', color: 'var(--accent-teal)' }}>✓ Verified</span>
            </div>
          )}
          {profile.nonprofit_pending && !profile.nonprofit_verified && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Nonprofit</span>
              <span style={{ fontWeight: '500', color: '#856404' }}>Verification pending</span>
            </div>
          )}
        </div>
      </div>

      {profile.stripe_customer_id && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Manage Subscription</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Update your payment method, view invoices, or cancel your subscription.
          </p>
          <button onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? 'Opening...' : 'Open Billing Portal'}
          </button>
        </div>
      )}

      {(profile.subscription_status !== 'active' || profile.plan?.startsWith('single')) && (
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Upgrade Plan</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {profile.plan?.startsWith('single')
              ? 'Subscribe to run more hops. Your single hop purchase will be credited.'
              : 'Choose a plan to get started.'}
          </p>
          <button onClick={() => router.push('/organize/signup')}>
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
