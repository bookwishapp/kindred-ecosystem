import db from '../lib/db';
import Link from 'next/link';
import HomeActions from './components/HomeActions';

export const dynamic = 'force-dynamic';

async function getPosts() {
  const result = await db.query(
    `SELECT id, title, slug, excerpt, published_at
     FROM posts
     WHERE status = 'published' AND is_page = false
     ORDER BY published_at DESC`
  );
  return result.rows;
}

export default async function HomePage() {
  const posts = await getPosts();

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

      <main className="post-container">
        <div className="post-list">
          {posts.length === 0 ? (
            <p className="no-posts">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="post-item">
                <h2 className="post-title">
                  <Link href={`/${post.slug}`}>{post.title}</Link>
                </h2>
                <time className="post-date">
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                {post.excerpt && (
                  <p className="post-excerpt">{post.excerpt}</p>
                )}
              </article>
            ))
          )}
        </div>
      </main>
    </>
  );
}