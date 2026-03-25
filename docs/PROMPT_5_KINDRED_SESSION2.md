# Claude Code Prompt — Kindred Flutter App, Session 2: The Avatar Grid

## Context

You are working inside the kindred-ecosystem monorepo at `kindred-ecosystem/`.

Before doing anything else, read:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `docs/kindred_ui_microcopy.md`
- `apps/kindred/lib/screens/kindred/kindred_screen.dart`
- `apps/kindred/lib/models/kin_person.dart`
- `apps/kindred/lib/providers/kin_provider.dart`

Summarize in three bullet points what the Kindred screen should feel like visually and physically. Wait for confirmation before proceeding.

---

## Your job in this session

Build the avatar grid on KindredScreen. This is the heart of the app. It must feel quiet, alive, and unhurried — like faces floating gently toward you.

Do these steps in order. Show output and wait for confirmation at each step.

---

## What you are building

A full-screen grid of circular avatar photos. Each avatar:
- Is a circle, no names
- Has a glowing teal ring when a date is approaching
- Ring intensity scales with proximity to the date
- Can be manually dragged upward to hold someone in mind
- Manually held avatars glow with a steady warm amber ring (distinct from teal)
- Tapping an avatar opens KinSheet as a bottom sheet

The grid sorts automatically: closest upcoming date floats to top-left. Manual position overrides push someone higher regardless of dates.

The physics feel like bubbles rising in water — gentle, soft, nothing jerky.

---

## Step 1 — Update KinPerson model

Add computed properties to `kin_person.dart`:

```dart
// Returns days until next occurrence of birthday (or any date)
// Accounts for annual recurrence
int? get daysUntilBirthday {
  if (birthday == null) return null;
  final now = DateTime.now();
  var next = DateTime(now.year, birthday!.month, birthday!.day);
  if (next.isBefore(now)) {
    next = DateTime(now.year + 1, birthday!.month, birthday!.day);
  }
  return next.difference(DateTime(now.year, now.month, now.day)).inDays;
}

// Ring intensity 0.0–1.0 based on proximity
// 0 = no ring (>60 days), 1.0 = fully glowing (≤3 days)
double get ringIntensity {
  final days = daysUntilBirthday;
  if (days == null) return 0.0;
  if (days <= 3) return 1.0;
  if (days <= 7) return 0.85;
  if (days <= 14) return 0.65;
  if (days <= 30) return 0.4;
  if (days <= 60) return 0.15;
  return 0.0;
}

bool get hasUpcomingDate => ringIntensity > 0;
```

---

## Step 2 — Update KinProvider with richer mock data

Replace the placeholder mock data with data that exercises the ring system:

```dart
@override
List<KinPerson> get kin {
  final now = DateTime.now();
  return [
    KinPerson(
      id: '1',
      name: 'Terry',
      type: KinPersonType.local,
      birthday: DateTime(1970, now.month, now.day + 2), // 2 days away
    ),
    KinPerson(
      id: '2',
      name: 'Someone',
      type: KinPersonType.local,
      birthday: DateTime(1985, now.month, now.day + 10), // 10 days away
    ),
    KinPerson(
      id: '3',
      name: 'Another',
      type: KinPersonType.local,
      birthday: DateTime(1990, now.month, now.day + 45), // 45 days away
    ),
    KinPerson(
      id: '4',
      name: 'Held',
      type: KinPersonType.local,
      positionOverride: 0, // manually held at top
    ),
    KinPerson(
      id: '5',
      name: 'Far',
      type: KinPersonType.local,
      // no birthday — no ring
    ),
  ];
}

// Sort: positionOverride first (ascending), then by ringIntensity (descending)
List<KinPerson> get sortedKin {
  final sorted = List<KinPerson>.from(kin);
  sorted.sort((a, b) {
    if (a.positionOverride != null && b.positionOverride == null) return -1;
    if (a.positionOverride == null && b.positionOverride != null) return 1;
    if (a.positionOverride != null && b.positionOverride != null) {
      return a.positionOverride!.compareTo(b.positionOverride!);
    }
    return b.ringIntensity.compareTo(a.ringIntensity);
  });
  return sorted;
}
```

---

## Step 3 — Build the AvatarRing widget

Create `apps/kindred/lib/widgets/avatar_ring.dart`.

This widget renders a single avatar with its ring.

```dart
class AvatarRing extends StatefulWidget {
  final KinPerson person;
  final double size; // diameter of the avatar circle
  final VoidCallback onTap;

  const AvatarRing({
    super.key,
    required this.person,
    required this.size,
    required this.onTap,
  });
}
```

### Visual spec

**Avatar circle:**
- Circular, clipped
- Size: `size` parameter (default 80.0 in grid)
- Background: `AppColors.surface` when no photo
- Initials shown when no photo: first letter of name, `AppTextStyles.headingLarge`, color `AppColors.textSecondary`

**Ring:**
- Drawn outside the avatar circle
- Ring width: 3px
- Gap between avatar edge and ring: 3px
- Total widget size: `size + 12` (ring + gap on each side)

**Date-triggered ring (teal):**
- Color: `AppColors.primary` (#2AB8A0)
- Opacity: `ringIntensity * 0.9` (so at full intensity it's nearly opaque)
- Animated: gentle pulse using `AnimationController` with repeat
  - Scale oscillates between 1.0 and 1.04
  - Duration: 2000ms, easing: Curves.easeInOut
  - Only animates when `ringIntensity > 0`

**Manually held ring (amber):**
- Color: `Color(0xFFE8A84C)` (warm amber)
- Opacity: 0.85 (steady, no pulse)
- Only shown when `positionOverride != null` AND `ringIntensity == 0`
- If both positionOverride and ringIntensity > 0, show teal (date takes priority)

**No ring:**
- When `ringIntensity == 0` and `positionOverride == null`
- Widget still renders at full size, just no ring visible

Use `CustomPainter` to draw the ring. Do not use `Container` decoration for the ring — it won't animate cleanly.

---

## Step 4 — Build the KindredGrid widget

Create `apps/kindred/lib/widgets/kindred_grid.dart`.

This is the avatar grid with gentle float physics.

### Layout

Use a `Wrap` widget (not `GridView`) with:
- Spacing: 16px horizontal, 20px vertical
- Padding: 24px all sides
- Centered alignment

Avatar size: 80px diameter.

### Float animation

Each avatar gets a subtle vertical float animation using `AnimationController`:
- Each avatar gets a slightly different animation offset so they don't all move in sync
- Offset by `index * 300ms` for start delay
- Vertical travel: ±6px
- Duration per cycle: 3000ms + (index * 200ms) for variation
- Easing: `Curves.easeInOut`
- Repeat with reverse

This gives the bubbles-rising feeling — each avatar gently bobbing at its own pace.

### Drag behavior (simplified for now)

Wrap each AvatarRing in a `GestureDetector`. On vertical drag up beyond a threshold (50px), call a method on KinProvider to set `positionOverride` for that person to move them to the front. This is a simplified implementation — full drag-to-reorder is a later refinement.

```dart
onVerticalDragEnd: (details) {
  if (details.primaryVelocity != null && details.primaryVelocity! < -500) {
    // Dragged up quickly — hold this person at top
    context.read<KinProvider>().holdAtTop(person.id);
  }
},
```

Add `holdAtTop(String id)` to KinProvider that sets `positionOverride = 0` for that person and notifies listeners.

---

## Step 5 — Update KindredScreen

Replace the placeholder content in `kindred_screen.dart` with:

```dart
// If kin list is empty: show "No one here yet." centered, muted
// If kin list has people: show KindredGrid
Consumer<KinProvider>(
  builder: (context, provider, _) {
    final kin = provider.sortedKin;
    if (kin.isEmpty) {
      return Center(
        child: Text(
          'No one here yet.',
          style: AppTextStyles.bodyMedium.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      );
    }
    return KindredGrid(
      kin: kin,
      onAvatarTap: (person) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => KinSheet(person: person),
        );
      },
    );
  },
)
```

---

## Step 6 — Update KinSheet to accept a person

Update `kin_sheet.dart` to accept a `KinPerson` parameter and display:
- Person's name at the top (inside the sheet)
- Placeholder sections for "Their profile" and "Your notes"
- Use microcopy from `docs/kindred_kin_profile_microcopy.md` for empty states

---

## Step 7 — Verify

Run:
```bash
flutter analyze
flutter run
```

Show me a screenshot of:
1. The avatar grid with multiple avatars visible, rings showing at different intensities
2. The bottom sheet open after tapping an avatar

The grid must show visual ring differences between the mock data people (2 days away should glow strongly, 45 days away should glow faintly, no birthday should show no ring).

Do not declare success without these screenshots.

---

## Rules

- Read the docs first — show three bullet summary, wait for confirmation
- Use ui_kit for all colors and styles — no hardcoded values except the amber ring color noted above
- Follow the microcopy docs exactly for any text
- No names on the grid — names only appear inside KinSheet
- Show changes before pushing anything
- Verify in simulator before declaring done
