import { NextResponse } from 'next/server';
import { clearAuthCookie } from '../../../../lib/auth';

export async function GET() {
  const response = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  clearAuthCookie(response);
  return response;
}