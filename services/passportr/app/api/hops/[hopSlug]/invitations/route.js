export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const { randomBytes } = require('crypto');
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

function getCompletionText(rule) {
  if (!rule) return 'Visit all participating venues';
  if (rule.type === 'all') return 'Visit all participating venues';
  if (rule.type === 'percentage') return `Visit ${rule.percent}% of participating venues`;
  if (rule.type === 'minimum') return `Visit at least ${rule.count} participating venues`;
  if (rule.type === 'required_plus') return `Visit all required venues plus at least ${rule.minimum_optional || 0} optional venues`;
  return 'Visit all participating venues';
}

export async function GET(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const result = await db.query(
      'SELECT * FROM venue_invitations WHERE hop_id = $1 ORDER BY invited_at DESC',
      [hop.id]
    );

    return Response.json({ invitations: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Get invitations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;
    const { email, venue_name } = await req.json();

    if (!email || !venue_name) {
      return Response.json({ error: 'email and venue_name required' }, { status: 400 });
    }

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const token = randomBytes(20).toString('hex');

    await db.query(
      `INSERT INTO venue_invitations (hop_id, email, venue_name, token)
       VALUES ($1, $2, $3, $4)`,
      [hop.id, email, venue_name, token]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const setupUrl = `${baseUrl}/venue/setup/${token}`;

    await transporter.sendMail({
      from: process.env.SES_FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${hop.name} on Passportr`,
      text: [
        `Hi,`,
        ``,
        `You've been invited to participate in "${hop.name}" on Passportr as a venue.`,
        ``,
        `Venue name: ${venue_name}`,
        ``,
        `── Hop Details ──────────────────────`,
        `Event dates: ${new Date(hop.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(hop.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        `Stamp cutoff: ${new Date(hop.stamp_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        `Reward redemption deadline: ${new Date(hop.redeem_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        `Completion requirement: ${getCompletionText(hop.completion_rule)}`,
        `Coupon expiry: ${hop.coupon_expiry_minutes} minutes after scanning`,
        `────────────────────────────────────`,
        ``,
        `Click the link below to set up your venue:`,
        `${setupUrl}`,
        ``,
        `This link is unique to your venue — don't share it.`,
        ``,
        `Passportr`,
      ].join('\n'),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
