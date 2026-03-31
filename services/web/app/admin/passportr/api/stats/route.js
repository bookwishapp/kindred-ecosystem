export const runtime = 'nodejs';

const { getStats } = require('../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdmin(req);
    const stats = await getStats();
    return Response.json(stats);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
