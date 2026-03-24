import db from '../lib/db';
import Link from 'next/link';

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

      <main>
        {posts.length === 0 ? (
          <p className="text-center">No posts yet.</p>
        ) : (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id} className="post-item">
                <h2>
                  <Link href={`/${post.slug}`}>{post.title}</Link>
                </h2>
                <div className="post-meta">
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                {post.excerpt && (
                  <p className="post-excerpt">{post.excerpt}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}