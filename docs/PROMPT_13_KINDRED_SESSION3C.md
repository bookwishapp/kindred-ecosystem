# Claude Code Prompt — Kindred Session 3c: Encrypted Backup

## Context

Read these files before starting:
- `docs/ARCHITECTURE.md`
- `apps/kindred/lib/services/local_db.dart`
- `apps/kindred/lib/services/auth_service.dart`
- `apps/kindred/lib/providers/kin_provider.dart`
- `services/kindred/src/index.js`

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## What you are building

Private data (notes, private dates, private wishlist links) lives on device only in sqflite. If a user loses their phone or switches devices, this data is gone. This session adds encrypted backup so data survives across devices.

The server stores ciphertext only — it never sees plaintext private data.

---

## Encryption approach

Use AES-256-GCM encryption. The encryption key is derived from the user's access token using PBKDF2. Only a user with a valid token can decrypt their own data.

Use the `encrypt` Flutter package:
```yaml
encrypt: ^5.0.3
```

Key derivation:
```dart
import 'package:crypto/crypto.dart';

Uint8List deriveKey(String token) {
  // Use first 32 chars of token as password, 'kindred-backup' as salt
  final key = utf8.encode(token.substring(0, min(32, token.length)));
  final salt = utf8.encode('kindred-backup-v1');
  // PBKDF2 with SHA256, 10000 iterations, 32 byte output
  // Use pointycastle package for PBKDF2
  return pbkdf2(key, salt, 10000, 32);
}
```

Add `pointycastle: ^3.7.3` to pubspec.yaml.

---

## Part 1 — Backup service

Create `apps/kindred/lib/services/backup_service.dart`.

```dart
class BackupService {
  // Encrypt all private data and send to server
  Future<void> backup({
    required String userId,
    required String accessToken,
    required KindredApi api,
  }) async {
    final db = LocalDb.instance;
    
    // Collect all private data
    final allKin = await db.getLocalKin();
    final backup = <String, dynamic>{};
    
    for (final kin in allKin) {
      final id = kin['id'] as String;
      backup[id] = {
        'kin': kin,
        'notes': await db.getNotes(id),
        'dates': await db.getPrivateDates(id),
        'links': await db.getPrivateWishlistLinks(id),
      };
    }
    
    // Serialize and encrypt
    final plaintext = jsonEncode(backup);
    final encrypted = _encrypt(plaintext, accessToken);
    
    // Send to server
    await api.saveBackup(userId: userId, ciphertext: encrypted);
  }
  
  // Decrypt and restore data
  Future<void> restore({
    required String userId,
    required String accessToken,
    required KindredApi api,
  }) async {
    final backup = await api.getBackup(userId: userId);
    if (backup == null) return;
    
    final ciphertext = backup['ciphertext'] as String;
    final plaintext = _decrypt(ciphertext, accessToken);
    final data = jsonDecode(plaintext) as Map<String, dynamic>;
    
    // Restore to local db
    final db = LocalDb.instance;
    for (final entry in data.entries) {
      final kinData = entry.value['kin'] as Map<String, dynamic>;
      await db.saveLocalKin(kinData);
      
      for (final note in entry.value['notes'] as List) {
        await db.restoreNote(note as Map<String, dynamic>);
      }
      // ... restore dates and links similarly
    }
  }
  
  String _encrypt(String plaintext, String token) { ... }
  String _decrypt(String ciphertext, String token) { ... }
}
```

---

## Part 2 — Backend: backup endpoints

Add to `services/kindred/src/` a new file `backup.js`:

```javascript
// POST /backup — save encrypted backup
async function saveBackup(req, res) {
  const { ciphertext, version = 1 } = req.body;
  // Upsert — one backup record per user
  await pool.query(
    `INSERT INTO backups (user_id, ciphertext, version, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET ciphertext = $2, version = $3, updated_at = NOW()`,
    [req.user.id, ciphertext, version]
  );
  res.json({ success: true });
}

// GET /backup — retrieve encrypted backup
async function getBackup(req, res) {
  const result = await pool.query(
    'SELECT ciphertext, version, updated_at FROM backups WHERE user_id = $1',
    [req.user.id]
  );
  if (result.rows.length === 0) {
    return res.json({ backup: null });
  }
  res.json({ backup: result.rows[0] });
}
```

Add migration `002_backup.sql`:
```sql
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  ciphertext TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Add routes to `src/index.js` (both require auth):
```javascript
app.post('/backup', authenticate, saveBackup);
app.get('/backup', authenticate, getBackup);
```

---

## Part 3 — Add backup methods to KindredApi

```dart
Future<void> saveBackup({required String userId, required String ciphertext}) async {
  await _client.post('/backup', data: {'ciphertext': ciphertext});
}

Future<Map<String, dynamic>?> getBackup({required String userId}) async {
  final result = await _client.get('/backup');
  return result['backup'];
}
```

---

## Part 4 — Trigger backup automatically

In `KinProvider`, trigger a backup after any data change:
- After `addKinLocal`
- After `addKinLinked`
- After deleting a kin person
- After any note/date/link is added or removed (hook into LocalDb calls)

Keep it fire-and-forget — backup failure should never block the UI:
```dart
void _triggerBackup() {
  final authService = // get from context or pass in
  if (!authService.isAuthenticated) return;
  BackupService().backup(
    userId: authService.userId,
    accessToken: authService.accessToken!,
    api: _api,
  ).catchError((e) => debugPrint('Backup failed silently: $e'));
}
```

---

## Part 5 — Restore on login

In `AuthService.handleAccessToken()`, after saving the token, trigger a restore:
```dart
// After successful auth
await BackupService().restore(
  userId: userId,
  accessToken: token,
  api: kindredApi,
);
```

This runs once after login. If no backup exists, it's a no-op. If a backup exists, local data is merged with backup data (don't overwrite newer local data with older backup data — use `created_at` to resolve conflicts).

---

## Rules

- Read docs first, three bullet summary, wait for confirmation
- Server stores ciphertext only — never log or inspect plaintext
- Backup failure is always silent — never blocks the UI
- Restore is additive — never deletes existing local data
- Show backend migration and Flutter encryption code before running
- `flutter analyze` must pass before declaring done
