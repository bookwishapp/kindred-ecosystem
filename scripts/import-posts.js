const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importPosts() {
  const jsonPath = path.join(__dirname, '..', 'data', 'posts.json');

  if (!fs.existsSync(jsonPath)) {
    console.log('No posts.json file found in /data directory');
    return;
  }

  let posts;
  try {
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    posts = JSON.parse(jsonContent);
  } catch (error) {
    console.error('Error parsing posts.json:', error.message);
    return;
  }

  if (!Array.isArray(posts)) {
    console.error('posts.json must contain an array of posts');
    return;
  }

  let totalProcessed = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const client = await pool.connect();

  try {
    for (const post of posts) {
      totalProcessed++;

      const {
        title,
        slug,
        content,
        excerpt,
        status = 'published',
        is_page = false,
        published_at,
        scheduled_at
      } = post;

      if (!title || !slug) {
        console.warn(`Skipping post without title or slug`);
        skipped++;
        continue;
      }

      try {
        await client.query('BEGIN');

        const result = await client.query(
          `INSERT INTO posts (
            title, slug, content, excerpt, status, is_page,
            published_at, scheduled_at, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()), NOW())
          ON CONFLICT (slug) DO NOTHING
          RETURNING id`,
          [
            title,
            slug,
            content || '',
            excerpt || null,
            status,
            is_page,
            status === 'published' ? (published_at || new Date()) : null,
            status === 'scheduled' ? scheduled_at : null,
            published_at || null
          ]
        );

        if (result.rows.length > 0) {
          imported++;
          console.log(`✓ Imported: ${title}`);
        } else {
          skipped++;
          console.log(`○ Skipped (duplicate slug): ${title}`);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to import "${title}":`, error.message);
        failed++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total posts processed: ${totalProcessed}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importPosts();