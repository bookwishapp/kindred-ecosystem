import { notFound } from 'next/navigation';
import Link from 'next/link';
import db from '../../lib/db';

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
        <header className="post-header">
          <h1 className="post-title">{post.title}</h1>
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
      </article>
    </div>
  );
}