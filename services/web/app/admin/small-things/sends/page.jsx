'use client';

import { useEffect, useState } from 'react';

export default function SendsPage() {
  const [sends, setSends] = useState([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSends();
  }, []);

  async function fetchSends() {
    try {
      const response = await fetch('/api/admin/sends');
      const data = await response.json();
      setSends(data.sends);
      setSubscriberCount(data.subscriber_count);
    } catch (error) {
      console.error('Failed to fetch sends:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const totalSent = sends.reduce((sum, send) => sum + (send.sent_count || 0), 0);
  const completedSends = sends.filter(s => s.status === 'complete').length;
  const completionRate = sends.length > 0 ? Math.round((completedSends / sends.length) * 100) : 0;

  return (
    <div>
      <h1>Newsletter Sends</h1>

      {sends.length === 0 ? (
        <p>No newsletter sends yet.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', minWidth: '140px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Subscribers</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{subscriberCount}</div>
            </div>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', minWidth: '140px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Sent</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{totalSent}</div>
            </div>
            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', minWidth: '140px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Completion Rate</div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{completionRate}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Started</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sends.map((send) => (
                <tr key={send.id}>
                  <td>{send.post_title || '-'}</td>
                  <td>{send.subject}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      background: send.status === 'complete' ? '#d1fae5' :
                                  send.status === 'failed' ? '#fee2e2' :
                                  send.status === 'sending' ? '#fef3c7' :
                                  send.status === 'queued' ? '#dbeafe' : '#e5e7eb',
                      color: send.status === 'complete' ? '#065f46' :
                             send.status === 'failed' ? '#991b1b' :
                             send.status === 'sending' ? '#92400e' :
                             send.status === 'queued' ? '#1e40af' : '#374151',
                    }}>
                      {send.status}
                    </span>
                  </td>
                  <td>{send.recipient_count || 0}</td>
                  <td>{send.sent_count || 0}</td>
                  <td>
                    {send.started_at
                      ? new Date(send.started_at).toLocaleString()
                      : '-'}
                  </td>
                  <td>
                    {send.completed_at
                      ? new Date(send.completed_at).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
