import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request) {
  // Verify auth (simplified check for Edge Runtime)
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await db.query(
      `SELECT id, title, slug, content, excerpt, status, is_page,
              published_at, scheduled_at, created_at, updated_at
       FROM posts
       ORDER BY created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    // Set published_at based on status
    let published_at = null;
    if (status === 'published') {
      published_at = new Date();
    }

    const result = await db.query(
      `INSERT INTO posts (title, slug, content, is_page, status, scheduled_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, slug, content || '', is_page || false, status || 'draft',
       status === 'scheduled' ? scheduled_at : null, published_at]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}