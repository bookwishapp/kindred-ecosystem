import Link from 'next/link';
import db from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPosts() {
  const result = await db.query(
    `SELECT id, title, slug, status, is_page, published_at, created_at
     FROM posts
     ORDER BY created_at DESC`
  );
  return result.rows;
}

async function deletePost(formData) {
  'use server';
  const id = formData.get('id');
  await db.query('DELETE FROM posts WHERE id = $1', [id]);
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>Posts</h1>
        <Link href="/admin/posts/new" className="btn">
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link href={`/admin/posts/${post.id}/edit`}>
                    {post.title}
                  </Link>
                </td>
                <td>{post.is_page ? 'Page' : 'Post'}</td>
                <td>{post.status}</td>
                <td>
                  {new Date(post.published_at || post.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="btn btn-small"
                    >
                      Edit
                    </Link>
                    <form action={deletePost} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={post.id} />
                      <button
                        type="submit"
                        className="btn btn-danger btn-small"
                        onClick={(e) => {
                          if (!confirm('Are you sure you want to delete this post?')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}