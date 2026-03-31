import passportrAdmin from '../../../../../lib/passportr-admin';
import adminAuth from '../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    adminAuth.requireAdminAuth(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const res = await passportrAdmin.passportrAdminRequest(`/api/admin/subscribers${query ? '?' + query : ''}`);
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr subscribers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
