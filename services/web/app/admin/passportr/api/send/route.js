import passportrAdmin from '../../../../../lib/passportr-admin';
import adminAuth from '../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    adminAuth.requireAdminAuth(req);
    const body = await req.json();
    const res = await passportrAdmin.passportrAdminRequest('/api/admin/send', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr send error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
