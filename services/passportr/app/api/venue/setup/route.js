export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { generateToken } = require('../../../../lib/tokens');

export async function POST(req) {
  try {
    const { token, name, address, description, reward_description, hours } = await req.json();

    if (!token || !name) return Response.json({ error: 'token and name required' }, { status: 400 });

    const invResult = await db.query(
      `SELECT vi.*, h.id as hop_id, h.slug as hop_slug
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       WHERE vi.token = $1 AND vi.status = 'pending'`,
      [token]
    );
    if (invResult.rows.length === 0) return Response.json({ error: 'Invalid or already used' }, { status: 400 });

    const invitation = invResult.rows[0];

    // Check venue limit for this hop's organizer
    const hopOrgResult = await db.query(
      `SELECT op.*, h.name as hop_name
       FROM organizer_profiles op
       JOIN hops h ON h.organizer_user_id = op.user_id
       WHERE h.id = $1`,
      [invitation.hop_id]
    );
    const orgProfile = hopOrgResult.rows[0];

    if (orgProfile && orgProfile.tier === 1) {
      const venueCount = await db.query(
        'SELECT COUNT(*) as count FROM venues WHERE hop_id = $1',
        [invitation.hop_id]
      );
      if (parseInt(venueCount.rows[0].count) >= 10) {
        // Notify organizer
        try {
          const transporter = require('nodemailer').createTransport({
            host: process.env.SES_SMTP_HOST,
            port: parseInt(process.env.SES_SMTP_PORT),
            secure: false,
            auth: {
              user: process.env.SES_SMTP_USERNAME,
              pass: process.env.SES_SMTP_PASSWORD,
            },
          });
          await transporter.sendMail({
            from: process.env.SES_FROM_EMAIL,
            to: orgProfile.email,
            subject: `Action needed: ${invitation.venue_name} couldn't complete setup for ${orgProfile.hop_name}`,
            text: `Hi ${orgProfile.name},\n\n${invitation.venue_name} tried to complete their venue setup for "${orgProfile.hop_name}" but your hop has reached its 10-venue limit for Tier 1.\n\nTo make room, remove a venue from your hop, or upgrade to Tier 2 to allow 11+ venues.\n\nManage your hop: ${process.env.NEXT_PUBLIC_BASE_URL}/organize/${invitation.hop_slug}\nUpgrade your plan: ${process.env.NEXT_PUBLIC_BASE_URL}/organize/billing\n\nPassportr`,
          });
        } catch (emailErr) {
          console.error('Failed to send venue limit notification:', emailErr);
        }

        return Response.json({
          error: 'venue_limit_reached',
          message: 'This hop is currently full. The organizer has been notified and may be able to make room for you.',
        }, { status: 403 });
      }
    }

    const stampToken = generateToken();
    const redeemToken = generateToken();

    const countResult = await db.query(
      'SELECT COUNT(*) as c FROM venues WHERE hop_id = $1',
      [invitation.hop_id]
    );
    const sortOrder = parseInt(countResult.rows[0].c);

    await db.query(
      `INSERT INTO venues (hop_id, name, address, description, reward_description, hours, stamp_token, redeem_token, required, sort_order, invitation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10)`,
      [invitation.hop_id, name, address, description, reward_description, hours, stampToken, redeemToken, sortOrder, invitation.id]
    );

    await db.query(
      `UPDATE venue_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    return Response.json({ stamp_token: stampToken });
  } catch (error) {
    console.error('Venue setup POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
