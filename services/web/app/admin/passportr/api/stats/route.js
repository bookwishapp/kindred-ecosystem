import passportrAdmin from '../../../../../lib/passportr-admin';
import adminAuth from '../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    adminAuth.requireAdminAuth(req);
    const res = await passportrAdmin.passportrAdminRequest('/api/admin/stats');
    const stats = await res.json();
    return Response.json(stats);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
