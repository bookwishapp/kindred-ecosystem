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
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;
    const { name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, banner_url, logo_url } = await req.json();

    // Verify ownership
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
          coupon_expiry_minutes = COALESCE($9, coupon_expiry_minutes),
          banner_url = COALESCE($10, banner_url),
          logo_url = COALESCE($11, logo_url)
      WHERE id = $12
      RETURNING *`,
      [name, description, start_date, end_date, stamp_cutoff_date, redeem_cutoff_date, completion_rule, status, coupon_expiry_minutes, banner_url, logo_url, hop.id]
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

export async function DELETE(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query('DELETE FROM hops WHERE id = $1', [hop.id]);
    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Delete hop error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
