import { NextResponse } from 'next/server';
import { requireOrganizer } from '@/lib/auth';
import { query } from '@/lib/db';
import { sendVenueInvitation } from '@/lib/email';

export async function POST(req, { params }) {
  const { user, profile } = await requireOrganizer(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { hopSlug, invitationId } = params;

  // Get the invitation
  const result = await query(
    `SELECT vi.*, h.name as hop_name, h.slug as hop_slug
     FROM venue_invitations vi
     JOIN hops h ON h.id = vi.hop_id
     WHERE vi.id = $1 AND h.slug = $2`,
    [invitationId, hopSlug]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  const invitation = result.rows[0];

  // Resend the invitation email
  await sendVenueInvitation({
    to: invitation.email,
    venueName: invitation.venue_name,
    hopName: invitation.hop_name,
    hopSlug: invitation.hop_slug,
    invitationId: invitation.id,
  });

  // Update sent_at timestamp
  await query(
    `UPDATE venue_invitations SET sent_at = NOW() WHERE id = $1`,
    [invitationId]
  );

  return NextResponse.json({ status: 'resent' });
}
