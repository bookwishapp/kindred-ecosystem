export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const { randomBytes } = require('crypto');

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
    const { user, profile } = await requireOrganizer(req);
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
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;
    const { email, venue_name } = await req.json();

    if (!email || !venue_name) {
      return Response.json({ error: 'email and venue_name required' }, { status: 400 });
    }

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Tier 1: max 10 venues per hop
    if (profile.tier === 1) {
      const venueCount = await db.query(
        'SELECT COUNT(*) as count FROM venues WHERE hop_id = $1',
        [hop.id]
      );
      if (parseInt(venueCount.rows[0].count) >= 10) {
        return Response.json({
          error: 'Venue limit reached for your plan',
          code: 'VENUE_LIMIT_REACHED',
          tier: profile.tier,
        }, { status: 403 });
      }
    }

    const token = randomBytes(20).toString('hex');

    await db.query(
      `INSERT INTO venue_invitations (hop_id, email, venue_name, token)
       VALUES ($1, $2, $3, $4)`,
      [hop.id, email, venue_name, token]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const setupUrl = `${baseUrl}/venue/setup/${token}`;

    const mailRes = await fetch(`${process.env.MAIL_SERVICE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
      },
      body: JSON.stringify({
        product: 'passportr',
        template: 'passportr-venue-invitation',
        to: email,
        senderName: hop.name,
        data: {
          venueName: venue_name,
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

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
