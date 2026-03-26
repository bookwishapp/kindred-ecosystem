import { notFound } from 'next/navigation';
import Link from 'next/link';
import db from '../../lib/db';
import HomeActions from '../components/HomeActions';

export const dynamic = 'force-dynamic';

async function getPost(slug) {
  const result = await db.query(
    `SELECT id, title, content, published_at
     FROM posts
     WHERE slug = $1 AND status = 'published' AND is_page = false`,
    [slug]
  );
  return result.rows[0];
}

export default async function PostPage({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
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

      <article>
        <header className="post-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            {new Date(post.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <footer className="post-footer">
          <Link href="/">← Back to Letters</Link>
        </footer>
      </article>
    </>
  );
}