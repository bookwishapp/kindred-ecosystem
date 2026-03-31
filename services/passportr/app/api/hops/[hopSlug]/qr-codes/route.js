export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const QRCode = require('qrcode');
const JSZip = require('jszip');

export async function GET(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const venuesResult = await db.query(
      'SELECT * FROM venues WHERE hop_id = $1 ORDER BY sort_order',
      [hop.id]
    );
    const venues = venuesResult.rows;

    if (venues.length === 0) {
      return Response.json({ error: 'No venues found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const zip = new JSZip();
    const folder = zip.folder(hop.slug);

    for (const venue of venues) {
      const safeName = venue.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      const stampBuffer = await QRCode.toBuffer(
        `${baseUrl}/stamp/${venue.stamp_token}`,
        { width: 600, margin: 2 }
      );
      const redeemBuffer = await QRCode.toBuffer(
        `${baseUrl}/redeem/${venue.redeem_token}`,
        { width: 600, margin: 2 }
      );

      folder.file(`${safeName}_stamp.png`, stampBuffer);
      folder.file(`${safeName}_redeem.png`, redeemBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${hop.slug}-qr-codes.zip"`,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('QR zip error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
