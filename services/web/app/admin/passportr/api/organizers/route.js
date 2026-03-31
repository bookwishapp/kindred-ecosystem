export const runtime = 'nodejs';

const { getOrganizers } = require('../../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdmin(req);
    const data = await getOrganizers();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr organizers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
