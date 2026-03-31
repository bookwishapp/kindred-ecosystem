import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldPostsRedirect() { redirect('/admin/small-things/posts'); }
