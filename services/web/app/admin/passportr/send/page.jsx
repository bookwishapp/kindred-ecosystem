'use client';

import { useState } from 'react';

export default function PassportrSendPage() {
  const [form, setForm] = useState({
    subject: '',
    body: '',
    audience: 'all',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    if (!confirm(`Send to ${form.audience === 'all' ? 'all subscribers' : form.audience}? This cannot be undone.`)) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/admin/passportr/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) setResult(d);
      else setError(d.error || 'Send failed');
    } catch { setError('Network error'); }
    setSending(false);
  }

  return (
    <div style={{ padding: '40px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Send Notification</h1>

      <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Audience</label>
            <select
              value={form.audience}
              onChange={e => setForm({ ...form, audience: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="all">All active subscribers</option>
            </select>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Location and interest filtering coming soon.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Message</label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              required
              rows="8"
              style={{ width: '100%' }}
              placeholder="Plain text. An unsubscribe link will be added automatically."
            />
          </div>

          {error && <p style={{ color: '#e55', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}
          {result && (
            <p style={{ color: '#2AB8A0', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}>
              ✓ Sent to {result.sent} subscriber{result.sent !== 1 ? 's' : ''}.
            </p>
          )}

          <button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>
    </div>
  );
}
