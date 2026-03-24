# Claude Code Prompt — Task 2: terryheath.com (Small Things)

Build the terryheath.com website. This is a Next.js app on Railway that serves as:
1. A public blog at terryheath.com
2. A newsletter sender (SES bulk send to ~1,000 subscribers)
3. A private admin hub for writing and backend management

Keep it clean and minimal. The writing experience is the most important thing.

---

## Tech stack

- Next.js (App Router)
- PostgreSQL (Railway Postgres, separate from auth service)
- AWS SES via SMTP (nodemailer) for newsletter sends
- Tiptap for the editor
- `pg` for database access (no ORM)
- No UI component library — write clean, simple CSS

---

## Database migrations

Use the same simple custom migration runner pattern as the auth service.

### `migrate.js` (root level)
Reads all `.sql` files from `/migrations` in filename order. Tracks applied migrations in a `_migrations` table. Run with `node migrate.js`.

Railway deploy command: `node migrate.js && next start`

### `/migrations/001_initial.sql`
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  status TEXT DEFAULT 'draft',
  is_page BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'import',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  suppressed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  recipient_count INTEGER,
  sent_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Admin authentication

- Single admin user (Terry)
- Login page at `/admin/login`
- Form accepts password, checks against `ADMIN_PASSWORD` env var
- On success: sets httpOnly session cookie (`admin_session`) containing a signed token
- Session token signed with `ADMIN_SECRET` env var
- Middleware protects all `/admin/*` routes
- No user table needed — one person, one password, one env var

---

## Public routes

### `/`
List of published posts (not pages), newest first. Shows title, published date, excerpt. Clean, minimal layout. No sidebar, no tags.

### `/[slug]`
Single post. Full HTML content rendered. Title, date, content.

### `/about`
Renders the post where `is_page = TRUE AND slug = 'about'`. If not found, 404.

---

## Admin routes (all protected)

### `/admin` → redirect to `/admin/posts`

### `/admin/posts`
List all posts and pages (title, status, date). Buttons: Edit, Delete. Button to create new post.

### `/admin/posts/new` and `/admin/posts/[id]/edit`
Tiptap editor. Fields:
- Title (text input)
- Slug (auto-generated from title, editable)
- Content (Tiptap — bold, italic, links, headings, blockquote, lists)
- Is Page toggle (checkbox)
- Status toggle: Draft / Published
- Save button
- "Send as Newsletter" button — only visible when status is 'published'. Opens a confirmation modal showing subject line and recipient count before sending.

### `/admin/subscribers`
Table of all subscribers. Shows email, name, status, source, date. Count at top. No bulk actions for now — read only with a delete button per row.

### `/admin/suppressions`
Table of all suppressions. Email, reason, date. Read only.

### `/admin/sends`
Table of all sends. Post title, subject, status, recipient count, sent count, dates.

---

## Newsletter send flow

When "Send as Newsletter" is confirmed:

1. Create a `sends` record with status `pending`
2. Query all subscribers where `status = 'active'` AND email not in suppressions
3. Update send: `status = 'sending'`, `recipient_count = count`
4. Loop through recipients, send each email via SES SMTP
5. Each email includes:
   - Subject: post title (editable in modal before send)
   - From: `terry@terryheath.com`
   - HTML body: post content wrapped in a minimal email template
   - Footer with unsubscribe link: `https://terryheath.com/unsubscribe?email=EMAIL&token=TOKEN`
   - `List-Unsubscribe` header: `<https://terryheath.com/unsubscribe?email=EMAIL&token=TOKEN>`
   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header
6. Increment `sent_count` as sends succeed
7. Update send: `status = 'complete'`, `completed_at = NOW()`

Unsubscribe token: HMAC of email using `UNSUBSCRIBE_SECRET` env var (deterministic — no storage needed).

**Rate limiting:** Send one email per 100ms to stay within SES limits. This is a simple `setTimeout` loop, not a queue.

---

## Unsubscribe endpoint

### GET /unsubscribe?email=EMAIL&token=TOKEN
- Validates token (HMAC check)
- Moves subscriber to suppressions table with reason `unsubscribed`
- Sets subscriber status to `suppressed`
- Shows a simple "You've been unsubscribed" confirmation page

---

## SES webhook (bounces + complaints)

### POST /webhooks/ses
- Accepts SNS notifications from SES
- Handles `Bounce` and `Complaint` event types
- On bounce: add to suppressions (reason: `bounced`), set subscriber status to `suppressed`
- On complaint: add to suppressions (reason: `complaint`), set subscriber status to `suppressed`
- Verify SNS message signature before processing

---

## Import scripts

Build these as standalone Node scripts in `/scripts/`:

### `scripts/import-subscribers.js`
Reads `data/subscribers.csv` (Square export format).
CSV columns: `First Name`, `Last Name`, `Email Address`, `Email Subscription Status`

Rules:
- Skip rows with no email
- `subscribed` or `unknown` status → insert into `subscribers` table as active
- `unsubscribed` or `bounced` → insert into `suppressions` table
- Skip duplicates gracefully (ON CONFLICT DO NOTHING)

Log: total processed, imported as active, imported as suppressed, skipped (no email).

### `scripts/import-posts.js`
Reads `data/posts.json` — a JSON array of post objects:

```json
[
  {
    "title": "working title",
    "slug": "working-slug",
    "content": "<p>HTML content</p>",
    "status": "published",
    "is_page": false,
    "published_at": "2026-01-01T00:00:00Z"
  }
]
```

Terry will create this file manually before running the script. The script just inserts them (ON CONFLICT DO NOTHING on slug).

---

## Email template

Minimal HTML email wrapper for newsletter sends:

```
[Post title as H1]
[Post content]

---
Small Things · terryheath.com
You're receiving this because you subscribed or were a customer at Sinclair Inlet Book Co.
Unsubscribe: [link]
```

Clean, no images, single-column, max-width 600px, system fonts.

---

## Environment variables

```
DATABASE_URL=
ADMIN_PASSWORD=
ADMIN_SECRET=                   # signs admin session cookie
UNSUBSCRIBE_SECRET=             # HMAC key for unsubscribe tokens
SES_SMTP_HOST=
SES_SMTP_PORT=465
SES_SMTP_USER=
SES_SMTP_PASS=
SES_FROM_EMAIL=                 # terry@terryheath.com
NEXT_PUBLIC_BASE_URL=           # https://terryheath.com
```

---

## File structure

```
/
  app/
    page.jsx
    [slug]/page.jsx
    about/page.jsx
    unsubscribe/page.jsx
    admin/
      layout.jsx
      login/page.jsx
      posts/page.jsx
      posts/new/page.jsx
      posts/[id]/edit/page.jsx
      subscribers/page.jsx
      suppressions/page.jsx
      sends/page.jsx
  api/
    webhooks/ses/route.js
    unsubscribe/route.js
    admin/
      posts/route.js
      posts/[id]/route.js
      sends/route.js
      subscribers/route.js
  lib/
    db.js
    email.js
    auth.js
    unsubscribe.js
  scripts/
    import-subscribers.js
    import-posts.js
  data/
    subscribers.csv             # Terry drops Square export here
    posts.json                  # Terry drops this file here before running import
  migrations/
    001_initial.sql
  migrate.js
  package.json
  .env.example
  README.md
```

---

## Design

- Clean, minimal, readable
- No framework CSS — write plain CSS or CSS modules
- Public blog: dark text on white, generous line-height, max-width ~680px centered
- Admin: functional, no decoration — it's just for Terry
- Mobile-readable public side, desktop-first admin is fine

---

## README must include

- All env vars with descriptions
- Railway deploy command: `node migrate.js && next build && next start`
- How to run import scripts (order: migrate → import-subscribers → import-posts)
- How to configure SES SNS webhook
- How to deploy on Railway

---

## Rules

- No TypeScript — plain JavaScript
- No ORM — use `pg` directly  
- No UI component library
- The send loop is synchronous with a 100ms delay — no queues, no background jobs
- Do not add analytics, comments, tags, categories, or any features not listed here
- Tiptap is the only editor — do not use markdown or a textarea
