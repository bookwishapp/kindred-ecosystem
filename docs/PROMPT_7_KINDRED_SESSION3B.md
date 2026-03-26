# Claude Code Prompt — Kindred Session 3b: Kin Sheet Full Content

## Context

Read these files before doing anything else:
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`
- `docs/kindred_kin_profile_microcopy.md`
- `apps/kindred/lib/screens/kin/kin_sheet.dart`
- `apps/kindred/lib/models/kin_person.dart`
- `apps/kindred/lib/providers/kin_provider.dart`

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## What you are building

The full Kin sheet (person bottom sheet) with all content sections, backed by local sqflite storage for private data.

Private data (notes, private dates, private wishlist links) lives on device only in a sqflite database. It is never sent to the server in this session — that is Session 3c.

---

## Part 1 — Local Database (sqflite)

### Add sqflite dependency

In `apps/kindred/pubspec.yaml` add:
```yaml
sqflite: ^2.3.0
path: ^1.8.0
```

### Create `apps/kindred/lib/services/local_db.dart`

A singleton service that manages the local sqflite database.

```dart
class LocalDb {
  static final LocalDb instance = LocalDb._internal();
  static Database? _database;

  LocalDb._internal();

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), 'kindred_local.db');
    return openDatabase(path, version: 1, onCreate: _onCreate);
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE kin_notes (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE kin_private_dates (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        label TEXT NOT NULL,
        date TEXT NOT NULL,
        recurs_annually INTEGER DEFAULT 1
      )
    ''');

    await db.execute('''
      CREATE TABLE kin_private_wishlist_links (
        id TEXT PRIMARY KEY,
        kin_record_id TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT NOT NULL
      )
    ''');
  }

  // Notes
  Future<List<Map<String, dynamic>>> getNotes(String kinRecordId) async {
    final db = await database;
    return db.query('kin_notes',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId],
      orderBy: 'created_at DESC'
    );
  }

  Future<void> addNote(String kinRecordId, String body) async {
    final db = await database;
    await db.insert('kin_notes', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'body': body,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<void> deleteNote(String id) async {
    final db = await database;
    await db.delete('kin_notes', where: 'id = ?', whereArgs: [id]);
  }

  // Private dates
  Future<List<Map<String, dynamic>>> getPrivateDates(String kinRecordId) async {
    final db = await database;
    return db.query('kin_private_dates',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId]
    );
  }

  Future<void> addPrivateDate(String kinRecordId, String label, DateTime date, bool recurs) async {
    final db = await database;
    await db.insert('kin_private_dates', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'label': label,
      'date': date.toIso8601String(),
      'recurs_annually': recurs ? 1 : 0,
    });
  }

  Future<void> deletePrivateDate(String id) async {
    final db = await database;
    await db.delete('kin_private_dates', where: 'id = ?', whereArgs: [id]);
  }

  // Private wishlist links
  Future<List<Map<String, dynamic>>> getPrivateWishlistLinks(String kinRecordId) async {
    final db = await database;
    return db.query('kin_private_wishlist_links',
      where: 'kin_record_id = ?',
      whereArgs: [kinRecordId]
    );
  }

  Future<void> addPrivateWishlistLink(String kinRecordId, String label, String url) async {
    final db = await database;
    await db.insert('kin_private_wishlist_links', {
      'id': const Uuid().v4(),
      'kin_record_id': kinRecordId,
      'label': label,
      'url': url,
    });
  }

  Future<void> deletePrivateWishlistLink(String id) async {
    final db = await database;
    await db.delete('kin_private_wishlist_links', where: 'id = ?', whereArgs: [id]);
  }
}
```

---

## Part 2 — KinSheet Full Content

Rebuild `apps/kindred/lib/screens/kin/kin_sheet.dart` as a `StatefulWidget` that loads local data on open.

### Layout (top to bottom inside the scrollable sheet)

```
[ Handle bar ]
[ Avatar photo — circular, 80px, centered ]
[ Name — headingLarge, centered ]
[ "let go" — caption, muted, centered — only if positionOverride != null ]

[ Divider ]

--- THEIR PROFILE ---

[ Dates section ]
  - Shows each date: "Birthday — May 14" etc.
  - Empty state: "Nothing shared yet."

[ Wishlist links section ]
  - Shows each link as a tappable row (label + URL, opens in browser)
  - Empty state: "Nothing here yet."

[ Divider ]

--- YOUR NOTES ---

[ "your notes" label — caption, muted ]
[ Notes list — each note as a text block with a quiet delete option ]
[ Empty state: "Things you want to remember." ]
[ Add note: tapping empty state or a quiet + opens a text input ]

[ Divider ]

--- DATES YOU KEEP ---

[ "dates you keep" label — caption, muted ]
[ Private dates list ]
[ Empty state: "Nothing marked." ]
[ Add date: quiet + button ]

[ Divider ]

--- THINGS THEY MIGHT LIKE ---

[ "things they might like" label — caption, muted ]
[ Private wishlist links list — tappable, opens in browser ]
[ Empty state: "You'll remember this later." ]
[ Add link: quiet + button ]

[ Bottom padding ]
```

### Microcopy rules (non-negotiable)
All copy must match `docs/kindred_kin_profile_microcopy.md` exactly:
- Section labels are lowercase and soft
- Empty states are observational, never instructional
- No "Add your first..." language anywhere
- No urgency, no pressure

### Adding notes
When user taps to add a note:
- Show a simple text field at the bottom of the notes section (inline, not a modal)
- Two buttons: a quiet checkmark to save, X to cancel
- On save: call `LocalDb.instance.addNote(person.id, body)` then reload
- Minimum 1 character to save

### Adding private dates
When user taps to add a date:
- Show a small inline form: text field for label + date picker
- Use Flutter's built-in `showDatePicker`
- On save: call `LocalDb.instance.addPrivateDate(...)`

### Adding private wishlist links
When user taps to add a link:
- Show inline form: label field + URL field
- On save: call `LocalDb.instance.addPrivateWishlistLink(...)`
- Validate URL is not empty

### Deleting items
Each note, date, and link has a quiet delete — a small muted trash or × icon on the trailing edge. No confirmation dialog — just delete immediately.

### "let go"
Already implemented. Keep as-is — small muted "let go" text, only visible when `positionOverride != null`, calls `releasePosition` on KinProvider and pops the sheet.

### Loading state
The sheet loads local data asynchronously in `initState`. While loading, show the sheet structure with empty sections (no spinner). Data appears as it loads — no flicker.

---

## Part 3 — Wire private dates into ring system

Private dates should trigger rings just like shared profile dates.

In `KinPerson`, `daysUntilBirthday` currently only checks `birthday`. This needs to expand to check all dates (shared + private).

However, private dates live in sqflite, not in the `KinPerson` model. For now, add a `List<DateTime> allDates` field to `KinPerson` that is populated when the kin list loads.

Update `KinProvider.loadKin()` to:
1. Load kin from API as before
2. For each kin person, query `LocalDb.instance.getPrivateDates(id)`
3. Combine birthday + private dates into `allDates`
4. Use `allDates` (not just birthday) in `ringIntensity` calculation

Update `KinPerson`:
```dart
final List<DateTime> allDates; // birthday + private dates combined

// Replace daysUntilBirthday with:
int? get daysUntilNextDate {
  if (allDates.isEmpty) return null;
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  
  int? closest;
  for (final date in allDates) {
    var next = DateTime(now.year, date.month, date.day);
    if (next.isBefore(today)) {
      next = DateTime(now.year + 1, date.month, date.day);
    }
    final days = next.difference(today).inDays;
    if (closest == null || days < closest) closest = days;
  }
  return closest;
}
```

---

## Rules

- Read all listed files first, show three bullet summary, wait for confirmation
- Follow `kindred_kin_profile_microcopy.md` exactly for all copy — no improvising
- No modal dialogs for adding notes/dates/links — inline only
- No confirmation dialogs for deletion
- `flutter analyze` must pass before declaring done
- Do not touch the avatar grid, ring animations, drag system, or KindredGrid
- Show `kin_sheet.dart` changes before running the app
