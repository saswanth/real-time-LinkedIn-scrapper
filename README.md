# Realtime LinkedIn Scrapper API Agent

A full-stack realtime LinkedIn insights dashboard that uses your RapidAPI credentials to fetch company data and generate job analytics.

## Features

- Express API agent for LinkedIn company data by domain
- Realtime streaming endpoint using Server-Sent Events (SSE)
- Insight scoring engine (follower pressure, specialization depth, geo reach, hiring momentum)
- Job analytics summary and role theme suggestions
- Frontend dashboard with live updates + raw response viewer

## Tech Stack

- Node.js + Express
- RapidAPI (LinkedIn Data API)
- Vanilla HTML/CSS/JS frontend

## Project Structure

- `src/server.js`: API server and realtime stream endpoints
- `src/services/linkedinService.js`: RapidAPI integration + analytics derivation
- `public/index.html`: dashboard UI
- `public/styles.css`: visual design
- `public/app.js`: frontend logic and live streaming

## Environment

The app reads credentials from `.env`:

```env
PORT=4000
RAPIDAPI_HOST=linkedin-data-api.p.rapidapi.com
RAPIDAPI_KEY=your_rapidapi_key
POLL_INTERVAL_MS=15000
ALLOW_DEMO_FALLBACK=true
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm run dev
```

3. Open dashboard:

- http://localhost:4000

## API Endpoints

### Health

- `GET /api/health`

### Company Snapshot + Analytics

- `GET /api/company?domain=apple.com`

Response includes:

- `rawCompanyData`
- `insights.companySnapshot`
- `insights.insightSignals`
- `insights.jobAnalytics`

### Realtime Stream

- `GET /api/stream?domain=apple.com`

SSE event types:

- `insights`
- `error`

## Notes

- Keep `.env` private. `.gitignore` excludes it.
- Analytics are derived from available company metadata and intended as decision-support signals.
- If the upstream provider is unavailable, the API can automatically return clearly-labeled demo fallback insights (`fallbackMode=true`).
