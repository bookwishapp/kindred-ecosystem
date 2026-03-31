import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldSendsRedirect() { redirect('/admin/small-things/sends'); }
