# Claude Code Prompt — Profile Refactor: Move Profiles & Photos to Auth Service

## Context

Read `docs/ARCHITECTURE.md` and `services/auth/src/` before starting.

Profiles and photo uploads belong in the auth service — not the kindred service. A profile is who you are across the entire ecosystem. This session moves everything there.

Do all parts in order. No confirmation needed between steps unless something fails.

---

## Part 1 — Auth service: database migration

Add to `services/auth/migrations/` a new file `002_profiles.sql`:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  photo_url TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Part 2 — Auth service: S3 upload endpoint

Add AWS SDK packages:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Create `services/auth/src/upload.js`:

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getUploadUrl(req, res) {
  const { contentType = 'image/jpeg' } = req.body;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const ext = contentType.split('/')[1];
  const key = `profiles/${req.user.id}/${randomUUID()}.${ext}`;
  const bucket = process.env.AWS_S3_BUCKET || 'kindle-upload';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  res.json({ uploadUrl, publicUrl });
}

module.exports = { getUploadUrl };
```

---

## Part 3 — Auth service: profile endpoints

Create `services/auth/src/profiles.js`:

```javascript
const pool = require('./db');

async function getMyProfile(req, res) {
  const result = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ profile: result.rows[0] || null });
}

async function upsertProfile(req, res) {
  const { name, photo_url, birthday } = req.body;
  const result = await pool.query(
    `INSERT INTO profiles (user_id, name, photo_url, birthday)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
     SET name = COALESCE(EXCLUDED.name, profiles.name),
         photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
         birthday = COALESCE(EXCLUDED.birthday, profiles.birthday),
         updated_at = NOW()
     RETURNING *`,
    [req.user.id, name, photo_url, birthday]
  );
  res.json({ profile: result.rows[0] });
}

async function getPublicProfile(req, res) {
  const { userId } = req.params;
  const result = await pool.query(
    'SELECT user_id, name, photo_url, birthday FROM profiles WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ profile: result.rows[0] });
}

async function deleteProfile(req, res) {
  await pool.query('DELETE FROM profiles WHERE user_id = $1', [req.user.id]);
  res.json({ success: true });
}

module.exports = { getMyProfile, upsertProfile, getPublicProfile, deleteProfile };
```

---

## Part 4 — Auth service: wire up routes

In `services/auth/src/index.js`, add:

```javascript
const { getMyProfile, upsertProfile, getPublicProfile, deleteProfile } = require('./profiles');
const { getUploadUrl } = require('./upload');

// Profile routes
app.get('/profile', authenticate, getMyProfile);
app.post('/profile', authenticate, upsertProfile);
app.delete('/profile', authenticate, deleteProfile);
app.get('/profile/:userId', getPublicProfile); // no auth — public

// Upload
app.post('/upload-url', authenticate, getUploadUrl);
```

Add to `.env.example`:
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=kindle-upload
AWS_REGION=us-east-1
```

Add the same AWS env vars to Railway → auth service → Variables (same values as kindred service currently has).

Deploy auth service.

---

## Part 5 — Kindred service: remove profile routes

In `services/kindred/src/index.js`, remove:
- All profile route imports and registrations
- `/profiles/me` GET and DELETE
- `/profiles` POST
- `/profiles/:id` PUT  
- `/profiles/:userId` GET
- `/api/upload-url` POST

Remove `services/kindred/src/profiles.js` and `services/kindred/src/upload.js`.

Deploy kindred service.

---

## Part 6 — Flutter: update ProfileService

In `apps/kindred/lib/services/profile_service.dart`:

- Change all API base URLs from `api.fromkindred.com` to `auth.terryheath.com`
- `GET /profiles/me` → `GET /profile`
- `POST /profiles` → `POST /profile`
- `DELETE /profiles/me` → `DELETE /profile`
- `GET /profiles/:userId` → `GET /profile/:userId`

In `apps/kindred/lib/services/photo_upload_service.dart`:
- Change upload URL base from `api.fromkindred.com` to `auth.terryheath.com`
- Change endpoint from `/api/upload-url` to `/upload-url`

---

## Part 7 — Flutter: cache profile locally

In `profile_service.dart`, after every successful profile load or save:
- Save `name`, `photo_url`, `birthday` to `LocalDb` app_settings as `profile_name`, `profile_photo_url`, `profile_birthday`

On startup, load from local cache first so the profile is available immediately, then sync with API in background.

---

## Part 8 — Flutter: fix AppBar avatar

In `kindred_screen.dart`, wrap `_buildAppBarAvatar()` in a `Consumer<ProfileService>` so it rebuilds when `profileService.photoUrl` changes.

---

## Part 9 — Update fromkindred.com profile page

In `services/kindred-web/`, update the profile page fetch URL from `api.fromkindred.com/profiles/:userId` to `auth.terryheath.com/profile/:userId`.

---

## Rules

- Deploy auth service after Part 4 before touching kindred
- Deploy kindred service after Part 5
- Run `flutter analyze` after Part 8
- Do not add any new dependencies beyond the AWS SDK already used
