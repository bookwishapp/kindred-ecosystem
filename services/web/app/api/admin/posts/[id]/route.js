import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await db.query(
      `SELECT id, title, slug, content, excerpt, status, is_page,
              published_at, scheduled_at, created_at, updated_at
       FROM posts
       WHERE id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, is_page, status, scheduled_at } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      );
    }

    // Validate scheduling
    if (status === 'scheduled' && !scheduled_at) {
      return NextResponse.json(
        { error: 'Scheduled date is required for scheduled posts' },
        { status: 400 }
      );
    }

    // Get current post to check status changes
    const currentPost = await db.query(
      'SELECT status, published_at FROM posts WHERE id = $1',
      [params.id]
    );

    if (currentPost.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Determine published_at
    let published_at = currentPost.rows[0].published_at;
    if (status === 'published' && currentPost.rows[0].status !== 'published') {
      published_at = new Date();
    } else if (status === 'draft' || status === 'scheduled') {
      published_at = null;
    }

    const result = await db.query(
      `UPDATE posts
       SET title = $1, slug = $2, content = $3, is_page = $4,
           status = $5, scheduled_at = $6, published_at = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, slug, content || '', is_page || false, status || 'draft',
       status === 'scheduled' ? scheduled_at : null, published_at, params.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  // Verify auth
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.query(
      'DELETE FROM posts WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}