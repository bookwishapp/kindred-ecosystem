'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageHop({ params }) {
  const { hopSlug } = params;
  const router = useRouter();
  const [hop, setHop] = useState(null);
  const [venues, setVenues] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editingHop, setEditingHop] = useState(false);
  const [hopForm, setHopForm] = useState({});
  const [savingHop, setSavingHop] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', venue_name: '' });
  const [inviting, setInviting] = useState(false);
  const [showDeleteHop, setShowDeleteHop] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, [hopSlug]);

  async function loadAll() {
    try {
      const [hopRes, venuesRes] = await Promise.all([
        fetch(`/api/hops/${hopSlug}`, { credentials: 'include' }),
        fetch(`/api/hops/${hopSlug}/venues`, { credentials: 'include' }),
      ]);

      if (hopRes.status === 403) { setAccessDenied(true); setLoading(false); return; }
      if (hopRes.status === 401) { router.push('/organize/login'); return; }

      if (hopRes.ok) {
        const d = await hopRes.json();
        setHop(d.hop);
        setHopForm({
          name: d.hop.name,
          description: d.hop.description || '',
          start_date: d.hop.start_date?.split('T')[0],
          end_date: d.hop.end_date?.split('T')[0],
          stamp_cutoff_date: d.hop.stamp_cutoff_date?.split('T')[0],
          redeem_cutoff_date: d.hop.redeem_cutoff_date?.split('T')[0],
          coupon_expiry_minutes: d.hop.coupon_expiry_minutes,
          status: d.hop.status,
        });
      }
      if (venuesRes.ok) {
        const d = await venuesRes.json();
        setVenues(d.venues);
      }

      const invRes = await fetch(`/api/hops/${hopSlug}/invitations`, { credentials: 'include' });
      if (invRes.ok) {
        const d = await invRes.json();
        setInvitations(d.invitations);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  async function saveHop(e) {
    e.preventDefault();
    setSavingHop(true);
    try {
      const res = await fetch(`/api/hops/${hopSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(hopForm),
      });
      if (res.ok) {
        const d = await res.json();
        setHop(d.hop);
        setEditingHop(false);
        if (d.hop.slug !== hopSlug) router.push(`/organize/${d.hop.slug}`);
      } else {
        alert('Failed to save hop');
      }
    } catch { alert('Network error'); }
    setSavingHop(false);
  }

  async function deleteHop() {
    try {
      const res = await fetch(`/api/hops/${hopSlug}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) router.push('/organize');
      else alert('Failed to delete hop');
    } catch { alert('Network error'); }
  }

  async function addVenue(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fd.get('name'),
          address: fd.get('address'),
          description: fd.get('description'),
          reward_description: fd.get('reward_description'),
          hours: fd.get('hours'),
          required: fd.get('required') === 'on',
          sort_order: venues.length,
        }),
      });
      if (res.ok) { setShowAddVenue(false); e.target.reset(); loadAll(); }
      else alert('Failed to add venue');
    } catch { alert('Network error'); }
  }

  async function saveVenue(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues/${editingVenue}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(venueForm),
      });
      if (res.ok) { setEditingVenue(null); loadAll(); }
      else alert('Failed to save venue');
    } catch { alert('Network error'); }
  }

  async function deleteVenue(venueId) {
    if (!confirm('Delete this venue? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues/${venueId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) loadAll();
      else alert('Failed to delete venue');
    } catch { alert('Network error'); }
  }

  async function sendInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch(`/api/hops/${hopSlug}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({ email: '', venue_name: '' });
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to send invitation');
      }
    } catch { alert('Network error'); }
    setInviting(false);
  }

  async function uploadHopImage(file, field, setUploading) {
    if (!file) return;
    setUploading(true);
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content_type: file.type,
          folder: field === 'banner_url' ? 'hop-banners' : 'hop-logos',
        }),
      });
      const { presigned_url, public_url } = await presignRes.json();

      await fetch(presigned_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const updateRes = await fetch(`/api/hops/${hopSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: public_url }),
      });

      if (updateRes.ok) {
        const d = await updateRes.json();
        setHop(d.hop);
      } else {
        alert('Failed to save image');
      }
    } catch {
      alert('Upload failed');
    }
    setUploading(false);
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (accessDenied) return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Organizer Access Required</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Contact support if you believe you should have access.</p>
      </div>
    </div>
  );
  if (!hop) return <div className="container" style={{ paddingTop: '80px' }}><h1>Hop not found</h1></div>;

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/organize" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>← Back to dashboard</a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{hop.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date(hop.start_date).toLocaleDateString()} – {new Date(hop.end_date).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setEditingHop(!editingHop)} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {editingHop ? 'Cancel' : 'Edit Hop'}
          </button>
          <button
            onClick={() => setShowDeleteHop(true)}
            style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: '#e55' }}
          >
            Delete Hop
          </button>
        </div>
      </div>

      {showDeleteHop && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid #e55' }}>
          <h3 style={{ marginBottom: '12px', color: '#e55' }}>Delete "{hop.name}"?</h3>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            This will permanently delete the hop, all venues, participants, stamps, and redemptions. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={deleteHop} style={{ backgroundColor: '#e55' }}>Yes, Delete Everything</button>
            <button onClick={() => setShowDeleteHop(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )}

      {editingHop && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Edit Hop</h2>
          <form onSubmit={saveHop}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
              <input type="text" value={hopForm.name} onChange={e => setHopForm({ ...hopForm, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea rows="3" value={hopForm.description} onChange={e => setHopForm({ ...hopForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Start Date</label>
                <input type="date" value={hopForm.start_date} onChange={e => setHopForm({ ...hopForm, start_date: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>End Date</label>
                <input type="date" value={hopForm.end_date} onChange={e => setHopForm({ ...hopForm, end_date: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Stamp Cutoff</label>
                <input type="date" value={hopForm.stamp_cutoff_date} onChange={e => setHopForm({ ...hopForm, stamp_cutoff_date: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Redeem Cutoff</label>
                <input type="date" value={hopForm.redeem_cutoff_date} onChange={e => setHopForm({ ...hopForm, redeem_cutoff_date: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Coupon Expiry (minutes)</label>
                <input
                  type="number"
                  value={hopForm.coupon_expiry_minutes}
                  onChange={e => setHopForm({ ...hopForm, coupon_expiry_minutes: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                <select value={hopForm.status} onChange={e => setHopForm({ ...hopForm, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={savingHop}>{savingHop ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditingHop(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!editingHop && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Status:</strong> {hop.status}</div>
            <div><strong>Public URL:</strong> <a href={`/hop/${hop.slug}`} target="_blank">/hop/{hop.slug}</a></div>
            <div><strong>Stamp Cutoff:</strong> {new Date(hop.stamp_cutoff_date).toLocaleDateString()}</div>
            <div><strong>Redeem Cutoff:</strong> {new Date(hop.redeem_cutoff_date).toLocaleDateString()}</div>
            <div><strong>Coupon Expiry:</strong> {hop.coupon_expiry_minutes} minutes</div>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Images</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Banner */}
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Banner</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Recommended: 1400×440px</p>
                {hop.banner_url && (
                  <img
                    src={hop.banner_url}
                    alt="Hop banner"
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={bannerInputRef}
                  style={{ display: 'none' }}
                  onChange={e => uploadHopImage(e.target.files[0], 'banner_url', setUploadingBanner)}
                />
                <button
                  onClick={() => bannerInputRef.current.click()}
                  disabled={uploadingBanner}
                  style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: 'var(--text-secondary)' }}
                >
                  {uploadingBanner ? 'Uploading...' : hop.banner_url ? 'Change Banner' : 'Upload Banner'}
                </button>
              </div>

              {/* Logo */}
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Logo</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Recommended: 216×216px minimum</p>
                {hop.logo_url && (
                  <img
                    src={hop.logo_url}
                    alt="Hop logo"
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', display: 'block' }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  style={{ display: 'none' }}
                  onChange={e => uploadHopImage(e.target.files[0], 'logo_url', setUploadingLogo)}
                />
                <button
                  onClick={() => logoInputRef.current.click()}
                  disabled={uploadingLogo}
                  style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: 'var(--text-secondary)' }}
                >
                  {uploadingLogo ? 'Uploading...' : hop.logo_url ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px' }}>Venues ({venues.length})</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
          >
            Invite Venue
          </button>
          <button onClick={() => setShowAddVenue(!showAddVenue)} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {showAddVenue ? 'Cancel' : 'Add Venue'}
          </button>
        </div>
      </div>

      {showInviteModal && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--accent-teal)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Invite a Venue</h3>
          <form onSubmit={sendInvite}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Venue Name</label>
              <input type="text" value={inviteForm.venue_name} onChange={e => setInviteForm({ ...inviteForm, venue_name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Email Address</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={inviting}>{inviting ? 'Sending...' : 'Send Invitation'}</button>
              <button type="button" onClick={() => setShowInviteModal(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Invitations</h3>
          {invitations.map(inv => (
            <div
              key={inv.id}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #eee' }}
            >
              <span><strong>{inv.venue_name}</strong> — {inv.email}</span>
              <span style={{
                padding: '2px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                backgroundColor: inv.status === 'accepted' ? '#E8F7F4' : '#fff3cd',
                color: inv.status === 'accepted' ? 'var(--accent-teal)' : '#856404',
              }}>
                {inv.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showAddVenue && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Add Venue</h3>
          <form onSubmit={addVenue}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Venue Name</label>
              <input type="text" name="name" required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
              <input type="text" name="address" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea name="description" rows="2" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
              <input type="text" name="reward_description" placeholder="e.g., Free appetizer" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
              </label>
              <input type="text" name="hours" placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="required" defaultChecked />
                <span style={{ fontSize: '14px' }}>Required venue</span>
              </label>
            </div>
            <button type="submit">Add Venue</button>
          </form>
        </div>
      )}

      {venues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No venues yet. Add one above or invite a venue by email.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {venues.map(venue => (
            <div key={venue.id} className="card">
              {editingVenue === venue.id ? (
                <form onSubmit={saveVenue}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
                    <input type="text" value={venueForm.name} onChange={e => setVenueForm({ ...venueForm, name: e.target.value })} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
                    <input type="text" value={venueForm.address || ''} onChange={e => setVenueForm({ ...venueForm, address: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
                    <textarea rows="2" value={venueForm.description || ''} onChange={e => setVenueForm({ ...venueForm, description: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
                    <input type="text" value={venueForm.reward_description || ''} onChange={e => setVenueForm({ ...venueForm, reward_description: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                      Store Hours <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={venueForm.hours || ''}
                      onChange={e => setVenueForm({ ...venueForm, hours: e.target.value })}
                      placeholder="e.g., Mon–Sat 10am–6pm, Sun 12–5pm"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" style={{ fontSize: '14px', padding: '8px 16px' }}>Save</button>
                    <button
                      type="button"
                      onClick={() => setEditingVenue(null)}
                      style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{venue.name}</h3>
                    {venue.address && (
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{venue.address}</p>
                    )}
                    {venue.reward_description && (
                      <p style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Reward:</strong> {venue.reward_description}</p>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      <a href={`/venue/${venue.stamp_token}`} target="_blank" style={{ marginRight: '16px' }}>
                        View Venue Page ↗
                      </a>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingVenue(venue.id);
                        setVenueForm({
                          name: venue.name,
                          address: venue.address,
                          description: venue.description,
                          reward_description: venue.reward_description,
                          hours: venue.hours || '',
                        });
                      }}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVenue(venue.id)}
                      style={{ fontSize: '13px', padding: '6px 12px', backgroundColor: '#e55' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
