export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

async function verifyOwnership(user, hopSlug, participantId) {
  const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
  if (hopResult.rows.length === 0) return { error: 'Hop not found', status: 404 };
  const hop = hopResult.rows[0];
  if (hop.organizer_user_id !== user.sub) return { error: 'Forbidden', status: 403 };

  const participantResult = await db.query(
    'SELECT * FROM participants WHERE id = $1 AND hop_id = $2',
    [participantId, hop.id]
  );
  if (participantResult.rows.length === 0) return { error: 'Participant not found', status: 404 };
  return { hop, participant: participantResult.rows[0] };
}

export async function DELETE(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug, participantId } = params;

    const check = await verifyOwnership(user, hopSlug, participantId);
    if (check.error) return Response.json({ error: check.error }, { status: check.status });

    // Deletes stamps and redemptions via CASCADE
    await db.query('DELETE FROM participants WHERE id = $1', [participantId]);
    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Delete participant error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
