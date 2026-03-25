import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export const runtime = 'nodejs';

export async function POST(request) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all scheduled posts that are due
    const scheduledPosts = await db.query(
      `SELECT id, title, slug, content, scheduled_at
       FROM posts
       WHERE status = 'scheduled'
         AND scheduled_at <= NOW()
         AND is_page = false
       ORDER BY scheduled_at ASC`
    );

    const results = [];

    for (const post of scheduledPosts.rows) {
      try {
        // Start a transaction for each post
        const client = await db.getClient();

        try {
          await client.query('BEGIN');

          // Update post status to published
          await client.query(
            `UPDATE posts
             SET status = 'published',
                 published_at = scheduled_at,
                 updated_at = NOW()
             WHERE id = $1`,
            [post.id]
          );

          // Get subscriber count
          const subscriberResult = await client.query(
            `SELECT COUNT(*) as count
             FROM subscribers
             WHERE status = 'active'
               AND email NOT IN (
                 SELECT email FROM suppressions
               )`
          );
          const subscriberCount = parseInt(subscriberResult.rows[0].count);

          if (subscriberCount > 0) {
            // Create send record
            const sendResult = await client.query(
              `INSERT INTO sends (post_id, subject, status, recipient_count)
               VALUES ($1, $2, 'pending', $3)
               RETURNING id`,
              [post.id, post.title, subscriberCount]
            );

            // Trigger newsletter send asynchronously
            // In production, this would be a separate job/queue
            // For now, we'll just mark it as ready to send
            await client.query(
              `UPDATE sends
               SET status = 'queued', started_at = NOW()
               WHERE id = $1`,
              [sendResult.rows[0].id]
            );

            results.push({
              post_id: post.id,
              title: post.title,
              status: 'published_and_queued',
              send_id: sendResult.rows[0].id,
              subscribers: subscriberCount
            });
          } else {
            results.push({
              post_id: post.id,
              title: post.title,
              status: 'published_only',
              reason: 'no_active_subscribers'
            });
          }

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (postError) {
        console.error(`Error processing scheduled post ${post.id}:`, postError);
        results.push({
          post_id: post.id,
          title: post.title,
          status: 'error',
          error: postError.message
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results: results
    });
  } catch (error) {
    console.error('Cron send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}