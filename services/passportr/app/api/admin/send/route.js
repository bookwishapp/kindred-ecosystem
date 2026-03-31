export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

function requireAdminSecret(req) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.PASSPORTR_ADMIN_SECRET) {
    throw new Error('Unauthorized');
  }
}

export async function POST(req) {
  try {
    requireAdminSecret(req);
    const { subject, body, audience } = await req.json();

    if (!subject || !body) {
      return Response.json({ error: 'subject and body required' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT user_id, email, unsubscribe_token
       FROM participant_preferences
       WHERE opt_in = true AND unsubscribed_at IS NULL`
    );

    const subscribers = result.rows;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    let sent = 0;

    for (const sub of subscribers) {
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${sub.unsubscribe_token}`;
      try {
        await transporter.sendMail({
          from: process.env.SES_FROM_EMAIL,
          to: sub.email,
          subject,
          text: `${body}\n\n---\nTo stop receiving these emails: ${unsubscribeUrl}`,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err.message);
      }
    }

    return Response.json({ sent, total: subscribers.length });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin send error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
