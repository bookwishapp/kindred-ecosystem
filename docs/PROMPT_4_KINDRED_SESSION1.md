# Claude Code Prompt — Kindred Flutter App, Session 1: Project Scaffold

## Context

You are working inside the kindred-ecosystem monorepo at `kindred-ecosystem/`.

Read these files before doing anything else:
- `docs/ARCHITECTURE.md`
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`

Show me that you have read them by summarizing in three bullet points what Kindred is. Wait for confirmation before proceeding.

---

## Your job in this session

Create the Flutter app scaffold for Kindred at `apps/kindred/`. Get it running in the simulator with the correct navigation shell and empty placeholder screens. Nothing functional — just the skeleton, confirmed working.

Do these steps in order. Show output and wait for confirmation at each step before proceeding.

---

## Step 1 — Create the Flutter app

```bash
cd apps
flutter create kindred --org com.terryheath --platforms ios,android
```

Then immediately update `apps/kindred/pubspec.yaml` to:
- Add `ui_kit` and `core` local package dependencies
- Add all required dependencies (see below)
- Remove any default dependencies that aren't needed

### pubspec.yaml dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Shared packages
  ui_kit:
    path: ../../packages/ui_kit
  core:
    path: ../../packages/core
  
  # Navigation
  go_router: ^14.0.0
  
  # State management
  provider: ^6.1.1
  
  # Storage
  flutter_secure_storage: ^9.2.2
  
  # Images
  cached_network_image: ^3.3.1
  
  # Utilities
  share_plus: ^7.2.1
  url_launcher: ^6.2.4
  intl: ^0.19.0
  uuid: ^4.5.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

---

## Step 2 — Clean up generated files

Remove or replace all Flutter default boilerplate:
- Replace `lib/main.dart` with the app entry point (see below)
- Delete `lib/counter` or any generated example code
- Delete `test/widget_test.dart` default content

---

## Step 3 — File structure

Create this structure inside `apps/kindred/lib/`:

```
lib/
  main.dart
  app.dart                    # MaterialApp + router setup
  router.dart                 # GoRouter configuration
  screens/
    kindred/
      kindred_screen.dart     # The avatar grid (home screen)
    kin/
      kin_sheet.dart          # Bottom sheet for a person
    show_up/
      show_up_screen.dart     # Your own profile
    add_kin/
      add_kin_screen.dart     # Add a person manually
  providers/
    kin_provider.dart         # Placeholder — empty for now
  models/
    kin_person.dart           # Data model for a person in your grid
```

---

## Step 4 — main.dart

```dart
import 'package:flutter/material.dart';
import 'app.dart';

void main() {
  runApp(const KindredApp());
}
```

---

## Step 5 — app.dart

- Uses `MaterialApp.router` with GoRouter
- Applies theme from `ui_kit` (`AppTheme.lightTheme`)
- Title: 'Kindred'
- No debug banner

---

## Step 6 — router.dart

GoRouter with these routes:

```
/                   → KindredScreen (the avatar grid — home)
/kin/:id            → Not a full route — Kin opens as a bottom sheet from KindredScreen
/show-up            → ShowUpScreen
/add-kin            → AddKinScreen
```

Note: Kin (the person page) is a bottom sheet, not a pushed route. It is opened programmatically from KindredScreen when an avatar is tapped. No route needed for it.

---

## Step 7 — Placeholder screens

Each screen should:
- Use `Scaffold` with the correct background color from `ui_kit` (`AppColors.background`)
- Display the screen name as centered text in the primary font (`AppTextStyles.headingLarge`)
- KindredScreen: no AppBar — full screen
- ShowUpScreen and AddKinScreen: AppBar with back button, title matching screen name

### KindredScreen placeholder

```dart
// Temporary placeholder — will be replaced in Session 2
// Shows: full-screen warm background, centered text "Kindred"
// Has a temporary floating action button that opens KinSheet as a bottom sheet
```

### KinSheet placeholder

```dart
// Bottom sheet — not a full screen
// Opens with showModalBottomSheet
// Shows: "Kin" as title, placeholder content
// DraggableScrollableSheet with initialChildSize: 0.6, maxChildSize: 0.95
// Corner radius: AppRadius.bottomSheet (from ui_kit)
```

---

## Step 8 — kin_person.dart model

```dart
class KinPerson {
  final String id;
  final String name;
  final String? photoUrl;
  final KinPersonType type; // linked | local
  final String? linkedProfileId;
  final int? positionOverride; // for manual drag positioning
  final DateTime? birthday;

  const KinPerson({
    required this.id,
    required this.name,
    this.photoUrl,
    required this.type,
    this.linkedProfileId,
    this.positionOverride,
    this.birthday,
  });
}

enum KinPersonType { linked, local }
```

---

## Step 9 — kin_provider.dart (placeholder)

```dart
import 'package:flutter/foundation.dart';
import '../models/kin_person.dart';

class KinProvider extends ChangeNotifier {
  // Placeholder — will be implemented in Session 3
  // Returns mock data for now so the UI has something to render
  
  List<KinPerson> get kin => [
    KinPerson(
      id: '1',
      name: 'Terry',
      type: KinPersonType.local,
      birthday: DateTime(1970, 6, 15),
    ),
    KinPerson(
      id: '2',
      name: 'Someone',
      type: KinPersonType.local,
    ),
  ];
}
```

---

## Step 10 — Wire up providers in app.dart

Wrap the router with a MultiProvider:

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => KinProvider()),
  ],
  child: MaterialApp.router(...)
)
```

---

## Step 11 — Update melos.yaml

Confirm `apps/kindred` is picked up by Melos. Run from repo root:

```bash
melos bootstrap
```

Show output.

---

## Step 12 — Verify

From `apps/kindred/`:

```bash
flutter pub get
flutter analyze
flutter run
```

Show me:
1. The analyze output (fix any issues before proceeding)
2. A simulator screenshot showing KindredScreen with the warm background and "Kindred" text
3. Confirmation that tapping the FAB opens the KinSheet bottom sheet

Do not declare success until the app is running in the simulator and you have shown me the screenshot.

---

## Rules

- Read the docs first — show me the three bullet summary and wait for confirmation
- Follow the screen names exactly: Kindred, Kin, Show Up, Add Kin
- Use ui_kit for all colors, typography, and spacing — no hardcoded values
- No Firebase, no RevenueCat, no push notification packages
- Show output at each step before moving on
- Do not declare success without a simulator screenshot
