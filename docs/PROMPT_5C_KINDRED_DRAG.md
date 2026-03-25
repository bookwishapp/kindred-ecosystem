# Claude Code Prompt — Kindred: Continuous Drag Positioning

## Context

Read these files before making any changes:
- `apps/kindred/lib/models/kin_person.dart`
- `apps/kindred/lib/providers/kin_provider.dart`
- `apps/kindred/lib/widgets/kindred_grid.dart`
- `apps/kindred/lib/widgets/avatar_ring.dart`

Show me the current contents of each. Wait for confirmation before proceeding.

---

## What you are building

Replace the binary "hold at top" drag system with continuous drag positioning in both directions. Dragging an avatar up or down sets its position on screen proportionally. The amber ring and avatar size both scale with how high the avatar sits.

---

## Step 1 — Update KinPerson model

Change `positionOverride` from `int?` to `double?`:

```dart
final double? positionOverride; // 0.0 = top, 1.0 = bottom. null = date-driven
```

Add a `copyWith` method if not already present:

```dart
KinPerson copyWith({
  String? id,
  String? name,
  String? photoUrl,
  KinPersonType? type,
  String? linkedProfileId,
  double? positionOverride,
  bool clearPositionOverride = false,
  DateTime? birthday,
}) {
  return KinPerson(
    id: id ?? this.id,
    name: name ?? this.name,
    photoUrl: photoUrl ?? this.photoUrl,
    type: type ?? this.type,
    linkedProfileId: linkedProfileId ?? this.linkedProfileId,
    positionOverride: clearPositionOverride ? null : (positionOverride ?? this.positionOverride),
    birthday: birthday ?? this.birthday,
  );
}
```

Update computed properties:

```dart
// Amber intensity for manually positioned avatars
// Scales with how high they are: top = full, bottom = none
double get amberIntensity {
  if (positionOverride == null) return 0.0;
  return (1.0 - positionOverride!) * 0.85;
}

// Unified urgency: whichever is stronger — date or intention
double get urgencyScore {
  if (positionOverride != null) {
    return 1.0 - positionOverride!; // high position = high urgency
  }
  return ringIntensity;
}

// Size based on urgency score: 80px (bottom) to 110px (top)
double get avatarSize {
  return 80.0 + (urgencyScore * 30.0);
}
```

---

## Step 2 — Update KinProvider

Replace `_positionOverrides: Map<String, int>` with `Map<String, double>`.

Replace `holdAtTop` with two new methods:

```dart
// Called during drag — updates position in real time
void setPosition(String id, double position) {
  if (position >= 0.95) {
    // Dragged to bottom — release override, return to natural sort
    _positionOverrides.remove(id);
  } else {
    _positionOverrides[id] = position.clamp(0.0, 1.0);
  }
  notifyListeners();
}

// Called on drag end — snaps to nearest 0.05 increment
void snapPosition(String id, double position) {
  if (position >= 0.95) {
    _positionOverrides.remove(id);
  } else {
    final snapped = (position / 0.05).round() * 0.05;
    _positionOverrides[id] = snapped.clamp(0.0, 0.9);
  }
  notifyListeners();
}
```

Update `sortedKin` to sort by `positionOverride` when present:

```dart
List<KinPerson> get sortedKin {
  final sorted = List<KinPerson>.from(_buildKin());
  sorted.sort((a, b) {
    // Both have position overrides — sort by position
    if (a.positionOverride != null && b.positionOverride != null) {
      return a.positionOverride!.compareTo(b.positionOverride!);
    }
    // Only a has override — a goes first (toward top)
    if (a.positionOverride != null) return -1;
    // Only b has override — b goes first
    if (b.positionOverride != null) return 1;
    // Neither has override — sort by ring intensity (date-driven)
    return b.ringIntensity.compareTo(a.ringIntensity);
  });
  return sorted;
}
```

---

## Step 3 — Update KindredGrid drag gesture

Each avatar needs to track its drag in real time. Use a `StatefulWidget` per avatar with its own drag state.

Replace the current drag handler with:

```dart
double _dragStartY = 0;
double _avatarStartPosition = 0;

onVerticalDragStart: (details) {
  _dragStartY = details.globalPosition.dy;
  _avatarStartPosition = widget.person.positionOverride ?? 
    (1.0 - widget.person.urgencyScore); // approximate current position
},

onVerticalDragUpdate: (details) {
  final screenHeight = MediaQuery.of(context).size.height;
  final dragDelta = (details.globalPosition.dy - _dragStartY) / screenHeight;
  final newPosition = (_avatarStartPosition + dragDelta).clamp(0.0, 1.0);
  context.read<KinProvider>().setPosition(widget.person.id, newPosition);
},

onVerticalDragEnd: (details) {
  final currentPosition = widget.person.positionOverride ?? 
    (1.0 - widget.person.urgencyScore);
  context.read<KinProvider>().snapPosition(widget.person.id, currentPosition);
},
```

---

## Step 4 — Update AvatarRing

Use `person.avatarSize` for the size parameter instead of a fixed value.

Use `person.amberIntensity` for the amber ring opacity instead of a fixed 0.85.

The ring logic becomes:
- If `ringIntensity > 0` → teal ring, pulsing, opacity = `ringIntensity * 0.9`
- Else if `amberIntensity > 0` → amber ring, steady, opacity = `amberIntensity`
- Else → no ring

---

## Step 5 — Update Stack positioning in KindredGrid

The Stack already uses `positionOverride` for positioning. Make sure it now reads `person.positionOverride` (the double) directly for vertical placement:

```dart
final topPosition = person.positionOverride != null
  ? person.positionOverride! * availableHeight
  : (index / max(kin.length - 1, 1)) * availableHeight;
```

This means dragging updates the visual position in real time since `setPosition` calls `notifyListeners()`.

---

## Step 6 — Verify behavior

Run and confirm:
1. Dragging an avatar up moves it up smoothly in real time
2. Dragging an avatar down moves it down smoothly
3. Releasing snaps to nearest position
4. Dragging to the very bottom (>95% of screen) releases the override — avatar returns to date-driven position
5. Amber ring grows as avatar moves up, fades as it moves down
6. Avatar grows as it moves up, shrinks as it moves down
7. An avatar with no date dragged to the top shows full amber ring at full size

---

## Rules

- Read all four files first and show contents before changing anything
- Show the updated KinPerson model and KinProvider methods before touching the grid
- Do not change ring rendering logic — only ring opacity/color selection
- Do not change float animation
- Use `person.avatarSize` everywhere size is set — no hardcoded sizes
