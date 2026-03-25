# Kindred Backend Service

Backend service for the Kindred app, handling profiles and kin records.

## Setup

1. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
npm install
```

3. Run migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Must match the auth service JWT secret
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: production | development
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## API Endpoints

All protected endpoints require `Authorization: Bearer <token>` header.

### Health Check

```bash
curl http://localhost:3001/health
```

### Profile Endpoints

#### Get My Profile
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/profiles/me
```

#### Create Profile
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","birthday":"1990-01-01"}' \
  http://localhost:3001/profiles
```

#### Update Profile
```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","bio":"Hello world"}' \
  http://localhost:3001/profiles/me
```

#### Add Wishlist Link
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Amazon Wishlist","url":"https://amazon.com/wishlist/123"}' \
  http://localhost:3001/profiles/me/wishlist-links
```

#### Delete Wishlist Link
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/profiles/me/wishlist-links/$LINK_ID
```

#### Add Shared Date
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Anniversary","date":"2020-06-15","recurs_annually":true}' \
  http://localhost:3001/profiles/me/dates
```

#### Delete Shared Date
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/profiles/me/dates/$DATE_ID
```

#### Get Public Profile (no auth required)
```bash
curl http://localhost:3001/profiles/$USER_ID
```

### Kin Endpoints

#### Get All Kin
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/kin
```

#### Add Linked Kin
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"linked","linked_profile_id":"uuid-here"}' \
  http://localhost:3001/kin
```

#### Add Local Kin
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"local","local_name":"Mom","local_birthday":"1960-05-15"}' \
  http://localhost:3001/kin
```

#### Update Kin (position or local fields)
```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"position_override":0.5}' \
  http://localhost:3001/kin/$KIN_ID
```

#### Delete Kin
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/kin/$KIN_ID
```

#### Add Private Date to Kin
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Surgery","date":"2024-03-15","recurs_annually":false}' \
  http://localhost:3001/kin/$KIN_ID/dates
```

#### Delete Kin Date
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/kin/$KIN_ID/dates/$DATE_ID
```

## Database Schema

See `migrations/001_initial.sql` for the full schema.

Key tables:
- `profiles`: User profiles (Show Up data)
- `profile_wishlist_links`: Shared wishlist links
- `profile_dates`: Shared important dates
- `kin_records`: People in your kin (linked or local)
- `kin_dates`: Private dates for kin members

## Deployment

Deploy command for Railway:
```
node migrate.js && node src/index.js
```