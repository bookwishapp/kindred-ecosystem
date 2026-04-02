export const runtime = 'nodejs';

const db = require('../../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../../lib/auth');

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
    const { hopSlug, invitationId } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const invResult = await db.query(
      'SELECT * FROM venue_invitations WHERE id = $1 AND hop_id = $2',
      [invitationId, hop.id]
    );
    if (invResult.rows.length === 0) return Response.json({ error: 'Invitation not found' }, { status: 404 });
    const invitation = invResult.rows[0];

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const setupUrl = `${baseUrl}/venue/setup/${invitation.token}`;

    const mailRes = await fetch(`${process.env.MAIL_SERVICE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
      },
      body: JSON.stringify({
        product: 'passportr',
        template: 'passportr-venue-invitation',
        to: invitation.email,
        senderName: `${profile.organization || profile.name || 'Passportr'}`,
        data: {
          venueName: invitation.venue_name,
          hopName: hop.name,
          startDate: new Date(hop.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          endDate: new Date(hop.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          stampCutoff: new Date(hop.stamp_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          redeemCutoff: new Date(hop.redeem_cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          completionText: getCompletionText(hop.completion_rule),
          couponExpiry: hop.coupon_expiry_minutes,
          setupUrl,
        },
      }),
    });
    if (!mailRes.ok) throw new Error('Mail service error');

    await db.query(
      'UPDATE venue_invitations SET sent_at = NOW() WHERE id = $1',
      [invitationId]
    );

    return Response.json({ status: 'resent' });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Resend invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
