import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const res = await fetch(`${process.env.PASSPORTR_BASE_URL}/api/admin/organizers`, {
    headers: { 'Authorization': `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
