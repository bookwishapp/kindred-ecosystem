export const runtime = 'nodejs';

const db = require('../../../lib/db');
const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { checkCompletion } = require('../../../lib/completion');

export async function POST(req) {
  try {
    const { stamp_token } = await req.json();

    if (!stamp_token) {
      return Response.json({ error: 'Missing stamp_token' }, { status: 400 });
    }

    // Get user from cookie
    const cookies = parse(req.headers.get('cookie') || '');
    const token = cookies.passportr_token;

    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Look up venue by stamp_token
    const venueResult = await db.query(
      'SELECT * FROM venues WHERE stamp_token = $1',
      [stamp_token]
    );

    if (venueResult.rows.length === 0) {
      return Response.json({ error: 'Invalid stamp token' }, { status: 404 });
    }

    const venue = venueResult.rows[0];

    // Get hop details
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE id = $1',
      [venue.hop_id]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];

    // Verify hop is active
    const today = new Date().toISOString().split('T')[0];
    if (today < hop.start_date || today > hop.stamp_cutoff_date) {
      return Response.json({ error: 'Hop is not currently active for stamping' }, { status: 400 });
    }

    // Get or create participant
    let participantResult = await db.query(
      'SELECT * FROM participants WHERE hop_id = $1 AND user_id = $2',
      [hop.id, user.sub]
    );

    let participant;
    if (participantResult.rows.length === 0) {
      // Create participant
      const insertResult = await db.query(
        'INSERT INTO participants (hop_id, user_id, email) VALUES ($1, $2, $3) RETURNING *',
        [hop.id, user.sub, user.email]
      );
      participant = insertResult.rows[0];
    } else {
      participant = participantResult.rows[0];
    }

    // Insert stamp (idempotent - ignore if already stamped)
    await db.query(
      'INSERT INTO stamps (participant_id, venue_id) VALUES ($1, $2) ON CONFLICT (participant_id, venue_id) DO NOTHING',
      [participant.id, venue.id]
    );

    // Check completion
    const allVenuesResult = await db.query(
      'SELECT * FROM venues WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );
    const allVenues = allVenuesResult.rows;

    const stampsResult = await db.query(
      'SELECT venue_id FROM stamps WHERE participant_id = $1',
      [participant.id]
    );
    const stampedVenueIds = stampsResult.rows.map(s => s.venue_id);

    const completionRule = hop.completion_rule;
    const isCompleted = checkCompletion(completionRule, stampedVenueIds, allVenues);

    // Update completion status if completed
    if (isCompleted && !participant.completed_at) {
      await db.query(
        'UPDATE participants SET completed_at = NOW() WHERE id = $1',
        [participant.id]
      );
    }

    const passportUrl = `/${user.sub}/${hop.slug}`;

    return Response.json({
      stamped: true,
      passport_url: passportUrl,
      completed: isCompleted
    });

  } catch (error) {
    console.error('Stamp error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
