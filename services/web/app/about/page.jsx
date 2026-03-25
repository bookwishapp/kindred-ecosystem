import { notFound } from 'next/navigation';
import Link from 'next/link';
import db from '../../lib/db';

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
    <div className="container">
      <header className="header">
        <div className="header-content">
          <h1>
            <Link href="/">Terry Heath</Link>
          </h1>
          <nav>
            <Link href="/about">About</Link>
          </nav>
        </div>
      </header>

      <article>
        <h1 className="post-title">{page.title}</h1>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
}