'use client';

import { useState } from 'react';

export default function TestEmailModal({ post, onClose }) {
  const [email, setEmail] = useState('terry@terryheath.com');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/sends/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          email,
          subject: post.title,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send test email');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Test Email</h2>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="test-email">Test Email Address</label>
            <input
              type="email"
              id="test-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || success}
              placeholder="Enter email address"
            />
          </div>

          {success && (
            <div className="message message-success">
              Test email sent successfully to {email}
            </div>
          )}

          {error && <div className="message message-error">{error}</div>}

          <div className="message message-info">
            This will send a test version of the newsletter to verify email rendering and SES credentials.
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn btn-secondary"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          {!success && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !email}
              className="btn"
            >
              {sending ? 'Sending...' : 'Send Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}