# Associations — Scaffold Prompt

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt scaffolds two new pieces of the kindred-ecosystem monorepo:

1. `apps/associations/` — Electron desktop app (Mac, V1)
2. `services/associations-api/` — Node/Express backend on Railway

Both are new. Nothing exists yet. Build the skeleton — structure, dependencies, configuration, and enough working code to confirm each piece runs. No placeholder UI beyond what's needed to verify the app launches. No stub routes beyond what's needed to verify the server starts and auth works.

---

## Task A — Monorepo additions

In the root `melos.yaml` or equivalent monorepo config, register the new packages if needed. No changes to existing entries.

---

## Task B — `services/associations-api/`

A Node/Express service. Follows the exact same patterns as `services/auth/` and `services/kindred/`.

### B1 — Structure

```
services/associations-api/
  src/
    index.js
    routes/
      auth.js          → proxy to auth.terryheath.com, same pattern as other services
      users.js         → GET /users/me — current user profile + subscription status
      qa.js            → POST /qa/question — generate a Q&A question via Claude
      subscriptions.js → Stripe webhook + portal
  lib/
    db.js
    auth.js            → JWT verification, same shared secret
    claude.js          → Anthropic API client
    stripe.js          → Stripe client
  migrate.js
  migrations/
    001_initial.sql
  package.json
  .env.example
```

### B2 — `migrations/001_initial.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_words_used INTEGER DEFAULT 0,
  trial_exhausted_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX users_user_id_idx ON users(user_id);
CREATE INDEX users_stripe_customer_idx ON users(stripe_customer_id);
```

`subscription_status` values: `'trial'`, `'active'`, `'past_due'`, `'canceled'`

### B3 — `src/index.js`

Standard Express setup. Port from `process.env.PORT`. CORS restricted to the Electron app origin and localhost for development. Routes mounted at:

- `POST /auth/request` → proxy to `AUTH_BASE_URL/auth/request`
- `GET /auth/verify` → proxy to `AUTH_BASE_URL/auth/verify`
- `GET /users/me` → requires auth
- `POST /users/words` → increment trial word count, requires auth
- `POST /qa/question` → generate Q&A question via Claude, requires auth + active subscription or trial not exhausted
- `POST /stripe/webhook` → Stripe webhook
- `POST /stripe/portal` → create Stripe customer portal session, requires auth

### B4 — `lib/auth.js`

Same pattern as other services — verify JWT using shared `JWT_SECRET`, read from Authorization header.

```js
const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = verifyToken(authHeader.slice(7));
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

module.exports = { verifyToken, requireAuth };
```

### B5 — `src/routes/users.js`

```js
const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

const TRIAL_WORD_LIMIT = 15000;

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    let result = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (result.rows.length === 0) {
      // First time — create user record
      result = await db.query(
        `INSERT INTO users (user_id, email)
         VALUES ($1, $2)
         RETURNING *`,
        [req.user.sub, req.user.email]
      );
    }

    const user = result.rows[0];
    const trialRemaining = Math.max(0, TRIAL_WORD_LIMIT - user.trial_words_used);
    const canWrite = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && trialRemaining > 0);

    return res.json({
      user_id: user.user_id,
      email: user.email,
      subscription_status: user.subscription_status,
      trial_words_used: user.trial_words_used,
      trial_words_remaining: trialRemaining,
      trial_word_limit: TRIAL_WORD_LIMIT,
      can_write: canWrite,
    });
  } catch (error) {
    console.error('GET /users/me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/words — increment trial word count
router.post('/words', requireAuth, async (req, res) => {
  try {
    const { count } = req.body;
    if (!count || typeof count !== 'number' || count < 0) {
      return res.status(400).json({ error: 'Invalid count' });
    }

    const result = await db.query(
      `UPDATE users
       SET trial_words_used = trial_words_used + $1,
           trial_exhausted_at = CASE
             WHEN trial_words_used + $1 >= $2 AND trial_exhausted_at IS NULL
             THEN NOW()
             ELSE trial_exhausted_at
           END,
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING trial_words_used, subscription_status`,
      [count, TRIAL_WORD_LIMIT, req.user.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const trialRemaining = Math.max(0, TRIAL_WORD_LIMIT - user.trial_words_used);
    const canWrite = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && trialRemaining > 0);

    return res.json({
      trial_words_used: user.trial_words_used,
      trial_words_remaining: trialRemaining,
      can_write: canWrite,
    });
  } catch (error) {
    console.error('POST /users/words error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### B6 — `src/routes/qa.js`

```js
const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /qa/question
router.post('/question', requireAuth, async (req, res) => {
  try {
    // Verify user can access Q&A
    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const canAccess = user.subscription_status === 'active'
      || user.subscription_status === 'past_due'
      || (user.subscription_status === 'trial' && user.trial_words_used < 15000);

    if (!canAccess) {
      return res.status(403).json({ error: 'Subscription required' });
    }

    const { excerpt, context } = req.body;

    if (!excerpt) {
      return res.status(400).json({ error: 'excerpt required' });
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `You are reading a writer's private work. Your only job is to ask one question — a single interrogative sentence — about a specific gap, tension, or unresolved detail you notice in what they've written.

Rules:
- One question only
- Never give advice
- Never make observations
- Never explain why you're asking
- Ask about something specific in the text, never something generic
- The question should feel like it came from the work itself

Writer's excerpt:
${excerpt}

${context ? `Additional context from their writing:\n${context}` : ''}

Ask one question.`
        }
      ]
    });

    const question = message.content[0].text.trim();

    return res.json({ question });
  } catch (error) {
    console.error('POST /qa/question error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### B7 — `src/routes/subscriptions.js`

```js
const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        await db.query(
          `UPDATE users
           SET subscription_status = 'active',
               stripe_customer_id = $1,
               stripe_subscription_id = $2,
               subscribed_at = NOW(),
               updated_at = NOW()
           WHERE user_id = $3`,
          [session.customer, session.subscription, userId]
        );
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        await db.query(
          `UPDATE users
           SET subscription_status = 'active',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [invoice.subscription]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'canceled'
          : 'trial';

        await db.query(
          `UPDATE users
           SET subscription_status = $1,
               updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [status, sub.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        await db.query(
          `UPDATE users
           SET subscription_status = 'canceled',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [event.data.object.id]
        );
        break;
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Handler failed' });
  }
});

// POST /stripe/portal
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT stripe_customer_id FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: 'associations://billing/return',
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### B8 — `package.json`

```json
{
  "name": "associations-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0",
    "stripe": "^14.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### B9 — `.env.example`

```
DATABASE_URL=postgresql://...
JWT_SECRET=                     # same as auth service
AUTH_BASE_URL=https://auth.terryheath.com
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_ANNUAL=
PORT=3000
NODE_ENV=production
```

### B10 — Railway setup

Create a new Railway service named `associations-api` with a dedicated Postgres database. Deploy command: `node migrate.js && node src/index.js`. Add all env vars from `.env.example`.

---

## Task C — `apps/associations/`

Electron + Vite + React. Mac only for V1.

### C1 — Structure

```
apps/associations/
  docs/
    ASSOCIATIONS_ARCHITECTURE.md  ← already exists
  electron/
    main.js          → Electron main process
    preload.js       → contextBridge API
  src/
    App.jsx
    main.jsx
    api/
      client.js      → HTTP client for associations-api
    store/
      auth.js        → auth state (token in keychain via electron)
      user.js        → user profile + subscription status
      project.js     → current project
    components/
      Compose.jsx    → full-screen writing surface
      Ghost.jsx      → ghost overlay component
      Capture.jsx    → fragment capture
      QA.jsx         → Q&A mode
      Outline.jsx    → outline view (stub for V1)
    db/
      index.js       → better-sqlite3 pool
      schema.js      → local database schema
      embeddings.js  → Transformers.js embedding generation
    styles/
      globals.css
  index.html
  vite.config.js
  package.json
  .env.example
```

### C2 — `package.json`

```json
{
  "name": "associations",
  "version": "0.1.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "@xenova/transformers": "^2.17.0",
    "better-sqlite3": "^9.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "concurrently": "^8.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.28.0"
  }
}
```

### C3 — `electron/main.js`

```js
const { app, BrowserWindow, protocol, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Register deep link protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('associations', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('associations');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F5F3EF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Handle deep link auth callback — associations://auth/verify?access_token=...
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
  }
});
```

### C4 — `electron/preload.js`

```js
const { contextBridge, ipcRenderer, safeStorage } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Auth token storage using OS keychain
  saveToken: (token) => ipcRenderer.invoke('save-token', token),
  getToken: () => ipcRenderer.invoke('get-token'),
  clearToken: () => ipcRenderer.invoke('clear-token'),

  // Deep link handler
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_, url) => callback(url)),

  // Open external URLs
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Platform info
  platform: process.platform,
});
```

### C5 — `src/db/schema.js`

Local SQLite schema. This is the pool and project data — lives entirely on the user's machine.

```js
const db = require('./index');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      use_global_pool INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pool_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      word_count INTEGER DEFAULT 0,
      tagged INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kept_ghosts (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      pool_entry_id TEXT NOT NULL,
      passage_offset INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (pool_entry_id) REFERENCES pool_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watched_folders (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      path TEXT NOT NULL,
      last_scanned TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qa_pairs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      answered_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

module.exports = { initSchema };
```

### C6 — `src/styles/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&family=Lora:ital,wght@0,400;1,400&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #F5F3EF;
  --surface: #FAFAF8;
  --text: #2A2825;
  --text-muted: #6A6660;
  --text-faint: #C8C4BC;
  --border: rgba(42, 40, 37, 0.07);
  --shadow: rgba(42, 40, 37, 0.06);
}

html, body, #root {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'Lora', serif;
  -webkit-font-smoothing: antialiased;
}

/* Paper texture */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

#root {
  position: relative;
  z-index: 1;
}
```

### C7 — `src/App.jsx`

Minimal — just enough to confirm the app renders, auth state is checked, and routing between modes works.

```jsx
import { useState, useEffect } from 'react';
import './styles/globals.css';
import Compose from './components/Compose';

export default function App() {
  const [mode, setMode] = useState('compose');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = await window.electron.getToken();
      setAuthed(!!token);
      setChecking(false);
    }
    checkAuth();

    // Listen for deep link auth callback
    window.electron.onDeepLink((url) => {
      const params = new URL(url);
      const token = params.searchParams.get('access_token');
      if (token) {
        window.electron.saveToken(token).then(() => setAuthed(true));
      }
    });
  }, []);

  if (checking) return null;

  if (!authed) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <p style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)'
        }}>
          Associations
        </p>
        <button
          onClick={() => {
            const url = `${import.meta.env.VITE_API_BASE_URL}/auth/request`;
            window.electron.openExternal(
              `https://auth.terryheath.com/auth/request?redirect_uri=associations://auth/verify&app_name=Associations`
            );
          }}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '13px',
            background: 'none',
            border: '0.5px solid var(--text-faint)',
            color: 'var(--text-muted)',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            letterSpacing: '0.06em'
          }}
        >
          Sign in
        </button>
      </div>
    );
  }

  return <Compose />;
}
```

### C8 — `src/components/Compose.jsx`

Minimal stub — just the writing surface with corner labels. Ghost mechanic and word counting come in the next prompt.

```jsx
import { useState, useRef } from 'react';

export default function Compose() {
  const [content, setContent] = useState('');
  const editorRef = useRef(null);

  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;

  return (
    <div style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Corner labels */}
      <span style={{
        position: 'absolute', top: 16, left: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-faint)', zIndex: 10
      }}>
        Associations
      </span>

      <span style={{
        position: 'absolute', top: 16, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em', zIndex: 10
      }}>
        Untitled
      </span>

      <span style={{
        position: 'absolute', bottom: 14, right: 20,
        fontFamily: "'Poppins', sans-serif", fontSize: '10px',
        color: 'var(--text-faint)', letterSpacing: '0.06em', zIndex: 10
      }}>
        {wordCount} words
      </span>

      {/* Writing surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent(e.currentTarget.innerText)}
        style={{
          position: 'absolute',
          inset: 0,
          padding: '64px 10vw',
          fontFamily: "'Lora', serif",
          fontSize: '20px',
          lineHeight: '2',
          color: 'var(--text)',
          outline: 'none',
          overflowY: 'auto',
          caretColor: 'var(--text-muted)',
        }}
      />
    </div>
  );
}
```

---

## Verification Checklist

**associations-api:**
- [ ] `npm install` runs without errors
- [ ] `node migrate.js` runs and creates tables
- [ ] `node src/index.js` starts on configured port
- [ ] `GET /users/me` with a valid JWT returns user object
- [ ] Railway service created, env vars added, deploys successfully

**associations Electron app:**
- [ ] `npm install` runs without errors
- [ ] `npm run dev` launches Electron window
- [ ] App shows sign-in screen when no token present
- [ ] Writing surface renders and accepts input
- [ ] Word count updates as you type
- [ ] No console errors on launch

**Do not build:**
- Ghost mechanic (next prompt)
- Embedding generation (next prompt)
- Folder watch (next prompt)
- Q&A UI (next prompt)
- Stripe checkout UI (next prompt)
- Outline mode (next prompt)
