'use client';

import { useEffect, useState, useRef } from 'react';

export default function VenuePage({ params }) {
  const { token } = params;
  const [venue, setVenue] = useState(null);
  const [hop, setHop] = useState(null);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [stampQR, setStampQR] = useState(null);
  const [redeemQR, setRedeemQR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    loadVenue();
  }, [token]);

  async function loadVenue() {
    try {
      const res = await fetch(`/api/venue-self-service/${token}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const data = await res.json();
      setVenue(data.venue);
      setHop(data.hop);
      setRedemptionCount(data.redemption_count);
      setStampQR(data.stamp_qr);
      setRedeemQR(data.redeem_qr);
      setForm({
        name: data.venue.name,
        address: data.venue.address || '',
        description: data.venue.description || '',
        reward_description: data.venue.reward_description || '',
        hours: data.venue.hours || '',
      });
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  async function saveVenue(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/hops/${hop.slug}/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error || 'Failed to save');
      } else {
        const d = await res.json();
        setVenue(d.venue);
        setEditing(false);
      }
    } catch {
      setSaveError('Network error');
    }
    setSaving(false);
  }

  async function uploadLogo(file) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify({ content_type: file.type, folder: 'venue-logos' }),
      });
      const { presigned_url, public_url } = await presignRes.json();

      await fetch(presigned_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const updateRes = await fetch(`/api/hops/${hop.slug}/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify({ logo_url: public_url }),
      });
      if (updateRes.ok) {
        const d = await updateRes.json();
        setVenue(d.venue);
      }
    } catch {
      alert('Logo upload failed');
    }
    setUploadingLogo(false);
  }

  function downloadQR(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (notFound) return <div className="container" style={{ paddingTop: '80px' }}><h1>Venue not found</h1></div>;

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{venue.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{hop.name}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Today's redemptions: <strong>{redemptionCount}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt="Venue logo"
              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              ref={logoInputRef}
              style={{ display: 'none' }}
              onChange={e => uploadLogo(e.target.files[0])}
            />
            <button
              onClick={() => logoInputRef.current.click()}
              disabled={uploadingLogo}
              style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
            >
              {uploadingLogo ? 'Uploading...' : venue.logo_url ? 'Change Logo' : 'Upload Logo'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>Stamp QR Code</h2>
          {stampQR && <img src={stampQR} alt="Stamp QR" style={{ width: '100%', maxWidth: '250px' }} />}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', fontFamily: 'monospace' }}>
            {venue.stamp_token}
          </p>
          <button
            onClick={() => downloadQR(stampQR, `stamp-${venue.stamp_token}.png`)}
            style={{ marginTop: '12px', fontSize: '14px', padding: '8px 16px' }}
          >
            Download
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>Redeem QR Code</h2>
          {redeemQR && <img src={redeemQR} alt="Redeem QR" style={{ width: '100%', maxWidth: '250px' }} />}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', fontFamily: 'monospace' }}>
            {venue.redeem_token}
          </p>
          <button
            onClick={() => downloadQR(redeemQR, `redeem-${venue.redeem_token}.png`)}
            style={{ marginTop: '12px', fontSize: '14px', padding: '8px 16px' }}
          >
            Download
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>Venue Details</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: '14px', padding: '8px 16px' }}>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveVenue}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
              <input
                type="text"
                value={form.reward_description}
                onChange={e => setForm({ ...form, reward_description: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={form.hours}
                onChange={e => setForm({ ...form, hours: e.target.value })}
                placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm"
              />
            </div>
            {saveError && <p style={{ color: 'red', marginBottom: '12px' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{ backgroundColor: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            {venue.address && <div><strong>Address:</strong> {venue.address}</div>}
            {venue.description && <div><strong>Description:</strong> {venue.description}</div>}
            {venue.reward_description && <div><strong>Reward:</strong> {venue.reward_description}</div>}
            {venue.hours && <div><strong>Hours:</strong> {venue.hours}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
