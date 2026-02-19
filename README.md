# TTT Pricing MVP (V1)

A dashboard-first, live-data pricing intelligence platform for small restaurants.

## What this app does
- Captures your real store profile and target item.
- Pulls live competitor data from Yelp (no demo/fake dataset).
- Matches comparable items and estimates in-store prices.
- Scores confidence and builds market bands.
- Produces concise pricing advice with trade up/down guidance tailored to your restaurant inputs.

## Requirements
- Yelp Fusion API key.
- PostgreSQL for persistence (or in-memory fallback for local UI testing).

## Run locally
1. Clone and enter project:
   ```bash
   git clone <your-repo-url>
   cd TTT-pricing
   ```
2. Install:
   ```bash
   npm install
   ```
3. Create env file:
   ```bash
   cp .env.example .env
   ```
4. Configure `.env`:
   ```dotenv
   YELP_API_KEY="<your-real-key>"
   ENABLE_YELP="true"
   ```
5. Start:
   ```bash
   npm run dev -- -p 3000
   ```
6. Open `http://127.0.0.1:3000/dashboard`

## Optional DB setup
```bash
npm run db:push
npm run db:seed
```

## Scripts
- `npm run dev`
- `npm run test`
- `npm run build`
- `npm run db:push`
- `npm run db:seed`
