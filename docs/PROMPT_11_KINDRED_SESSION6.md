# Claude Code Prompt — Kindred Session 6: Keep Flow (Linked Profiles)

## Context

Read these files before starting:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `apps/kindred/lib/services/deep_link_service.dart`
- `apps/kindred/lib/services/kindred_api.dart`
- `apps/kindred/lib/providers/kin_provider.dart`
- `services/kindred/src/profiles.js`

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## What you are building

When a user shares their profile, another user can open the link, see the profile, and tap Keep to add them as linked kin. This is the core social mechanic of Kindred.

---

## Part 1 — Share link in Show Up sheet

The Show Up sheet (State 3 — profile exists) has a Share button. It should share:
```
https://fromkindred.com/profile/{userId}
```

This URL needs a landing page. For now, it also needs to work as a deep link that opens the app directly:
```
kindred://profile/{userId}
```

Update the share button to share both — the web URL as the primary link, with a note that it opens in the Kindred app.

Use `share_plus`:
```dart
await Share.share(
  'See my Kindred profile: https://fromkindred.com/profile/$userId',
);
```

---

## Part 2 — API URL and kindred-web fix

Two small changes:

1. In `app.dart`, change the `KINDRED_API_URL` defaultValue from `https://kindred.terryheath.com` to `https://api.fromkindred.com`.

2. In `services/kindred-web/` (already built), find where it fetches profile data and change `kindred.terryheath.com` to `api.fromkindred.com`. Do not rebuild or restructure kindred-web — just fix that URL.

---

## Part 3 — Deep link handling in app

When the app receives `kindred://profile/{userId}`, open a **Profile Preview sheet** showing the person's profile with a Keep button.

In `deep_link_service.dart`, add handling for `kindred://profile/{userId}`:
```dart
if (uri.scheme == 'kindred' && uri.pathSegments.first == 'profile') {
  final userId = uri.pathSegments[1];
  // Navigate to profile preview
  _showProfilePreview(userId);
}
```

The `_showProfilePreview` method should open a bottom sheet passing the userId.

---

## Part 4 — Profile Preview sheet

Create `apps/kindred/lib/screens/profile_preview/profile_preview_sheet.dart`.

This sheet:
- Fetches the public profile via `KindredApi.getProfile(userId)`
- Shows: circular photo, name, birthday (month/day), wishlist links as tappable rows, shared dates
- Has a single teal **"Keep"** button at the bottom
- If the viewer already has this person in their Kin (check by `linkedProfileId`), show **"Already in your Kin"** (muted, no button)
- Tapping Keep calls `KinProvider.addKinLinked(linkedProfileId)` then dismisses

Structure mirrors the Kin sheet visually — same warm background, same typography, same section style.

---

## Part 5 — addKinLinked in KinProvider

Add `addKinLinked(String profileId)` to `KinProvider`:

```dart
Future<void> addKinLinked(String profileId) async {
  try {
    await _api.addKinLinked(linkedProfileId: profileId);
    await loadKin(); // Reload to get the linked person with full profile
  } catch (e) {
    // If API fails, cannot add linked kin offline — show error
    _error = 'Could not add this person right now.';
    notifyListeners();
    rethrow;
  }
}
```

Unlike local kin, linked kin require the API — they cannot be added offline.

---

## Part 6 — Backend: public profile endpoint

Verify `GET /profiles/:userId` exists in `services/kindred/src/profiles.js` and returns:
```json
{
  "profile": { "id", "user_id", "name", "photo_url", "birthday" },
  "wishlist_links": [...],
  "dates": [...]
}
```

This endpoint must NOT require auth — it's public. Verify the route in `src/index.js` does not have the `authenticate` middleware.

---

## Rules

- Read docs first, three bullet summary, wait for confirmation
- Profile preview sheet mirrors Kin sheet visually — same style
- Keep is the only action — no other buttons
- "Keep" language only — never "follow", "add", "connect"
- Linked kin require API — graceful error if offline
- Do not change grid, rings, drag, or existing sheets
- `flutter analyze` must pass before declaring done
