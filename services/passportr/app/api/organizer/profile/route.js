export const runtime = 'nodejs';

const { requireOrganizer } = require('../../../../lib/auth');

export async function GET(req) {
  try {
    const { user, profile } = await requireOrganizer(req);
    return Response.json({ profile });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Forbidden') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get organizer profile error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
