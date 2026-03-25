import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export const runtime = 'nodejs';

// Verify SNS signature
function verifySNSSignature(message) {
  // In production, implement full SNS signature verification
  // For now, we'll do basic validation
  return true; // Placeholder - implement actual verification
}

async function handleBounce(mail, bounce) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    for (const recipient of bounce.bouncedRecipients) {
      const email = recipient.emailAddress.toLowerCase();

      // Add to suppressions
      await client.query(
        `INSERT INTO suppressions (email, reason)
         VALUES ($1, 'bounced')
         ON CONFLICT (email) DO UPDATE
         SET reason = 'bounced', suppressed_at = NOW()`,
        [email]
      );

      // Update subscriber status
      await client.query(
        `UPDATE subscribers
         SET status = 'suppressed'
         WHERE email = $1`,
        [email]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function handleComplaint(mail, complaint) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    for (const recipient of complaint.complainedRecipients) {
      const email = recipient.emailAddress.toLowerCase();

      // Add to suppressions
      await client.query(
        `INSERT INTO suppressions (email, reason)
         VALUES ($1, 'complaint')
         ON CONFLICT (email) DO UPDATE
         SET reason = 'complaint', suppressed_at = NOW()`,
        [email]
      );

      // Update subscriber status
      await client.query(
        `UPDATE subscribers
         SET status = 'suppressed'
         WHERE email = $1`,
        [email]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request) {
  try {
    const body = await request.text();
    let message;

    try {
      message = JSON.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      // In production, fetch the SubscribeURL to confirm
      console.log('SNS Subscription Confirmation URL:', message.SubscribeURL);
      return NextResponse.json({ success: true });
    }

    // Handle notifications
    if (message.Type === 'Notification') {
      // Verify signature (implement in production)
      if (!verifySNSSignature(message)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        );
      }

      let notification;
      try {
        notification = JSON.parse(message.Message);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid notification message' },
          { status: 400 }
        );
      }

      const { notificationType, mail } = notification;

      if (notificationType === 'Bounce') {
        await handleBounce(mail, notification.bounce);
      } else if (notificationType === 'Complaint') {
        await handleComplaint(mail, notification.complaint);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Unknown message type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('SES webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}