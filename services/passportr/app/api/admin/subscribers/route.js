export const runtime = 'nodejs';

const db = require('../../../../lib/db');

function requireAdminSecret(req) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.PASSPORTR_ADMIN_SECRET) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req) {
  try {
    requireAdminSecret(req);
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const hopSlug = searchParams.get('hop');

    let query = `
      SELECT pp.*, h.name as hop_name
      FROM participant_preferences pp
      LEFT JOIN hops h ON h.id = pp.opted_in_hop_id
      WHERE pp.opt_in = true
    `;
    const params = [];

    if (location) {
      params.push(location);
      query += ` AND pp.zip_code = $${params.length}`;
    }
    if (hopSlug) {
      params.push(hopSlug);
      query += ` AND h.slug = $${params.length}`;
    }

    query += ' ORDER BY pp.opted_in_at DESC';

    const result = await db.query(query, params);
    const totalResult = await db.query(
      'SELECT COUNT(*) as count FROM participant_preferences WHERE opt_in = true'
    );

    return Response.json({
      subscribers: result.rows,
      total: parseInt(totalResult.rows[0].count),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin subscribers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
