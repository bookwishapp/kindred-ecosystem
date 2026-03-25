import { redirect } from 'next/navigation';
import db from '../../lib/db';
import { validateUnsubscribeToken } from '../../lib/unsubscribe';

async function processUnsubscribe(email, token) {
  'use server';

  // Validate token
  if (!validateUnsubscribeToken(email, token)) {
    return { error: 'Invalid unsubscribe link' };
  }

  try {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Add to suppressions
      await client.query(
        `INSERT INTO suppressions (email, reason)
         VALUES ($1, 'unsubscribed')
         ON CONFLICT (email) DO NOTHING`,
        [email]
      );

      // Update subscriber status
      await client.query(
        `UPDATE subscribers
         SET status = 'suppressed'
         WHERE email = $1`,
        [email]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return { error: 'Failed to process unsubscribe' };
  }
}

export default async function UnsubscribePage({ searchParams }) {
  const email = searchParams.email;
  const token = searchParams.token;

  if (!email || !token) {
    return (
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <h1>Invalid Unsubscribe Link</h1>
          <p>This unsubscribe link appears to be invalid or incomplete.</p>
          <p>If you're trying to unsubscribe, please use the link in your email.</p>
        </div>
      </div>
    );
  }

  const result = await processUnsubscribe(email, token);

  if (result.error) {
    return (
      <div className="container">
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
          <h1>Unsubscribe Error</h1>
          <p>{result.error}</p>
          <p>If you continue to have issues, please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <h1>You've Been Unsubscribed</h1>
        <p>Your email address ({email}) has been removed from our mailing list.</p>
        <p>You will no longer receive newsletters from Small Things.</p>
        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
          If this was a mistake, you can re-subscribe by visiting{' '}
          <a href="https://terryheath.com">terryheath.com</a>
        </p>
      </div>
    </div>
  );
}