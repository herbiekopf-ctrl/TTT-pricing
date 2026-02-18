import { prisma } from "@/lib/prisma";

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

  return (
    <div>
      <h1>Query Result: {run.targetItem}</h1>
      <div className="grid">
        <div className="card"><b>Status</b><div>{run.status}</div></div>
        <div className="card"><b>Positioning</b><div>{run.positioningIntent}</div></div>
        <div className="card"><b>Radius</b><div>{run.radiusKm} km</div></div>
        <div className="card"><b>Current Price</b><div>{run.storeCurrentPrice ? `$${run.storeCurrentPrice}` : "N/A"}</div></div>
      </div>

      <h2>Competitive Table</h2>
      <table>
        <thead>
          <tr>
            <th>Competitor</th><th>Matched item</th><th>Observed prices</th><th>Est in-store</th><th>Delivery markup %</th><th>Confidence</th><th>Value score</th><th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m: any) => {
            const estimate = m.competitorItem.estimates[0];
            const sentiment = sentiments.find((s: any) => s.restaurantId === m.competitorItem.restaurantId);
            return (
              <tr key={m.id}>
                <td>{m.competitorItem.restaurant.name}</td>
                <td>{m.competitorItem.normalizedName}</td>
                <td>{m.competitorItem.priceObservations.map((p: any) => `${p.sourceType}:$${p.observedPrice}`).join(" | ")}</td>
                <td>{estimate ? `$${estimate.estimatedInStorePrice}` : "-"}</td>
                <td>{estimate?.deliveryMarkupEstimatePct?.toFixed(1) ?? "-"}</td>
                <td>{estimate?.confidence0to100 ?? "-"}</td>
                <td>{sentiment?.valueScore ?? "-"}</td>
                <td>{sentiment?.evidenceSnippetIds?.[0] ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Distribution & Market Bands</h2>
      <pre className="card">{JSON.stringify(landscape?.distributionStatsJson ?? {}, null, 2)}</pre>
      <pre className="card">{JSON.stringify(landscape?.marketBandsJson ?? {}, null, 2)}</pre>

      <h2>Conclusions</h2>
      <pre className="card">{JSON.stringify(landscape?.conclusionsJson ?? {}, null, 2)}</pre>
    </div>
  );
}
