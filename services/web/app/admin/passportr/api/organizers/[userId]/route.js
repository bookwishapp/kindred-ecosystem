export const runtime = 'nodejs';

const { updateOrganizer } = require('../../../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../../../lib/admin-auth');

export async function PUT(req, { params }) {
  try {
    requireAdmin(req);
    const { userId } = params;
    const body = await req.json();
    const data = await updateOrganizer(userId, body);
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr update organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
