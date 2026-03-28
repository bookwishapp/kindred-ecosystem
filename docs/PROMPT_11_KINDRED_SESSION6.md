# Claude Code Prompt — Kindred Session 6: Keep Flow

## Context

Read these files before starting:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `docs/kindred_language_bible.md`
- `docs/kindred_ui_microcopy.md`
- `docs/kindred_kin_profile_microcopy.md`
- `apps/kindred/lib/services/deep_link_service.dart`
- `apps/kindred/lib/services/auth_api.dart`
- `apps/kindred/lib/providers/kin_provider.dart`
- `services/kindred-web/` (the full directory)
- `services/auth/src/profiles.js`

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## What you are building

The social layer of Kindred. When someone shares their profile, another person can open the link, see the profile, and tap Keep to add them as linked kin. This requires Universal Links so the link opens the app directly on iOS, a Profile Preview sheet inside the app, and an Invite to Show Up option for local kin.

---

## Part 1 — Universal Links (AASA file)

iOS Universal Links require an `apple-app-site-association` file served at `fromkindred.com/.well-known/apple-app-site-association`.

In `services/kindred-web/`, create `public/.well-known/apple-app-site-association` as a static file — no `.json` extension:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.terryheath.kindred",
        "paths": ["*"]
      }
    ]
  }
}
```

Find the actual Apple Team ID from `ios/Runner.xcodeproj/project.pbxproj` — search for `DEVELOPMENT_TEAM`. Replace `TEAMID` with that value.

In `next.config.js`, add headers so iOS can read the file:
```js
async headers() {
  return [
    {
      source: '/.well-known/apple-app-site-association',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
    },
  ];
}
```

In `apps/kindred/ios/Runner/Runner.entitlements`, add:
```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:fromkindred.com</string>
</array>
```

---

## Part 2 — Deep link handling for profile URLs

When the app receives a Universal Link `https://fromkindred.com/{username}` or the custom scheme `kindred://profile/{username}`, open a Profile Preview sheet.

In `deep_link_service.dart`, add handling for both:
```dart
// Universal link: fromkindred.com/{username}
if (uri.host == 'fromkindred.com' && 
    uri.pathSegments.length == 1 &&
    uri.pathSegments[0].isNotEmpty &&
    uri.pathSegments[0] != '.well-known') {
  _showProfilePreview(uri.pathSegments[0]);
}

// Custom scheme: kindred://profile/{username}
if (uri.scheme == 'kindred' && 
    uri.pathSegments.isNotEmpty &&
    uri.pathSegments.first == 'profile' &&
    uri.pathSegments.length > 1) {
  _showProfilePreview(uri.pathSegments[1]);
}
```

`_showProfilePreview` opens the Profile Preview sheet as a modal bottom sheet over the Kindred grid using a global navigator key.

---

## Part 3 — Auth service: look up profile by username

In `services/auth/src/profiles.js`, update `getPublicProfile` to accept either a UUID or a username, and return wishlist links and shared dates:

```javascript
async function getPublicProfile(req, res) {
  const { userId } = req.params;
  
  const result = await pool.query(
    `SELECT user_id, name, photo_url, birthday, username 
     FROM profiles 
     WHERE username = $1 OR user_id::text = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  const profile = result.rows[0];
  const links = await pool.query(
    'SELECT id, label, url FROM profile_wishlist_links WHERE user_id = $1',
    [profile.user_id]
  );
  const dates = await pool.query(
    'SELECT id, label, date FROM profile_shared_dates WHERE user_id = $1',
    [profile.user_id]
  );
  
  res.json({ 
    profile: {
      ...profile,
      wishlist_links: links.rows,
      shared_dates: dates.rows
    }
  });
}
```

Deploy auth service after this change.

---

## Part 4 — Profile Preview sheet

Create `apps/kindred/lib/screens/profile_preview/profile_preview_sheet.dart`.

This sheet:
- Accepts a `username` string
- Fetches via `AuthApi.getPublicProfile(username)`
- Shows loading state while fetching
- Displays: circular photo, name, birthday (month/day only, no year), wishlist links as tappable rows, shared dates as quiet rows
- Single teal **"Keep"** button at bottom
- If viewer already has this person (`linkedProfileId` matches `profile.user_id`): show **"Already in your Kin"** — muted, no button
- If not authenticated: show **"Show Up to keep someone"** — muted, no button
- Tapping Keep calls `KinProvider.addKinLinked(profile.user_id)` then dismisses

Visual style mirrors the Kin sheet exactly. Follow the microcopy guide.

Language rules (non-negotiable):
- Button: **"Keep"** only
- Already kept: **"Already in your Kin"**
- Not authenticated: **"Show Up to keep someone"**
- Never: "Add", "Follow", "Connect", "Join"

---

## Part 5 — addKinLinked in KinProvider

Add to `KinProvider`:

```dart
Future<void> addKinLinked(String profileUserId) async {
  try {
    await _api.addKin(linkedProfileId: profileUserId);
    await loadKin();
  } catch (e) {
    _error = 'Could not keep this person right now.';
    notifyListeners();
    rethrow;
  }
}
```

---

## Part 6 — Verify kin endpoint

In `services/kindred/src/index.js`, verify `POST /kin` exists and accepts `{ linked_profile_id }`. Show me the current kin routes before adding anything.

---

## Part 7 — Invite to Show Up

In `kin_sheet.dart`, for local kin only (type == KinPersonType.local), add **"Invite to Show Up"** above "let go" at the bottom of the sheet.

Tapping it:
```dart
await Share.share(
  'I keep track of the people I care about in Kindred. Show up: https://fromkindred.com',
);
```

Style: same small muted caption as "let go". Only visible for local kin.

Language:
- Label: **"Invite to Show Up"**
- Never: "Join me", "Download", "Sign up"

---

## Part 8 — fromkindred.com profile page

In `services/kindred-web/`, verify the profile page:
- Route is `/{username}` — not `/profile/{username}`
- Fetches from `auth.terryheath.com/profile/{username}`
- Has **"Keep {name} in Kindred"** button deep linking to `kindred://profile/{username}`
- Footer has Terms and Privacy links

Run: `grep -rn "kindred.terryheath\|api.fromkindred" services/kindred-web/` and fix any wrong URLs.

---

## Rules

- Read docs first, three bullet summary, wait for confirmation
- Language: Keep, Show Up, Invite to Show Up — never join, add, follow, connect
- Profile URLs: `fromkindred.com/{username}` — no `/profile/` prefix anywhere
- Profile Preview sheet mirrors Kin sheet visually
- Do not touch grid, rings, drag, or existing kin sheet content
- Deploy auth service after Part 3, before testing Parts 4-5
- `flutter analyze` must pass before declaring done
