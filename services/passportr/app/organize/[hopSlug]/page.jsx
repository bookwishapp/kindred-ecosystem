'use client';

import { useEffect, useState } from 'react';

export default function ManageHop({ params }) {
  const { hopSlug } = params;
  const [hop, setHop] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (!accessDenied) {
      fetchHop();
      fetchVenues();
    }
  }, [hopSlug, accessDenied]);

  async function checkAccess() {
    try {
      const response = await fetch('/api/hops', {
        credentials: 'include'
      });

      if (response.status === 403) {
        setAccessDenied(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to check access:', err);
    }
  }

  async function fetchHop() {
    try {
      const response = await fetch(`/api/hops/${hopSlug}`);
      if (response.ok) {
        const data = await response.json();
        setHop(data.hop);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch hop:', err);
      setLoading(false);
    }
  }

  async function fetchVenues() {
    try {
      const response = await fetch(`/api/hops/${hopSlug}/venues`);
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues);
      }
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    }
  }

  async function addVenue(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const response = await fetch(`/api/hops/${hopSlug}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.get('name'),
          address: formData.get('address'),
          description: formData.get('description'),
          reward_description: formData.get('reward_description'),
          required: formData.get('required') === 'on',
          sort_order: venues.length
        })
      });

      if (response.ok) {
        setShowAddVenue(false);
        fetchVenues();
        e.target.reset();
      } else {
        alert('Failed to add venue');
      }
    } catch (err) {
      console.error('Failed to add venue:', err);
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
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Organizer Access Required</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            This area is currently available to authorized organizers only.
            If you believe you should have access, please contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!hop) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <h1>Hop not found</h1>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/organize" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          ← Back to dashboard
        </a>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{hop.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {new Date(hop.start_date).toLocaleDateString()} - {new Date(hop.end_date).toLocaleDateString()}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Hop Details</h2>
        <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
          <div>
            <strong>Status:</strong> {hop.status}
          </div>
          <div>
            <strong>Public URL:</strong>{' '}
            <a href={`/hop/${hop.slug}`} target="_blank">
              {process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io'}/hop/{hop.slug}
            </a>
          </div>
          <div>
            <strong>Stamp Cutoff:</strong> {new Date(hop.stamp_cutoff_date).toLocaleDateString()}
          </div>
          <div>
            <strong>Redeem Cutoff:</strong> {new Date(hop.redeem_cutoff_date).toLocaleDateString()}
          </div>
          <div>
            <strong>Coupon Expiry:</strong> {hop.coupon_expiry_minutes} minutes
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px' }}>Venues ({venues.length})</h2>
        <button onClick={() => setShowAddVenue(!showAddVenue)}>
          {showAddVenue ? 'Cancel' : 'Add Venue'}
        </button>
      </div>

      {showAddVenue && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Add Venue</h3>
          <form onSubmit={addVenue}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Venue Name
              </label>
              <input type="text" name="name" required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Address
              </label>
              <input type="text" name="address" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Description
              </label>
              <textarea name="description" rows="2" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Reward Description
              </label>
              <input type="text" name="reward_description" placeholder="e.g., Free appetizer" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="required" defaultChecked />
                <span style={{ fontSize: '14px' }}>Required venue (must be visited to complete)</span>
              </label>
            </div>

            <button type="submit">Add Venue</button>
          </form>
        </div>
      )}

      {venues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No venues yet. Add your first venue to get started!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {venues.map(venue => (
            <div key={venue.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{venue.name}</h3>
                  {venue.address && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {venue.address}
                    </p>
                  )}
                  {venue.reward_description && (
                    <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <strong>Reward:</strong> {venue.reward_description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Stamp: {venue.stamp_token}</span>
                    <span>Redeem: {venue.redeem_token}</span>
                  </div>
                </div>
                <a href={`/venue/${venue.stamp_token}`} target="_blank">
                  <button style={{ padding: '8px 16px', fontSize: '14px' }}>
                    View QR Codes
                  </button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {venues.length > 0 && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{ backgroundColor: 'var(--text-secondary)' }}
          >
            Print All QR Codes
          </button>
        </div>
      )}
    </div>
  );
}
