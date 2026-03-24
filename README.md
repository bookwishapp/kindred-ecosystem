# terryheath.com

A minimal Next.js blog with newsletter functionality for Terry Heath's Small Things newsletter.

## Features

- Public blog at terryheath.com
- Newsletter sender with AWS SES (bulk send to ~1,000 subscribers)
- Private admin hub for writing and backend management
- Post scheduling with automatic newsletter sends
- Tiptap rich text editor
- Simple, clean design focused on the writing experience
- No ORM, no UI component library — just clean, simple code

## Tech Stack

- **Next.js** (App Router)
- **PostgreSQL** (Railway Postgres)
- **AWS SES** via SMTP (nodemailer) for newsletter sends
- **Tiptap** for the rich text editor
- **pg** for direct database access

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Admin Authentication
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_SECRET=random-32-character-secret-for-signing-cookies

# Email Security
UNSUBSCRIBE_SECRET=random-32-character-secret-for-unsubscribe-tokens

# AWS SES SMTP Configuration
SES_SMTP_HOST=email-smtp.us-west-2.amazonaws.com
SES_SMTP_PORT=465
SES_SMTP_USER=your-ses-smtp-username
SES_SMTP_PASS=your-ses-smtp-password
SES_FROM_EMAIL=terry@terryheath.com

# Application
NEXT_PUBLIC_BASE_URL=https://terryheath.com

# Cron Job Security
CRON_SECRET=random-32-character-secret-for-cron-auth
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Run migrations to create the database schema:

```bash
npm run migrate
```

### 3. Import Data

If you have existing subscribers and posts:

1. Place your Square subscriber export at `data/subscribers.csv`
2. Create a `data/posts.json` file with your posts
3. Run the import scripts:

```bash
npm run import:subscribers
npm run import:posts
```

### Import File Formats

**subscribers.csv** (Square export format):
```csv
First Name,Last Name,Email Address,Email Subscription Status
John,Doe,john@example.com,subscribed
Jane,Smith,jane@example.com,unsubscribed
```

**posts.json**:
```json
[
  {
    "title": "My First Post",
    "slug": "my-first-post",
    "content": "<p>HTML content here</p>",
    "status": "published",
    "is_page": false,
    "published_at": "2026-01-01T00:00:00Z"
  }
]
```

## Railway Deployment

### Deploy Command

```bash
node migrate.js && next build && next start
```

### Setting up the Cron Service

To enable automatic publishing of scheduled posts and newsletter sends:

1. Create a new service in Railway for the cron job
2. Use Railway's cron syntax to run the job hourly
3. The cron service should make a POST request to:
   ```
   https://terryheath.com/api/cron/send
   ```
   With header:
   ```
   x-cron-secret: YOUR_CRON_SECRET
   ```

Use Railway's cron syntax in a `railway.json`:
```json
{
  "cron": "0 * * * *"
}
```

Alternative example (for reference only - use railway.json approach above):
```javascript
// cron-service.js
const fetch = require('node-fetch');

async function runScheduledSend() {
  try {
    const response = await fetch('https://terryheath.com/api/cron/send', {
      method: 'POST',
      headers: {
        'x-cron-secret': process.env.CRON_SECRET
      }
    });
    const data = await response.json();
    console.log('Cron run result:', data);
  } catch (error) {
    console.error('Cron error:', error);
  }
}

// Run every hour
setInterval(runScheduledSend, 60 * 60 * 1000);
runScheduledSend(); // Run once on startup
```

## AWS SES Configuration

### 1. Verify Your Domain

1. Go to AWS SES Console
2. Verify your domain (terryheath.com)
3. Add the required DNS records

### 2. Create SMTP Credentials

1. In SES Console, go to "SMTP Settings"
2. Create SMTP credentials
3. Save the username and password for your env vars

### 3. Configure SNS for Bounces and Complaints

1. Create an SNS topic for SES notifications
2. Subscribe your webhook endpoint: `https://terryheath.com/api/webhooks/ses`
3. In SES, configure your verified domain to send bounces and complaints to this SNS topic

### 4. Request Production Access

By default, SES is in sandbox mode. Request production access to:
- Remove the recipient verification requirement
- Increase sending limits

## Admin Usage

### Accessing the Admin

Navigate to `/admin` and login with your `ADMIN_PASSWORD`.

### Creating and Scheduling Posts

1. Go to Admin → Posts
2. Click "New Post"
3. Write your post using the Tiptap editor
4. Choose status:
   - **Draft**: Save for later
   - **Scheduled**: Set a future date/time for automatic publishing and newsletter send
   - **Published**: Publish immediately
5. Published posts can be sent as newsletters using the "Send as Newsletter" button

### Managing Subscribers

- View all subscribers at Admin → Subscribers
- Check suppressions (unsubscribes, bounces, complaints) at Admin → Suppressions
- Monitor newsletter sends at Admin → Sends

### Post Scheduling

When you schedule a post:
1. Set status to "Scheduled"
2. Choose the date and time
3. The cron job will automatically:
   - Publish the post at the scheduled time
   - Send it as a newsletter to all active subscribers

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/
  app/                      # Next.js app router pages
    page.jsx               # Home page (blog listing)
    [slug]/page.jsx        # Individual post page
    about/page.jsx         # About page
    admin/                 # Admin interface
  api/                     # API routes
    admin/                 # Protected admin APIs
    webhooks/ses/          # SES bounce/complaint webhook
    cron/send/             # Scheduled post publishing
  components/              # React components
    PostEditor.jsx         # Tiptap editor component
    SendModal.jsx          # Newsletter send confirmation
  lib/                     # Utility modules
    db.js                  # Database connection
    auth.js                # Admin authentication
    email.js               # Email sending with SES
    unsubscribe.js         # Unsubscribe token handling
  scripts/                 # Import scripts
    import-subscribers.js  # Import from CSV
    import-posts.js        # Import from JSON
  migrations/              # Database migrations
    001_initial.sql        # Initial schema
    002_scheduling.sql     # Post scheduling support
  migrate.js               # Migration runner
```

## Security Notes

- Admin authentication uses a single password (no user table)
- Session cookies are httpOnly and signed with `ADMIN_SECRET`
- Unsubscribe tokens are HMAC-based (deterministic, no storage needed)
- All admin routes are protected by middleware
- SES webhook should verify SNS signatures (implement in production)
- Cron endpoint is protected by `CRON_SECRET` header

## Rate Limiting

Newsletter sends are rate-limited to one email per 100ms to stay within SES limits. This is implemented as a simple setTimeout loop, not a queue system.

## Notes

- No TypeScript — plain JavaScript throughout
- No ORM — direct SQL queries with `pg`
- No UI component library — custom CSS
- No background job queue — synchronous send with delays
- Mobile-readable public side, desktop-first admin

## License

Private project for Terry Heath.