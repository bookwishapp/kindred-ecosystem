'use client';

import { useState, useEffect } from 'react';

export default function SendModal({ post, onClose, onSuccess }) {
  const [subject, setSubject] = useState(post.title);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriberCount();
  }, []);

  const fetchSubscriberCount = async () => {
    try {
      const response = await fetch('/api/admin/subscribers/count');
      const data = await response.json();
      setSubscriberCount(data.count);
    } catch (err) {
      setError('Failed to fetch subscriber count');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/admin/sends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          subject,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send newsletter');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Newsletter</h2>
        </div>

        <div className="modal-body">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="subject">Subject Line</label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="message message-info">
                This will be sent to {subscriberCount} active subscriber{subscriberCount !== 1 ? 's' : ''}.
              </div>

              {error && <div className="message message-error">{error}</div>}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || loading || !subject}
            className="btn"
          >
            {sending ? 'Sending...' : 'Send Newsletter'}
          </button>
        </div>
      </div>
    </div>
  );
}