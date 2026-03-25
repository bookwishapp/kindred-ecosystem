# Claude Code Prompt — Kindred Session 2 Fix: Grid Layout

## Context

The avatar grid is built and working. Rings are correct. Float animations are correct. Two things need fixing: layout direction/sizing and horizontal randomness.

Read the current contents of these files before making any changes:
- `apps/kindred/lib/widgets/kindred_grid.dart`
- `apps/kindred/lib/widgets/avatar_ring.dart`

Show me what you found. Wait for confirmation before proceeding.

---

## Fix 1 — Layout direction and size scaling

**Current problem:** All avatars appear in a single horizontal row. Urgent avatars should be near the TOP of the screen, less urgent near the BOTTOM. With 5 avatars they should wrap into multiple rows.

**Changes:**

1. Increase base avatar size so they wrap naturally:
   - Fully glowing (ringIntensity 0.8–1.0) = 110px
   - Medium glow (ringIntensity 0.4–0.79) = 95px
   - Faint glow (ringIntensity 0.01–0.39) = 85px
   - No ring (ringIntensity 0.0) = 80px
   - Manually held (positionOverride != null, no date ring) = 105px
   - Interpolate smoothly between these using ringIntensity

2. Sort order already places urgent avatars first — that's correct. With the Wrap layout, first items appear top-left and wrap toward bottom-right. This naturally puts urgent avatars at the top.

3. The Wrap layout is correct — do not switch to GridView or CustomScrollView.

---

## Fix 2 — Organic horizontal positioning

**Current problem:** Avatars line up too uniformly within rows, feeling rigid.

**Changes:**

Add a small random horizontal offset to each avatar so the grid feels organic — like bubbles drifting, not items in a list.

- Each avatar gets a random x-offset between -20px and +20px
- Apply as `Padding` with asymmetric left/right values, or as a `Transform.translate`
- Seed the random value using the person's id so it stays consistent between redraws — do not use `Random()` without a seed or it will re-randomize on every build
- Use `person.id.hashCode` as the seed: `Random(person.id.hashCode).nextDouble()`
- The vertical sort order remains driven by urgency — only horizontal position is randomized

---

## Verify

Run `flutter run` and show me a screenshot showing:
1. Multiple rows of avatars (not a single line)
2. Urgent avatars visibly larger and toward the top
3. Horizontal positions feeling irregular, not grid-aligned

Do not declare success without the screenshot.

---

## Rules

- Do not change the ring rendering — it is working correctly
- Do not change the float animation physics — they are working correctly
- Do not change the sort order logic — it is working correctly
- Only change layout sizing and horizontal offset
- Show me the files you read before making changes
- Show screenshot before declaring done
