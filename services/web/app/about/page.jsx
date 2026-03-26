import { notFound } from 'next/navigation';
import Link from 'next/link';
import db from '../../lib/db';
import HomeActions from '../components/HomeActions';

export const dynamic = 'force-dynamic';

async function getAboutPage() {
  const result = await db.query(
    `SELECT id, title, content
     FROM posts
     WHERE slug = 'about' AND is_page = true AND status = 'published'`
  );
  return result.rows[0];
}

export default async function AboutPage() {
  const page = await getAboutPage();

  if (!page) {
    notFound();
  }

  return (
    <>
      <header className="site-header">
        <h1 className="site-title">Small Things</h1>
        <p className="site-author">Terry Heath</p>
        <nav className="site-nav">
          <Link href="/">Letters</Link>
          <Link href="/about">About</Link>
        </nav>
      </header>

      <HomeActions />

      <article className="post-container">
        <div className="post-content">
          <h1 style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            fontSize: '32px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            {page.title}
          </h1>
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </div>
      </article>
    </>
  );
}