export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const db = require('../../lib/db');

export async function GET() {
  const result = await db.query(
    `SELECT title, slug, excerpt, published_at
     FROM posts
     WHERE status = 'published' AND is_page = false
     ORDER BY published_at DESC
     LIMIT 20`
  );

  const posts = result.rows;
  const baseUrl = 'https://terryheath.com';
  const buildDate = new Date().toUTCString();

  const items = posts.map(post => {
    const url = `${baseUrl}/${post.slug}`;
    const pubDate = new Date(post.published_at).toUTCString();
    const description = post.excerpt
      ? `<![CDATA[${post.excerpt}]]>`
      : '';

    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Small Things</title>
    <link>${baseUrl}</link>
    <description>Letters from the bookstore, the workshop, and everywhere in between.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/small_things.png</url>
      <title>Small Things</title>
      <link>${baseUrl}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
