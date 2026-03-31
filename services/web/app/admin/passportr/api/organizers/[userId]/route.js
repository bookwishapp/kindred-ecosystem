import passportrAdmin from '../../../../../../lib/passportr-admin';
import adminAuth from '../../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    adminAuth.requireAdminAuth(req);
    const { userId } = params;
    const body = await req.json();
    const res = await passportrAdmin.passportrAdminRequest(`/api/admin/organizers/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr update organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
