export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const { randomBytes } = require('crypto');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

    await ses.send(new SendEmailCommand({
      Source: 'noreply@passportr.io',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You're invited to join ${hop.name} on Passportr` },
        Body: {
          Text: {
            Data: `Hi,\n\nYou've been invited to participate in "${hop.name}" on Passportr as a venue.\n\nVenue name: ${venue_name}\n\nClick the link below to set up your venue:\n${setupUrl}\n\nThis link is unique to your venue — don't share it.\n\nPassportr`
          }
        }
      }
    }));

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
