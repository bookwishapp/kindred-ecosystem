# Claude Code Prompt — Kindred Launch Prep

## Context

Read these files before starting:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `docs/kindred_ui_microcopy.md`
- `docs/kindred_language_bible.md`

This session completes everything needed for App Store submission. Do fixes one at a time. Show changes before applying. Wait for confirmation between each.

---

## Fix 1 — Splash screen

Add a splash screen using `flutter_native_splash`.

In `pubspec.yaml` add:
```yaml
flutter_native_splash:
  color: "#F0EDE6"
  image: assets/kindred_logo.png
  color_dark: "#F0EDE6"
  image_dark: assets/kindred_logo.png
  android_12:
    color: "#F0EDE6"
    image: assets/kindred_logo.png
```

Run: `dart run flutter_native_splash:create`

The splash should show the warm off-white background with the Kindred logo centered. Nothing else.

---

## Fix 2 — Delete account

Apple requires a way to delete your account from within the app.

In the settings dropdown (`kindred_screen.dart`), add a **"Delete account"** option separated from Sign out by a divider. Place it below Sign out. Style it as small destructive-colored text (`CupertinoColors.destructiveRed`), only visible when authenticated.

Tapping it shows a `CupertinoAlertDialog`:
- Title: "Delete your account?"
- Message: "This removes your profile and cannot be undone. Your kin and notes stay on your device."
- Action 1: "Delete" — `isDestructiveAction: true`
- Action 2: "Cancel" — default

On confirm:
1. Call `DELETE /profiles/me` on the Kindred API
2. Call `AuthService.logout()` to clear the token
3. Show a brief confirmation

Add `DELETE /profiles/me` to `services/kindred/src/profiles.js` — deletes the profile and all associated wishlist links and dates for the authenticated user. Cascades are already handled by the database schema.

---

## Fix 3 — Terms and Privacy pages in kindred-web

In `services/kindred-web/`, add two static pages:

### `/terms`
Title: "Terms of Use"
Content: Simple, plain language. Kindred is provided as-is. You own your data. Don't misuse the service. Contact: terry@terryheath.com.

### `/privacy`
Title: "Privacy"
Content: What data is collected (profile info you choose to share, email for auth), what isn't collected (notes stay on device, no tracking, no ads), how to delete your data (delete account in app), contact: terry@terryheath.com.

Both pages match the fromkindred.com visual style (Poppins, warm off-white, minimal). Add links to both in the footer of the profile page.

---

## Fix 4 — Terms and Privacy links in settings dropdown

In the settings dropdown, add two quiet links below the divider that separates main settings from danger zone:

- "Privacy" → opens `https://fromkindred.com/privacy` via `url_launcher`
- "Terms" → opens `https://fromkindred.com/terms` via `url_launcher`

Small, muted, caption size. These satisfy App Store review requirements.

---

## Fix 5 — Keep flow: deep link handling

When the app receives `kindred://profile/{userId}`, open a Profile Preview sheet.

In `deep_link_service.dart`, add:
```dart
if (uri.scheme == 'kindred' && uri.pathSegments.isNotEmpty && uri.pathSegments.first == 'profile') {
  final userId = uri.pathSegments[1];
  _showProfilePreview(context, userId);
}
```

---

## Fix 6 — Profile Preview sheet

Create `apps/kindred/lib/screens/profile_preview/profile_preview_sheet.dart`.

- Fetches public profile via `KindredApi.getProfile(userId)`
- Shows: circular photo, name, birthday (month/day only), wishlist links as tappable rows, shared dates
- Single teal **"Keep"** button at bottom
- If viewer already has this person (`linkedProfileId` match in `KinProvider.kin`), show "Already in your Kin" — muted, no button
- Tapping Keep calls `KinProvider.addKinLinked(profileId)` then dismisses

Mirrors Kin sheet visually — same warm background, same typography, same section spacing. Uses the microcopy guide for empty states.

---

## Fix 7 — addKinLinked in KinProvider

```dart
Future<void> addKinLinked(String profileId) async {
  try {
    await _api.addKinLinked(linkedProfileId: profileId);
    await loadKin();
  } catch (e) {
    _error = 'Could not add this person right now.';
    notifyListeners();
    rethrow;
  }
}
```

Linked kin cannot be added offline — show a quiet error if the API fails.

---

## Fix 8 — Verify public profile endpoint has no auth

In `services/kindred/src/index.js`, verify `GET /profiles/:userId` does NOT have the `authenticate` middleware. It must be public — no token required.

---

## Fix 9 — Share button in Show Up sheet

The Show Up sheet (State 3 — profile exists) Share button should share:
```dart
await Share.share(
  'See my Kindred profile: https://fromkindred.com/$userId',
);
```

Where `userId` comes from the authenticated user's profile.

---

## Rules

- One fix at a time
- Show changes before applying
- No Material widgets — Cupertino only for UI elements
- Copy must follow the language bible — never instruction, never urgency
- Do not touch grid, rings, drag system, or Kin sheet content
- `flutter analyze` must pass before declaring done
