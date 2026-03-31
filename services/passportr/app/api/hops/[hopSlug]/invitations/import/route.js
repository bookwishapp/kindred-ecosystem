export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');
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

export async function POST(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;
    const { source_hop_slug } = await req.json();

    if (!source_hop_slug) {
      return Response.json({ error: 'source_hop_slug required' }, { status: 400 });
    }

    // Verify destination hop ownership
    const destHopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (destHopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const destHop = destHopResult.rows[0];
    if (destHop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Verify source hop ownership
    const sourceHopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [source_hop_slug]);
    if (sourceHopResult.rows.length === 0) return Response.json({ error: 'Source hop not found' }, { status: 404 });
    const sourceHop = sourceHopResult.rows[0];
    if (sourceHop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden — source hop not yours' }, { status: 403 });

    // Get accepted invitations from source hop
    const sourceInvitations = await db.query(
      `SELECT email, venue_name FROM venue_invitations
       WHERE hop_id = $1 AND status = 'accepted'`,
      [sourceHop.id]
    );

    if (sourceInvitations.rows.length === 0) {
      return Response.json({ error: 'No accepted venues found in source hop' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const results = { sent: [], skipped: [] };

    for (const inv of sourceInvitations.rows) {
      // Skip if already invited to destination hop
      const existing = await db.query(
        'SELECT id FROM venue_invitations WHERE hop_id = $1 AND email = $2',
        [destHop.id, inv.email]
      );
      if (existing.rows.length > 0) {
        results.skipped.push(inv.email);
        continue;
      }

      const token = randomBytes(20).toString('hex');

      await db.query(
        `INSERT INTO venue_invitations (hop_id, email, venue_name, token)
         VALUES ($1, $2, $3, $4)`,
        [destHop.id, inv.email, inv.venue_name, token]
      );

      const setupUrl = `${baseUrl}/venue/setup/${token}`;

      await transporter.sendMail({
        from: `${profile.organization ? `${profile.organization}, ` : ''}${profile.name || 'Passportr'} <${process.env.SES_FROM_EMAIL}>`,
        to: inv.email,
        subject: `You're invited to join ${destHop.name} on Passportr`,
        text: [
          `Hi,`,
          ``,
          `You've been invited to participate in "${destHop.name}" on Passportr as a venue.`,
          ``,
          `Venue name: ${inv.venue_name}`,
          ``,
          `── How Passportr Works ──────────────`,
          `Passportr is a digital passport experience — no app to download, no paper to print.`,
          ``,
          `Participants visit your venue, scan your QR code with their phone's camera, and`,
          `their digital passport is automatically stamped. Once they've collected enough`,
          `stamps across participating venues, they unlock a reward at each one they visited.`,
          ``,
          `As a venue, your only job is to print your two QR codes and display them where`,
          `customers can easily scan them — at the register, on the counter, or in your window.`,
          `One QR code is for stamping passports. The other is for customers to redeem their`,
          `reward when they've completed the hop. Your setup link below gives you access to`,
          `both codes, your store details, and today's redemption count.`,
          ``,
          `── Hop Details ──────────────────────`,
          `Event dates: ${new Date(destHop.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(destHop.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Stamp cutoff: ${new Date(destHop.stamp_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Reward redemption deadline: ${new Date(destHop.redeem_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          `Completion requirement: ${getCompletionText(destHop.completion_rule)}`,
          `Coupon expiry: ${destHop.coupon_expiry_minutes} minutes after scanning`,
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

      results.sent.push(inv.email);
    }

    return Response.json({
      success: true,
      sent: results.sent.length,
      skipped: results.skipped.length,
      details: results,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Import invitations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
