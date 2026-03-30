export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const db = require('../../../lib/db');

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hopSlug = searchParams.get('hop');
    const username = searchParams.get('username');

    if (!hopSlug || !username) {
      return Response.json({ error: 'Missing hop or username' }, { status: 400 });
    }

    // Get hop
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE slug = $1',
      [hopSlug]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];

    // Get participant
    const participantResult = await db.query(
      'SELECT * FROM participants WHERE hop_id = $1 AND username = $2',
      [hop.id, username]
    );

    if (participantResult.rows.length === 0) {
      return Response.json({ error: 'Participant not found' }, { status: 404 });
    }

    const participant = participantResult.rows[0];

    // Get stamps
    const stampsResult = await db.query(
      `SELECT s.*, v.name as venue_name, v.id as venue_id
      FROM stamps s
      JOIN venues v ON s.venue_id = v.id
      WHERE s.participant_id = $1`,
      [participant.id]
    );

    return Response.json({
      participant,
      stamps: stampsResult.rows
    });
  } catch (error) {
    console.error('Get participant error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
