# TTT Pricing MVP (V1)

## Architecture overview (Phase-2 ready)

This MVP is a **pipeline-first** competitive intelligence app for restaurants.

- **App/UI layer**: Next.js App Router pages (`/dashboard`, `/query/new`, `/query/[id]`, `/mappings`, `/settings`).
- **Service layer**: `lib/pipeline`, `lib/matching`, `lib/analytics`, `lib/collectors` hold reusable analytics and ingestion logic; UI is thin.
- **Persistence layer**: PostgreSQL via Prisma with raw + normalized + derived artifacts persisted per query run.
- **Async-ready execution**: BullMQ + Redis queue (`lib/queue.ts`) for background execution, while API route currently supports synchronous execution for local MVP simplicity.

### Why this supports Phase 2
- **Time-series friendly tables** for `PriceObservation`, `ReviewObservation`, `QueryRun`, and placeholder internal data (`InternalSalesObservation`, `ElasticityMetric`).
- **Raw payload retention** (`RawPayload`) allows re-parsing when extractors improve.
- **Derived metric persistence** (`ItemMatch`, `PriceEstimate`, `SentimentMetric`, `LandscapeMetric`) avoids expensive recompute and enables longitudinal modeling with future sales data.
- **Collector versioning** is stored on each run (`QueryRun.collectorVersions`) for reproducibility.

## V1 Features implemented
- Query form with item, radius, filters, positioning intent, and optional current price.
- Demo collector pipeline with 10 seeded competitors.
- Matching engine (normalize + candidate ranking).
- Price confidence engine with source reliability, recency, variance, and delivery markup estimate.
- Sentiment/value perception extraction and evidence snippets.
- Distribution stats, market bands, trade up/down metrics, and conclusions panel.
- Manual mapping persistence page.

## Data model highlights
See `prisma/schema.prisma` for all required entities:
- Core: `Workspace`, `Store`, `QueryRun`
- Competitive time-series: `CompetitorRestaurant`, `CompetitorItem`, `PriceObservation`, `MenuSnapshot`, `ReviewObservation`
- Derived: `ItemMatch`, `PriceEstimate`, `SentimentMetric`, `LandscapeMetric`
- Raw: `RawPayload`
- Phase-2 placeholders: `InternalSalesObservation`, `ElasticityMetric`

## Local run
1. Install dependencies
   ```bash
   npm install
   ```
2. Set env variables
   ```bash
   cp .env.example .env
   ```
3. Set a PostgreSQL URL in `.env` as `DATABASE_URL`.
4. Run migrations / push schema
   ```bash
   npx prisma db push
   ```
5. Start dev server
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000/dashboard`.

## Testing
```bash
npm test
```

Includes unit tests for normalization/matching, confidence, distributions/positioning/trade-up-down, and an integration-style mock collector pipeline test.
