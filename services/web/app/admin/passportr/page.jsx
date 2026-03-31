import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function PassportrRedirect() { redirect('/admin/passportr/organizers'); }
