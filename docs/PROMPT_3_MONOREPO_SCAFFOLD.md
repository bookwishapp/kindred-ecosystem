# Claude Code Prompt — Monorepo Scaffold + ui_kit Extraction

## Context

We are setting up a Flutter monorepo for the Kindred ecosystem. The repository will contain multiple Flutter apps and shared packages. Two backend services already exist at `services/auth` and `services/web` — do not touch these. The `apps/` folder is empty — all apps will be built fresh.

There is an existing Flutter app at `/Developer/analoglist` that we are NOT moving or modifying. We are only reading its theme files to inform the ui_kit package we are creating.

---

## Your job in this session

1. Read the AnalogList theme files (read only — do not touch that folder)
2. Initialize the monorepo with Melos
3. Create the `packages/ui_kit` Flutter package based on what you read
4. Create the `packages/core` Flutter package
5. Verify the packages are valid

Do these steps in order. After each step, confirm it worked before moving to the next. Do not proceed past a broken step.

---

## Step 1 — Read first

Before writing any files, read the following from `/Developer/analoglist`:
- `lib/theme/colors.dart`
- `lib/theme/theme.dart`
- `lib/theme/text_styles.dart`
- `lib/theme/spacing.dart`
- `lib/theme/border_radius.dart`
- `pubspec.yaml`

Show me what you found before doing anything else. Do not write any files until I confirm.

---

## Step 2 — melos.yaml (root level)

```yaml
name: kindred_ecosystem

packages:
  - apps/**
  - packages/**

scripts:
  build:
    run: melos exec -- flutter build
  test:
    run: melos exec -- flutter test
  analyze:
    run: melos exec -- flutter analyze
```

---

## Step 3 — packages/ui_kit

Create a Flutter package at `packages/ui_kit`.

```
packages/ui_kit/
  lib/
    src/
      theme/
        colors.dart
        theme.dart
        text_styles.dart
        spacing.dart
        border_radius.dart
    ui_kit.dart       ← barrel export file
  pubspec.yaml
```

### pubspec.yaml for ui_kit

```yaml
name: ui_kit
description: Shared UI components and theme for the Kindred ecosystem
version: 0.0.1

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.0.0'

dependencies:
  flutter:
    sdk: flutter
  google_fonts: ^6.1.0

flutter:
  uses-material-design: true
```

### Content

Copy the theme files you read from `/Developer/analoglist/lib/theme/` into `packages/ui_kit/lib/src/theme/`. Do not modify the content — copy exactly.

The barrel file `ui_kit.dart` should export all theme files:

```dart
library ui_kit;

export 'src/theme/colors.dart';
export 'src/theme/theme.dart';
export 'src/theme/text_styles.dart';
export 'src/theme/spacing.dart';
export 'src/theme/border_radius.dart';
```

---

## Step 4 — packages/core

Create a minimal Flutter package at `packages/core`.

```
packages/core/
  lib/
    src/
      http/
        api_client.dart     ← thin Dio wrapper
      utils/
        date_utils.dart     ← date formatting helpers
    core.dart               ← barrel export
  pubspec.yaml
```

### pubspec.yaml for core

```yaml
name: core
description: Shared utilities for the Kindred ecosystem
version: 0.0.1

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.0.0'

dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0
  flutter_secure_storage: ^9.2.2
```

### api_client.dart

A thin Dio wrapper that:
- Takes a `baseUrl` and optional `tokenProvider` function in constructor
- Adds Bearer token header automatically if tokenProvider returns a token
- On 401, calls an optional `onUnauthorized` callback
- Exposes `get`, `post`, `put`, `delete` methods that return the response data or throw a typed `ApiException`

```dart
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  ApiException({this.statusCode, required this.message});
}
```

### date_utils.dart

Simple helpers:
- `formatDate(DateTime date)` → "January 1, 2026"
- `formatShortDate(DateTime date)` → "Jan 1"
- `daysUntil(DateTime date)` → int (days until next occurrence, accounting for annual recurrence)
- `isUpcoming(DateTime date, {int withinDays = 30})` → bool

### core.dart barrel

```dart
library core;

export 'src/http/api_client.dart';
export 'src/utils/date_utils.dart';
```

---

## Step 5 — Verify

Run these commands and show me the output:

```bash
# From repo root
dart pub global activate melos
melos bootstrap

# From packages/ui_kit
flutter pub get
flutter analyze

# From packages/core
flutter pub get
flutter analyze
```

If analyze shows errors, fix them before finishing. Do not skip this step.

---

## Rules

- Read before writing — always
- Show me the theme file contents after Step 1 and wait for confirmation before proceeding
- Complete each step fully before starting the next
- Do not modify anything in /Developer/analoglist — read only
- Do not touch anything in services/auth or services/web
- Keep ui_kit and core minimal — no components yet, just theme and utilities
- Show me the output of Step 5 before declaring success
