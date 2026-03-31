import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function AdminPage() {
  redirect('/admin/overview');
}
