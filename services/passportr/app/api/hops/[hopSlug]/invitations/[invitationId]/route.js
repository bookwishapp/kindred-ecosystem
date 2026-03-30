export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

async function verifyOwnership(user, hopSlug, invitationId) {
  const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
  if (hopResult.rows.length === 0) return { error: 'Hop not found', status: 404 };
  const hop = hopResult.rows[0];
  if (hop.organizer_user_id !== user.sub) return { error: 'Forbidden', status: 403 };

  const invResult = await db.query(
    'SELECT * FROM venue_invitations WHERE id = $1 AND hop_id = $2',
    [invitationId, hop.id]
  );
  if (invResult.rows.length === 0) return { error: 'Invitation not found', status: 404 };
  return { hop, invitation: invResult.rows[0] };
}

export async function DELETE(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug, invitationId } = params;

    const check = await verifyOwnership(user, hopSlug, invitationId);
    if (check.error) return Response.json({ error: check.error }, { status: check.status });

    await db.query('DELETE FROM venue_invitations WHERE id = $1', [invitationId]);
    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Delete invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug, invitationId } = params;

    const check = await verifyOwnership(user, hopSlug, invitationId);
    if (check.error) return Response.json({ error: check.error }, { status: check.status });

    const { status } = await req.json();
    if (!['pending', 'cancelled'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await db.query(
      'UPDATE venue_invitations SET status = $1 WHERE id = $2 RETURNING *',
      [status, invitationId]
    );

    return Response.json({ invitation: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Update invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
