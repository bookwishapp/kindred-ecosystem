import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldSubscribersRedirect() { redirect('/admin/small-things/subscribers'); }
