export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const { generateToken } = require('../../../../../lib/tokens');

export async function GET(req, { params }) {
  try {
    const { hopSlug } = params;

    // Get hop
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE slug = $1',
      [hopSlug]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];

    // Get venues
    const venuesResult = await db.query(
      'SELECT * FROM venues WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );

    return Response.json({ venues: venuesResult.rows });
  } catch (error) {
    console.error('Get venues error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;
    const { name, address, description, reward_description, hours, required, sort_order } = await req.json();

    if (!name) {
      return Response.json({ error: 'Missing venue name' }, { status: 400 });
    }

    // Get hop and verify ownership
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE slug = $1',
      [hopSlug]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate unique tokens
    const stampToken = generateToken();
    const redeemToken = generateToken();

    // Insert venue
    const result = await db.query(
      `INSERT INTO venues (hop_id, name, address, description, reward_description, hours, stamp_token, redeem_token, required, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [hop.id, name, address, description, reward_description, hours, stampToken, redeemToken, required !== false, sort_order || 0]
    );

    return Response.json({ venue: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Create venue error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
