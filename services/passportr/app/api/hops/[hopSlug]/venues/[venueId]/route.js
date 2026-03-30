export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

async function verifyVenueAccess(req, hopSlug, venueId) {
  // Try organizer auth first
  try {
    const user = requireOrganizer(req);
    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return { error: 'Hop not found', status: 404 };
    if (hopResult.rows[0].organizer_user_id !== user.sub) return { error: 'Forbidden', status: 403 };

    const venueResult = await db.query(
      'SELECT * FROM venues WHERE id = $1 AND hop_id = $2',
      [venueId, hopResult.rows[0].id]
    );
    if (venueResult.rows.length === 0) return { error: 'Venue not found', status: 404 };
    return { venue: venueResult.rows[0] };
  } catch (e) {
    if (e.message !== 'Unauthorized' && e.message !== 'Forbidden') throw e;
  }

  // Fall back to venue self-service token
  const venueToken = req.headers.get('x-venue-token');
  if (!venueToken) return { error: 'Unauthorized', status: 401 };

  const venueResult = await db.query(
    'SELECT * FROM venues WHERE id = $1 AND stamp_token = $2',
    [venueId, venueToken]
  );
  if (venueResult.rows.length === 0) return { error: 'Forbidden', status: 403 };
  return { venue: venueResult.rows[0] };
}

export async function PUT(req, { params }) {
  try {
    const { hopSlug, venueId } = params;
    const access = await verifyVenueAccess(req, hopSlug, venueId);
    if (access.error) return Response.json({ error: access.error }, { status: access.status });

    const { name, address, description, reward_description, hours, required, sort_order, logo_url } = await req.json();

    const result = await db.query(
      `UPDATE venues
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           description = COALESCE($3, description),
           reward_description = COALESCE($4, reward_description),
           hours = COALESCE($5, hours),
           required = COALESCE($6, required),
           sort_order = COALESCE($7, sort_order),
           logo_url = COALESCE($8, logo_url)
       WHERE id = $9
       RETURNING *`,
      [name, address, description, reward_description, hours, required, sort_order, logo_url, venueId]
    );

    return Response.json({ venue: result.rows[0] });
  } catch (error) {
    console.error('Update venue error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { hopSlug, venueId } = params;
    const access = await verifyVenueAccess(req, hopSlug, venueId);
    if (access.error) return Response.json({ error: access.error }, { status: access.status });

    await db.query('DELETE FROM venues WHERE id = $1', [venueId]);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete venue error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
