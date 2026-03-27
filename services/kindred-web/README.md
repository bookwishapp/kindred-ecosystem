# Kindred Web

Public-facing web app for Kindred profiles, served from fromkindred.com.

## Features

- Public profile pages at `/{userId}`
- Fetches profile data from api.fromkindred.com API
- "Keep in Kindred" button with deep link to `kindred://{userId}`
- Warm, minimal design with Poppins font

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Copy `.env.example` to `.env.local` and update as needed:

- `NEXT_PUBLIC_API_URL`: Kindred API endpoint (default: https://api.fromkindred.com)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (Railway sets this automatically)

## Deployment

This app is configured for Railway deployment:

1. Push to GitHub
2. Connect repo to Railway
3. Railway will auto-detect Next.js and deploy
4. Set custom domain to fromkindred.com

## API Endpoints

- `GET /profiles/{userId}`: Fetches public profile data

## Deep Linking

Profile pages include a "Keep in Kindred" button that deep links to:
- `kindred://{userId}`

This opens the Kindred app and navigates to the profile if the app is installed.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- React 18
- CSS with Poppins font
- Server-side rendering for SEO