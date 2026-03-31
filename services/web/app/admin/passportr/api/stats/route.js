export const runtime = 'nodejs';

const { passportrAdminRequest } = require('../../../../../lib/passportr-admin');
const { requireAdminAuth } = require('../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdminAuth(req);
    const res = await passportrAdminRequest('/api/admin/stats');
    const stats = await res.json();
    return Response.json(stats);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
