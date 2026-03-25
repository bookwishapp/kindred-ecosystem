import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';
import { sendEmail, getEmailTemplate } from '../../../../../lib/email';
import { getUnsubscribeUrl } from '../../../../../lib/unsubscribe';

export const runtime = 'nodejs';

export async function POST(request) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { post_id, email, subject } = await request.json();

    if (!post_id || !email || !subject) {
      return NextResponse.json(
        { error: 'Post ID, email, and subject are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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

    // Format content with title as H1 (same as regular newsletter)
    const emailContent = `<h1>${post.title}</h1>\n${post.content}`;

    // Generate unsubscribe URL (for consistency with regular newsletters)
    const unsubscribeUrl = getUnsubscribeUrl(email);

    // Get the full HTML template
    const htmlContent = getEmailTemplate(emailContent, unsubscribeUrl);

    // Send the test email
    await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      content: htmlContent,
      isNewsletter: false, // Don't add List-Unsubscribe headers for test emails
    });

    console.log(`Test email sent successfully to ${email} for post ${post_id}`);

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`
    });
  } catch (error) {
    console.error('Error sending test email:', error);

    // Check for SMTP authentication errors
    if (error.code === 'EAUTH' || error.response?.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Email authentication failed. Please check SES credentials.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to send test email: ${error.message}` },
      { status: 500 }
    );
  }
}