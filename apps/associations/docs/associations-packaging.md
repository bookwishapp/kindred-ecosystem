# Associations — Packaging and Auto-Update

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt configures electron-builder for signed, notarized macOS distribution with auto-updates via S3. Read every file before touching it. No other files modified outside this list.

---

## Requirements

- Signed .dmg for macOS (Apple Silicon + Intel universal binary)
- Notarized so Gatekeeper accepts it without warnings
- Auto-updates via `associations-releases` S3 bucket
- electron-updater checks for updates on launch
- Build script that signs, notarizes, packages, and uploads in one command

---

## Task A — Install dependencies

```bash
cd apps/associations
npm install --save-dev electron-builder
npm install electron-updater
```

---

## Task B — Configure electron-builder in package.json

Read `apps/associations/package.json`.

Add a `build` section:

```json
"build": {
  "appId": "com.dampconcrete.associations",
  "productName": "Associations",
  "copyright": "Copyright © 2025 Damp Concrete",
  "icon": "assets/icon.icns",
  "files": [
    "dist/**/*",
    "electron/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "electron/embeddings-worker.mjs",
      "to": "embeddings-worker.mjs"
    }
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "notarize": false,
    "target": [
      {
        "target": "dmg",
        "arch": ["universal"]
      },
      {
        "target": "zip",
        "arch": ["universal"]
      }
    ]
  },
  "dmg": {
    "title": "Associations",
    "background": "assets/dmg-background.png",
    "contents": [
      { "x": 130, "y": 220, "type": "file" },
      { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
    ],
    "window": {
      "width": 540,
      "height": 400
    }
  },
  "publish": {
    "provider": "s3",
    "bucket": "associations-releases",
    "region": "us-east-1",
    "acl": "public-read"
  },
  "nsis": {
    "oneClick": false
  }
},
"scripts": {
  "dev": "concurrently \"vite\" \"sleep 3 && NODE_ENV=development electron .\"",
  "build": "vite build",
  "dist": "npm run build && electron-builder --mac --universal",
  "dist:publish": "npm run build && electron-builder --mac --universal --publish always",
  "postinstall": "electron-builder install-app-deps"
}
```

---

## Task C — Create entitlements file

Create `apps/associations/build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
  </dict>
</plist>
```

These entitlements are required for:
- Electron's JIT compilation
- better-sqlite3 native module
- Network access (auth, API calls)
- File system access (watched folders, document save)

---

## Task D — Create a placeholder DMG background

Create `apps/associations/assets/dmg-background.png` — a simple 540×400px image on the app's warm background color `#F5F3EF`. This can be a plain colored rectangle for now. Terry will replace it with a designed version.

If ImageMagick is available:

```bash
convert -size 540x400 xc:#F5F3EF apps/associations/assets/dmg-background.png
```

Otherwise create a minimal PNG programmatically:

```bash
cd apps/associations
node -e "
const { createCanvas } = require('canvas');
" 
```

If neither is available, skip this step and note that `assets/dmg-background.png` needs to be created manually as a 540×400 image in color #F5F3EF before building.

---

## Task E — Add auto-updater to main process

Read `apps/associations/electron/main.js`.

Add auto-update logic at the top after existing requires:

```js
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Check for updates after window is ready (production only)
function checkForUpdates() {
  if (isDev) return;
  
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    log.info('Update available — downloading...');
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded — will install on quit');
    // Notify renderer that update is ready
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err.message);
  });
}
```

Call `checkForUpdates()` after the window is created:

```js
app.whenReady().then(() => {
  createWindow();
  buildMenu();
  checkForUpdates();
});
```

Add electron-log to dependencies:

```bash
npm install electron-log
```

---

## Task F — Handle update notification in renderer

Read `apps/associations/electron/preload.js`.

Add to contextBridge:

```js
onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
```

Read `apps/associations/src/App.jsx`.

Add a subtle update notification. When an update is downloaded, show a small notice in the corner — same style as the "questions waiting" indicator:

```jsx
const [updateReady, setUpdateReady] = useState(false);

useEffect(() => {
  window.electron.onUpdateDownloaded(() => {
    setUpdateReady(true);
  });
}, []);
```

Add to the render:

```jsx
{updateReady && (
  <span
    style={{
      position: 'fixed',
      bottom: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: "'Poppins', sans-serif",
      fontSize: '10px',
      color: 'var(--text-faint)',
      letterSpacing: '0.08em',
      zIndex: 10,
      userSelect: 'none',
      cursor: 'default',
    }}
  >
    update ready — restarts on quit
  </span>
)}
```

No force-quit button. No modal. Just a quiet note that an update is waiting. It installs when the writer quits naturally.

---

## Task G — Configure code signing environment

The build requires these environment variables to be set in your shell before running `npm run dist:publish`:

```bash
export APPLE_ID="your@apple.id"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"
```

**Getting APPLE_APP_SPECIFIC_PASSWORD:**
1. Go to appleid.apple.com
2. Sign In → App-Specific Passwords
3. Generate one for "Associations Notarization"

**Getting APPLE_TEAM_ID:**
Run: `xcrun altool --list-providers -u your@apple.id -p your-app-specific-password`
Or find it at developer.apple.com → Account → Membership

**AWS credentials:**
Use the same IAM user you use for SES/S3 in your other services, or create a dedicated one with `s3:PutObject` and `s3:GetObject` permissions on `associations-releases`.

Do NOT commit these to git. Add to `.gitignore` if creating a `.env.build` file.

---

## Task H — Verify native module rebuild

better-sqlite3 must be rebuilt for the packaged Electron version. Add to `package.json` scripts:

```json
"postinstall": "electron-builder install-app-deps"
```

This runs automatically after `npm install` and rebuilds native modules for the correct Electron version.

---

## Task I — Update main.js paths for packaged app

Read `apps/associations/electron/main.js`.

The embeddings worker path needs to work in both dev and packaged modes:

```js
function getWorkerPath() {
  if (isDev) {
    return path.join(__dirname, 'embeddings-worker.mjs');
  }
  // In packaged app, extraResources are placed in Resources/
  return path.join(process.resourcesPath, 'embeddings-worker.mjs');
}
```

Update the worker initialization:

```js
embeddingWorker = new Worker(getWorkerPath(), { type: 'module' });
```

---

## Build Instructions (Run after all tasks complete)

```bash
cd apps/associations

# Set environment variables (see Task G)
export APPLE_ID="..."
export APPLE_APP_SPECIFIC_PASSWORD="..."
export APPLE_TEAM_ID="..."
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

# Build, sign, notarize, and upload to S3
npm run dist:publish
```

This will:
1. Build the Vite frontend
2. Package with electron-builder
3. Sign with your Apple Developer certificate
4. Notarize with Apple (takes 1-5 minutes)
5. Create `Associations-1.0.0-universal.dmg`
6. Upload .dmg, .zip, and `latest-mac.yml` to `associations-releases` S3 bucket

The .dmg will be available at:
`https://associations-releases.s3.amazonaws.com/Associations-1.0.0-universal.dmg`

---

## Verification Checklist

- [ ] `npm run dist` completes without errors
- [ ] .dmg opens and shows drag-to-Applications installer
- [ ] App launches from Applications folder
- [ ] App name shows as "Associations" not "Electron"
- [ ] No Gatekeeper warning on launch
- [ ] App signs in correctly via deep link
- [ ] Watched folders work in packaged app
- [ ] Auto-save works in packaged app
- [ ] `latest-mac.yml` exists in S3 bucket after `dist:publish`
- [ ] No other files modified outside this list

## Version

Set initial version in `package.json`:

```json
"version": "1.0.0-beta.1"
```

This clearly communicates beta status to testers while being a valid semver for electron-updater.
