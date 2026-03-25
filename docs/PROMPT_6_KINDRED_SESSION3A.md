# Claude Code Prompt — Kindred Session 3a: Backend Service + Real Data

## Context

Read these files before doing anything else:
- `docs/ARCHITECTURE.md`
- `docs/CLAUDE.md`
- `docs/KINDRED_V1_SPEC.md`

Summarize in three bullet points what this session builds and why. Wait for confirmation before proceeding.

---

## What you are building

Two things in this session:

1. A new Node.js/Express backend service at `services/kindred/`
2. Wire the Flutter app at `apps/kindred/` to use real data from this service

This session covers profiles and kin records only. Private notes, private dates, and private wishlist links are Session 3b.

---

## Part 1 — Backend Service

### Location
`services/kindred/` in the monorepo

### Tech stack
- Node.js / Express
- PostgreSQL (Railway Postgres — new database, separate from auth and web)
- `pg` directly — no ORM
- Custom migration runner (same pattern as `services/auth` — read `services/auth/migrate.js` for reference)
- AWS SES SMTP is NOT needed in this service
- JWT verification only — no JWT issuing (auth service handles that)

### Authentication
All protected endpoints verify the JWT from the central auth service.

The JWT was issued by `services/auth` and signed with `JWT_SECRET`. This service uses the same `JWT_SECRET` to verify it — no call to the auth service needed, just local verification.

Middleware:
```javascript
// middleware.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Database schema

#### migrations/001_initial.sql

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  birthday DATE,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_wishlist_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurs_annually BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kin_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('linked', 'local')),
  linked_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  local_name TEXT,
  local_photo_url TEXT,
  local_birthday DATE,
  position_override DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kin_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kin_record_id UUID REFERENCES kin_records(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurs_annually BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API endpoints

All endpoints require `Authorization: Bearer <token>` except `GET /profiles/:userId`.

#### Profile endpoints

**GET /profiles/me**
Returns the authenticated user's profile. 404 if not yet created.
Response: `{ profile, wishlist_links, dates }`

**POST /profiles**
Creates a profile for the authenticated user.
Body: `{ name, photo_url?, birthday?, bio? }`
Returns created profile.

**PUT /profiles/me**
Updates authenticated user's profile.
Body: any subset of `{ name, photo_url, birthday, bio }`

**POST /profiles/me/wishlist-links**
Adds a wishlist link to authenticated user's profile.
Body: `{ label, url }`

**DELETE /profiles/me/wishlist-links/:id**
Removes a wishlist link.

**POST /profiles/me/dates**
Adds a shared date.
Body: `{ label, date, recurs_annually }`

**DELETE /profiles/me/dates/:id**
Removes a shared date.

**GET /profiles/:userId**
Public — no auth required.
Returns a user's profile for display when someone taps a shared link.
Response: `{ profile, wishlist_links, dates }`

#### Kin endpoints

**GET /kin**
Returns all kin records for the authenticated user.
Joins linked profiles where type = 'linked'.
Response: array of kin records with profile data embedded.

**POST /kin**
Adds a new kin record.
Body for linked: `{ type: 'linked', linked_profile_id }`
Body for local: `{ type: 'local', local_name, local_photo_url?, local_birthday? }`

**PUT /kin/:id**
Updates a kin record (position_override, local fields).
Body: any subset of updatable fields.

**DELETE /kin/:id**
Removes a kin record.

**POST /kin/:id/dates**
Adds a private date to a kin record.
Body: `{ label, date, recurs_annually }`

**DELETE /kin/:id/dates/:dateId**
Removes a private date.

#### Health check

**GET /health**
Returns `{ status: 'healthy', service: 'kindred' }`

### File structure

```
services/kindred/
  src/
    index.js          # Express app, routes
    db.js             # pg pool
    middleware.js     # JWT authenticate
    profiles.js       # Profile route handlers
    kin.js            # Kin route handlers
  migrations/
    001_initial.sql
  migrate.js          # Same pattern as services/auth
  package.json
  .env.example
  README.md
```

### Environment variables

```
DATABASE_URL=
JWT_SECRET=             # Same value as auth service
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=        # comma-separated, include app origins
```

### Rules
- No TypeScript — plain JavaScript
- No ORM — `pg` directly
- Read `services/auth/src/index.js` and `services/auth/migrate.js` for patterns to follow
- Deploy command: `node migrate.js && node src/index.js`

---

## Part 2 — Wire Flutter App to Backend

### New files to create

`apps/kindred/lib/services/kindred_api.dart`

A service class using `ApiClient` from `packages/core`:

```dart
class KindredApi {
  final ApiClient _client;

  KindredApi({required ApiClient client}) : _client = client;

  // Kin
  Future<List<Map<String, dynamic>>> getKin() async { ... }
  Future<Map<String, dynamic>> addKinLinked(String linkedProfileId) async { ... }
  Future<Map<String, dynamic>> addKinLocal({
    required String name,
    String? photoUrl,
    DateTime? birthday,
  }) async { ... }
  Future<void> updateKin(String id, Map<String, dynamic> updates) async { ... }
  Future<void> deleteKin(String id) async { ... }
  Future<void> updatePosition(String id, double position) async { ... }

  // Profile
  Future<Map<String, dynamic>?> getMyProfile() async { ... }
  Future<Map<String, dynamic>> createProfile({
    required String name,
    String? photoUrl,
    DateTime? birthday,
  }) async { ... }
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> updates) async { ... }
  Future<Map<String, dynamic>> getProfile(String userId) async { ... }
}
```

### Update KinProvider

Replace mock data with real API calls:

```dart
class KinProvider extends ChangeNotifier {
  final KindredApi _api;
  List<KinPerson> _kin = [];
  bool _loading = false;
  String? _error;

  KinProvider({required KindredApi api}) : _api = api;

  List<KinPerson> get kin => _kin;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadKin() async {
    _loading = true;
    notifyListeners();
    try {
      final data = await _api.getKin();
      _kin = data.map((d) => KinPerson.fromJson(d)).toList();
      _updateNaturalPositions();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // setPosition and snapPosition update locally immediately
  // then call _api.updatePosition in background (fire and forget)
  void setPosition(String id, double position) {
    // ... existing local logic ...
    _api.updatePosition(id, position); // background sync
    notifyListeners();
  }
}
```

### Update KinPerson model

Add `fromJson` factory and `toJson` method:

```dart
factory KinPerson.fromJson(Map<String, dynamic> json) {
  return KinPerson(
    id: json['id'],
    name: json['type'] == 'linked' 
      ? json['profile']?['name'] ?? 'Unknown'
      : json['local_name'] ?? 'Unknown',
    photoUrl: json['type'] == 'linked'
      ? json['profile']?['photo_url']
      : json['local_photo_url'],
    type: json['type'] == 'linked' ? KinPersonType.linked : KinPersonType.local,
    linkedProfileId: json['linked_profile_id'],
    positionOverride: json['position_override']?.toDouble(),
    birthday: json['type'] == 'linked'
      ? _parseDate(json['profile']?['birthday'])
      : _parseDate(json['local_birthday']),
  );
}

static DateTime? _parseDate(String? dateStr) {
  if (dateStr == null) return null;
  return DateTime.tryParse(dateStr);
}
```

### Update app.dart / main provider setup

Wire up `KindredApi` and `KinProvider` with real dependencies:

```dart
// In app.dart MultiProvider setup:
ChangeNotifierProvider(
  create: (_) => KinProvider(
    api: KindredApi(
      client: ApiClient(
        baseUrl: const String.fromEnvironment(
          'KINDRED_API_URL',
          defaultValue: 'http://localhost:3001',
        ),
        tokenProvider: () => SecureStorageService.getToken(),
      ),
    ),
  )..loadKin(), // load on startup
),
```

### Add SecureStorageService

`apps/kindred/lib/services/secure_storage_service.dart`

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'access_token';

  static Future<String?> getToken() => _storage.read(key: _tokenKey);
  static Future<void> saveToken(String token) => _storage.write(key: _tokenKey, value: token);
  static Future<void> deleteToken() => _storage.delete(key: _tokenKey);
}
```

### Loading state in KindredScreen

When `provider.loading` is true, show a quiet centered indicator — not a spinner, just the empty state text "No one here yet." until data loads. No loading spinners on the grid.

---

## Environment variable for Flutter

Add to `apps/kindred/` a `.env` note (Flutter uses `--dart-define`):

```
KINDRED_API_URL=https://kindred.terryheath.com
```

For local dev:
```
KINDRED_API_URL=http://localhost:3001
```

Run with: `flutter run --dart-define=KINDRED_API_URL=http://localhost:3001`

---

## Step order

1. Read auth service code for patterns
2. Build `services/kindred/` backend
3. Run migrations locally against a test database
4. Verify all endpoints work with a REST client (curl examples in README)
5. Build Flutter service layer (`KindredApi`, `SecureStorageService`)
6. Update `KinPerson.fromJson`
7. Update `KinProvider` to use real API
8. Wire providers in `app.dart`
9. Run `flutter analyze`
10. Run app — confirm it loads (empty kin list is fine, no crash)

---

## Rules

- Read docs first, show three bullet summary, wait for confirmation
- Read `services/auth` code before writing `services/kindred` — follow its patterns exactly
- No TypeScript, no ORM
- Show backend endpoint implementations before running migrations
- Do not change avatar grid, ring system, drag behavior, or animations
- `flutter analyze` must pass before declaring done
