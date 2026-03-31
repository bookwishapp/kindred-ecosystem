export const runtime = 'nodejs';

const { passportrAdminRequest } = require('../../../../../../lib/passportr-admin');
const { requireAdminAuth } = require('../../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdminAuth(req);
    const res = await passportrAdminRequest('/api/admin/organizers');
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr organizers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
