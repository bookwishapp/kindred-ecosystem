import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { error: 'Password login is no longer supported. Use the magic link.' },
    { status: 410 }
  );
}
