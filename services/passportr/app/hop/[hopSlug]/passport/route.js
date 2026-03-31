export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const jwt = require('jsonwebtoken');
const db = require('../../../../lib/db');

export async function GET(req, { params }) {
  const { hopSlug } = params;

  const cookieStore = cookies();
  const token = cookieStore.get('passportr_token')?.value;

  if (!token) {
    return redirect(`/hop/${hopSlug}`);
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.sub;
  } catch {
    return redirect(`/hop/${hopSlug}`);
  }

  // Look up participant record for this user + hop
  const result = await db.query(
    `SELECT p.user_id FROM participants p
     JOIN hops h ON h.id = p.hop_id
     WHERE h.slug = $1 AND p.user_id = $2`,
    [hopSlug, userId]
  );

  if (result.rows.length === 0) {
    // Authenticated but not a participant in this hop
    return redirect(`/hop/${hopSlug}?not_found=1`);
  }

  return redirect(`/${userId}/${hopSlug}`);
}
