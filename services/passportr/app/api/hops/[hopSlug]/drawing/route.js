export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');

export async function GET(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const prizesResult = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );

    const winnersResult = await db.query(
      `SELECT dw.*, p.user_id, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    const eligibleResult = await db.query(
      'SELECT COUNT(*) as count FROM participants WHERE hop_id = $1 AND completed_at IS NOT NULL',
      [hop.id]
    );

    return Response.json({
      prizes: prizesResult.rows,
      winners: winnersResult.rows,
      eligible_count: parseInt(eligibleResult.rows[0].count),
      drawn: winnersResult.rows.length > 0,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!hop.drawing_enabled) {
      return Response.json({ error: 'Drawing not enabled for this hop' }, { status: 400 });
    }

    // Check drawing hasn't already been run
    const existingWinners = await db.query(
      'SELECT id FROM drawing_winners WHERE hop_id = $1',
      [hop.id]
    );
    if (existingWinners.rows.length > 0) {
      return Response.json({ error: 'Drawing has already been run' }, { status: 409 });
    }

    // Get all eligible participants (completed, no repeats)
    const eligibleResult = await db.query(
      'SELECT id, user_id FROM participants WHERE hop_id = $1 AND completed_at IS NOT NULL',
      [hop.id]
    );
    const eligible = eligibleResult.rows;

    if (eligible.length === 0) {
      return Response.json({ error: 'No eligible participants' }, { status: 400 });
    }

    // Get prizes
    const prizesResult = await db.query(
      'SELECT * FROM drawing_prizes WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );
    const prizes = prizesResult.rows;

    // Shuffle eligible participants (Fisher-Yates)
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const winnerCount = Math.min(hop.drawing_winners_count, pool.length);
    const selectedWinners = pool.slice(0, winnerCount);

    // Insert winners — no repeats enforced by UNIQUE constraint
    for (let i = 0; i < selectedWinners.length; i++) {
      const prize = prizes[i] || null;
      await db.query(
        `INSERT INTO drawing_winners (hop_id, participant_id, prize_id)
         VALUES ($1, $2, $3)`,
        [hop.id, selectedWinners[i].id, prize?.id || null]
      );
    }

    // Return winners with prize labels
    const winnersResult = await db.query(
      `SELECT dw.*, p.user_id, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    return Response.json({ winners: winnersResult.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
