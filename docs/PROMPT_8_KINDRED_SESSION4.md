# Claude Code Prompt — Kindred Session 4: Auth + Rise Up + Overlay Navigation

## Context

Read these files before doing anything else:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `docs/kindred_ui_microcopy.md`
- `docs/kindred_language_bible.md`
- `apps/kindred/lib/app.dart`
- `apps/kindred/lib/router.dart`
- `apps/kindred/lib/screens/kindred/kindred_screen.dart`
- `apps/kindred/lib/screens/kin/kin_sheet.dart`

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## Core Navigation Philosophy (Non-Negotiable)

The Kindred grid is ALWAYS the base layer. It is never replaced or pushed off screen. Every other surface is an overlay — a bottom sheet that appears over the grid. The grid is always faintly visible behind any open sheet.

This means:
- NO full-screen pushed routes for any user-facing feature
- NO navigation that replaces the Kindred grid
- Every feature opens as a bottom sheet
- The Kin icon in the navbar dismisses ALL open sheets and returns focus to the grid

---

## Part 1 — Navbar Redesign

### Current navbar
Three items: Kin (left), + (center), You (right)

### New navbar behavior

**Kin (left):**
- Icon: `CupertinoIcons.person_2`
- Tapping dismisses any open bottom sheet and returns to the grid
- Does NOT navigate anywhere — it releases overlays
- Active/teal when no sheets are open

**+ (center):**
- Dark rounded button as before
- Opens Add Kin as a bottom sheet (change from full screen push)
- Icon: `CupertinoIcons.plus`

**You (right):**
- Icon: `CupertinoIcons.person`
- Label: "You"
- Tapping opens the Rise Up sheet as a bottom sheet
- NOT a dropdown — goes straight to Rise Up sheet

### AppBar avatar (separate from navbar)

The AppBar has a small circular avatar in the top-right corner:
- Shows initials (warm gray background, teal text) before Rising Up
- Shows profile photo after Rising Up
- Tapping opens a small settings dropdown overlay anchored below the AppBar
- This is NOT in the navbar — it is in the AppBar

### Implementation

Convert the navbar from a BottomNavigationBar or TabBar to a custom Row of three items so each can have independent tap behavior rather than tab-switching behavior.

The Kindred screen no longer needs to be inside a tab scaffold. It is always the root widget. Sheets open on top of it.

---

## Part 2 — Convert Add Kin to Bottom Sheet

Change AddKinScreen from a full-screen push to a bottom sheet.

When + is tapped, open AddKinSheet as a modal bottom sheet (same parameters as KinSheet).

### AddKinSheet content

```
[Handle bar]
[Title: "Keep someone" — headingLarge, left-aligned]

[Photo picker — circular placeholder, tappable]
  → Opens CupertinoActionSheet: "Take a photo" / "Choose from library"
  → Uses image_picker package

[Name text field]
[Birthday — tappable row, opens date picker]
[+ Add a date — quiet teal text]

[Keep — full width teal button at bottom]
[Cancel — small muted text]
```

Add `image_picker: ^1.0.0` to `pubspec.yaml`.

On save: calls `KinProvider.addLocalKin(name, photoUrl, birthday, dates)` then dismisses sheet.

---

## Part 3 — Settings Dropdown

When the AppBar avatar (top-right of AppBar) is tapped, show a small overlay dropdown anchored below it.

Use a Stack in KindredScreen with an AnimatedOpacity widget for the dropdown. It appears/disappears with a subtle fade. Tapping anywhere outside dismisses it.

### Dropdown contents

```
[Your name or "you" if no profile] — small label at top, muted
---
Rise Up          → opens Rise Up sheet
---
Email updates    → toggle for newsletter opt-in
---
Support          → opens url_launcher to mailto:terry@terryheath.com
---
Sign out         → calls AuthService.logout(), only visible if authenticated
```

Style: warmWhite background, subtle shadow, 8px corner radius, left-aligned text, 16px horizontal padding.

---

## Part 4 — Rise Up Sheet

The Rise Up sheet is your own editable profile — same visual pattern as KinSheet but fully editable. No "their profile / your notes" split — it's just your data.

Open from Settings dropdown → Rise Up, OR automatically after magic link verification.

### Three states

#### State 1: Not authenticated

```
[Handle bar]
[Large circular photo placeholder — initials, centered]

[Body text, centered, muted]:
"Here you share what you love, what you're hoping for,
what days mean something to you."

[Smaller text]:
"When you Rise Up, someone can keep you."

[Email text field — placeholder: "your email"]
[Send link — teal button]

[After sending — replace form with]:
"Check your email."
[muted]: "A link is waiting for you."

[Not now — very small muted text at bottom, dismisses sheet]
```

#### State 2: Authenticated, no profile yet

```
[Handle bar]
[Photo — circular, tappable → image_picker]
[Name text field]
[Birthday — tappable row]
[+ Add a wishlist link]
[+ Add a date to share]
[Rise Up — full width teal button]
```

#### State 3: Profile exists

```
[Handle bar]
[Photo — circular, tappable to change]
[Name — tappable to edit inline]
[Birthday — tappable to edit]
[Wishlist links — tappable to open, swipe to delete]
[+ Add a wishlist link]
[Shared dates — with delete]
[+ Add a date]
[divider]
[Share — opens iOS share sheet with deep link]
  Link: https://kindred.terryheath.com/profile/{userId}
```

---

## Part 5 — Auth Service

### `apps/kindred/lib/services/auth_service.dart`

A ChangeNotifier with:
- `requestMagicLink(String email)` — POST to auth.terryheath.com/auth/request
- `verifyMagicLink(String token)` — GET auth.terryheath.com/auth/verify?token=TOKEN
- `logout()` — clears token from SecureStorageService
- `initialize()` — loads token from SecureStorageService on app start
- `isAuthenticated` — bool getter
- `magicLinkSent` — bool getter
- `accessToken` — String? getter

Use plain Dio (not ApiClient) for auth calls.

Auth base URL:
```dart
const authBaseUrl = String.fromEnvironment(
  'AUTH_BASE_URL',
  defaultValue: 'https://auth.terryheath.com'
);
```

On successful verify: save token to SecureStorageService, set _accessToken, notifyListeners().

### Deep link handling

Add `uni_links: ^0.5.1` to `pubspec.yaml` if not already present.

In `app.dart`, listen for incoming links on the `kindred://` scheme:
- Parse token from `kindred://auth/verify?token=TOKEN`
- Call `authService.verifyMagicLink(token)`

Add to `ios/Runner/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>kindred</string>
    </array>
  </dict>
</array>
```

Add note in README: The auth service needs a one-line update to redirect to `kindred://auth/verify?token=TOKEN` after verification.

---

## Part 6 — Profile Service

### `apps/kindred/lib/services/profile_service.dart`

A ChangeNotifier that wraps KindredApi profile endpoints:
- `loadProfile(KindredApi api)`
- `createProfile(KindredApi api, {name, birthday, photoUrl})`
- `updateProfile(KindredApi api, Map updates)`
- `addWishlistLink(KindredApi api, String label, String url)`
- `removeWishlistLink(KindredApi api, String linkId)`
- `addSharedDate(KindredApi api, String label, DateTime date)`
- `removeSharedDate(KindredApi api, String dateId)`

Expose: `profile`, `wishlistLinks`, `sharedDates`, `hasProfile`, `loading`.

---

## Part 7 — Onboarding (First Launch)

Add `app_settings` table to LocalDb as migration `002_settings.sql`:
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Add `isFirstLaunch()` and `markLaunched()` methods to LocalDb.

In KindredScreen:
- Check isFirstLaunch() on init
- First launch: show "The people you keep close show up here."
- After first kin added: switch to "No one here yet." and markLaunched()

---

## Part 8 — Image Picker

Create `apps/kindred/lib/services/photo_service.dart`:

A static `pickPhoto(BuildContext context)` method that:
1. Shows a CupertinoActionSheet with "Take a photo" and "Choose from library"
2. Uses ImagePicker to get the file
3. Returns the local file path (S3 upload is Session 3c)

Use `PhotoService.pickPhoto(context)` in both AddKinSheet and RiseUpSheet.

---

## Part 9 — Wire AuthService into app

In `app.dart`:
1. Add AuthService and ProfileService to MultiProvider
2. Call `authService.initialize()` on app start
3. The ApiClient tokenProvider reads from AuthService:
```dart
tokenProvider: () async => context.read<AuthService>().accessToken,
```

Re-enable the commented-out updateKin calls in KinProvider. Unauthenticated users: catch errors silently, local state still works.

---

## Rules

- Read docs first, show three bullet summary, wait for confirmation
- Kindred grid is ALWAYS the base layer — no full screen pushes ever
- All surfaces are bottom sheets — no exceptions
- Cupertino only — no Material widgets for any UI elements
- No emoji anywhere
- Copy must match language bible — use approved copy exactly
- Show rise_up_sheet.dart, auth_service.dart, and new navbar code before running
- flutter analyze must pass before declaring done
