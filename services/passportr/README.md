# Passportr

Digital event passports for hop crawls, art walks, and more.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (copy `.env.example` to `.env`):
   ```bash
   cp .env.example .env
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Deployment

Deploy to Railway with the following settings:

- **Start Command:** `node migrate.js && next build && next start`
- **Watch Paths:** `services/passportr/**`
- **Root Directory:** `services/passportr`

Environment variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Shared secret with auth service
- `NEXT_PUBLIC_BASE_URL` — Base URL (e.g., https://passportr.io)
- `AUTH_BASE_URL` — Auth service URL (e.g., https://auth.terryheath.com)
- `PORT` — Railway assigns automatically

## Architecture

- **Next.js 14** with App Router
- **PostgreSQL** database
- **JWT authentication** via central auth service
- **QR codes** for stamps and redemptions

## Key Routes

### Participant-facing
- `/{username}/{hopSlug}` — Passport page
- `/stamp/{token}` — Stamp collection
- `/redeem/{token}` — Reward redemption
- `/hop/{hopSlug}` — Public hop landing page

### Organizer-facing
- `/organize` — Dashboard
- `/organize/{hopSlug}` — Manage hop

### Venue-facing
- `/venue/{token}` — QR codes and stats

## Database Tables

- `hops` — Event definitions
- `venues` — Participating locations
- `participants` — Users in a hop
- `stamps` — Collected stamps
- `redemptions` — Generated coupons
