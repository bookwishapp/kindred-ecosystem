import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
  const { userId } = params;
  const body = await request.json();

  const res = await fetch(
    `${process.env.PASSPORTR_BASE_URL}/api/admin/organizers/${userId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`,
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
