export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { requireOrganizer } = require('../../../../lib/auth');

export async function GET(req, { params }) {
  try {
    const { hopSlug } = params;

    const result = await db.query(
      'SELECT * FROM hops WHERE slug = $1',
      [hopSlug]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    return Response.json({ hop: result.rows[0] });
  } catch (error) {
    console.error('Get hop error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;
    const { name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes } = await req.json();

    // Verify ownership
    const hopResult = await db.query(
      'SELECT * FROM hops WHERE slug = $1',
      [hopSlug]
    );

    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update hop
    const result = await db.query(
      `UPDATE hops
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          stamp_cutoff_date = COALESCE($5, stamp_cutoff_date),
          redeem_cutoff_date = COALESCE($6, redeem_cutoff_date),
          completion_rule = COALESCE($7, completion_rule),
          status = COALESCE($8, status),
          coupon_expiry_minutes = COALESCE($9, coupon_expiry_minutes)
      WHERE id = $10
      RETURNING *`,
      [name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, hop.id]
    );

    return Response.json({ hop: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Update hop error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
