export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, any>;

function asMoney(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function bandWidth(min: number, max: number, low: number, high: number) {
  const range = Math.max(max - min, 0.01);
  const left = ((low - min) / range) * 100;
  const width = ((high - low) / range) * 100;
  return { left: Math.max(0, left), width: Math.max(width, 2) };
}

export default async function QueryDetailsPage({ params }: { params: { id: string } }) {
  const run = await prisma.queryRun.findUniqueOrThrow({ where: { id: params.id } });
  const matches = await prisma.itemMatch.findMany({
    where: { queryRunId: run.id },
    include: {
      competitorItem: {
        include: {
          restaurant: true,
          priceObservations: true,
          estimates: { where: { queryRunId: run.id } }
        }
      }
    }
  });
  const sentiments = await prisma.sentimentMetric.findMany({ where: { queryRunId: run.id }, include: { restaurant: true } });
  const landscape = await prisma.landscapeMetric.findFirst({ where: { queryRunId: run.id } });

  const distribution = (landscape?.distributionStatsJson ?? {}) as JsonRecord;
  const marketBands = (landscape?.marketBandsJson ?? {}) as JsonRecord;
  const conclusions = (landscape?.conclusionsJson ?? {}) as JsonRecord;

  const recommended = marketBands.recommended ?? { low: 0, high: 0 };
  const bar = bandWidth(distribution.min ?? 0, distribution.max ?? 1, recommended.low ?? 0, recommended.high ?? 0);

  return (
    <div>
      <div className="hero compact">
        <h1>{run.targetItem} Market Analysis</h1>
        <p>
          {conclusions.headline ?? "Review confidence-scored estimates and pricing bands tailored to your positioning intent."}
        </p>
      </div>

      <div className="grid four">
        <div className="card">
          <b>Status</b>
          <div>{run.status}</div>
        </div>
        <div className="card">
          <b>Positioning</b>
          <div>{run.positioningIntent}</div>
        </div>
        <div className="card">
          <b>Radius</b>
          <div>{run.radiusKm} km</div>
        </div>
        <div className="card">
          <b>Current Price</b>
          <div>{run.storeCurrentPrice ? `$${run.storeCurrentPrice}` : "N/A"}</div>
        </div>
      </div>

      <h2>Competitive Table</h2>
      <table>
        <thead>
          <tr>
            <th>Competitor</th>
            <th>Matched item</th>
            <th>Observed prices</th>
            <th>Est. in-store</th>
            <th>Delivery markup %</th>
            <th>Confidence</th>
            <th>Value score</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match: any) => {
            const estimate = match.competitorItem.estimates[0];
            const sentiment = sentiments.find((entry: any) => entry.restaurantId === match.competitorItem.restaurantId);
            return (
              <tr key={match.id}>
                <td>{match.competitorItem.restaurant.name}</td>
                <td>{match.competitorItem.normalizedName}</td>
                <td>
                  {match.competitorItem.priceObservations
                    .map((price: any) => `${price.sourceType}: ${asMoney(Number(price.observedPrice))}`)
                    .join(" · ")}
                </td>
                <td>{estimate ? asMoney(Number(estimate.estimatedInStorePrice)) : "-"}</td>
                <td>{estimate?.deliveryMarkupEstimatePct?.toFixed(1) ?? "-"}</td>
                <td>{estimate?.confidence0to100 ?? "-"}</td>
                <td>{sentiment?.valueScore?.toFixed?.(1) ?? "-"}</td>
                <td>{sentiment?.evidenceSnippetIds?.[0] ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Distribution & Market Bands</h2>
      <div className="card">
        <div className="grid four">
          <div>
            <b>Min</b>
            <div>{asMoney(distribution.min)}</div>
          </div>
          <div>
            <b>Median</b>
            <div>{asMoney(distribution.median)}</div>
          </div>
          <div>
            <b>Max</b>
            <div>{asMoney(distribution.max)}</div>
          </div>
          <div>
            <b>Sample Size</b>
            <div>{distribution.sampleSize ?? 0}</div>
          </div>
        </div>
        <div className="band-track">
          <div className="band-core" style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
        </div>
        <div className="band-labels">
          <span>Recommended {asMoney(recommended.low)} - {asMoney(recommended.high)}</span>
          <span>Core market {asMoney(marketBands.core?.min)} - {asMoney(marketBands.core?.max)}</span>
        </div>
      </div>

      <h2>Conclusions</h2>
      <div className="card">
        <p><b>Recommendation:</b> {conclusions.recommendation ?? "N/A"}</p>
        <p><b>Market position:</b> {conclusions.marketPosition ?? "N/A"}</p>
        <p><b>Confidence:</b> {conclusions.confidenceComment ?? "N/A"}</p>
        {conclusions.tradeGuidance ? (
          <p>
            <b>Trade up/down:</b> move {conclusions.tradeGuidance.moveToLowPct}% to reach the low end, and {" "}
            {conclusions.tradeGuidance.moveToHighPct}% to reach the high end of the recommended band.
          </p>
        ) : null}
        {conclusions.filterSummary ? (
          <p className="muted">
            Filters used: cuisines {conclusions.filterSummary.cuisine?.join(", ")}, min rating {conclusions.filterSummary.minRating},
            chains {conclusions.filterSummary.excludeChains ? "excluded" : "included"}, delivery prices {conclusions.filterSummary.includeDeliveryPrices ? "included" : "excluded"}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
