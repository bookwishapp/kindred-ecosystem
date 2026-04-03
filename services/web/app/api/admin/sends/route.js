import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('th_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await db.query(
      `SELECT s.*, p.title as post_title
       FROM sends s
       LEFT JOIN posts p ON s.post_id = p.id
       ORDER BY s.created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching sends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sends' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('th_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { post_id, subject } = await request.json();

    if (!post_id || !subject) {
      return NextResponse.json(
        { error: 'Post ID and subject are required' },
        { status: 400 }
      );
    }

    // Get the post content
    const postResult = await db.query(
      'SELECT title, content FROM posts WHERE id = $1',
      [post_id]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const post = postResult.rows[0];

    // Get subscriber count
    const countResult = await db.query(
      `SELECT COUNT(*) as count
       FROM subscribers
       WHERE status = 'active'
         AND email NOT IN (
           SELECT email FROM suppressions
         )`
    );
    const subscriberCount = parseInt(countResult.rows[0].count);

    if (subscriberCount === 0) {
      return NextResponse.json(
        { error: 'No active subscribers' },
        { status: 400 }
      );
    }

    // Create send record
    const sendResult = await db.query(
      `INSERT INTO sends (post_id, subject, status, recipient_count)
       VALUES ($1, $2, 'sending', $3)
       RETURNING id`,
      [post_id, subject, subscriberCount]
    );

    const sendId = sendResult.rows[0].id;

    // Update send status to indicate it's starting
    await db.query(
      `UPDATE sends SET started_at = NOW() WHERE id = $1`,
      [sendId]
    );

    // Format content with title as H1
    const emailContent = `<h1>${post.title}</h1>\n${post.content}`;

    // Get all active subscribers
    const subscribersResult = await db.query(
      `SELECT email FROM subscribers
       WHERE status = 'active'
         AND email NOT IN (SELECT email FROM suppressions)`
    );

    const recipients = subscribersResult.rows.map(s => ({ email: s.email }));

    const mailRes = await fetch(`${process.env.MAIL_SERVICE_URL}/send/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
      },
      body: JSON.stringify({
        product: 'terryheath',
        template: 'terryheath-newsletter',
        recipients,
        commonData: {
          subject,
          content: emailContent,
        },
      }),
    });

    if (!mailRes.ok) throw new Error('Mail service error');

    return NextResponse.json({
      success: true,
      send_id: sendId,
      message: `Newsletter queued for ${recipients.length} recipients`,
    });
  } catch (error) {
    console.error('Error creating send:', error);
    return NextResponse.json(
      { error: 'Failed to create send' },
      { status: 500 }
    );
  }
}