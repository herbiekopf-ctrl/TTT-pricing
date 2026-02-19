export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/workspace";

type DashboardSearchParams = {
  storeId?: string;
  targetItem?: string;
  positioning?: "Value" | "Balanced" | "Premium";
};

function money(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `$${value.toFixed(2)}`;
}

export default async function DashboardPage({ searchParams }: { searchParams?: DashboardSearchParams }) {
  const workspace = await ensureWorkspace();
  const stores = await prisma.store.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } });

  const selectedStoreId = searchParams?.storeId ?? stores[0]?.id;
  const selectedItem = searchParams?.targetItem?.trim() ?? "";
  const selectedPositioning = searchParams?.positioning ?? "Balanced";

  const runs = await prisma.queryRun.findMany({
    where: {
      ...(selectedStoreId ? { storeId: selectedStoreId } : {}),
      ...(selectedItem ? { targetItem: { contains: selectedItem, mode: "insensitive" } } : {}),
      ...(selectedPositioning ? { positioningIntent: selectedPositioning } : {})
    },
    orderBy: { createdAt: "desc" },
    include: { store: true, landscapeMetrics: true, priceEstimates: true },
    take: 30
  });

  const completed = runs.filter((run: any) => run.status === "COMPLETED");
  const latest = completed[0];
  const latestLandscape = latest?.landscapeMetrics?.[0];
  const latestConclusions = (latestLandscape?.conclusionsJson ?? {}) as Record<string, any>;
  const latestBands = (latestLandscape?.marketBandsJson ?? {}) as Record<string, any>;
  const latestDistribution = (latestLandscape?.distributionStatsJson ?? {}) as Record<string, any>;
  const recommended = latestBands.recommended ?? null;
  const yelpReady = Boolean(process.env.YELP_API_KEY) && process.env.ENABLE_YELP === "true";

  const avgConfidence =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum: number, run: any) => {
            const vals = run.priceEstimates.map((estimate: any) => estimate.confidence0to100);
            if (vals.length === 0) return sum;
            return sum + vals.reduce((acc: number, v: number) => acc + v, 0) / vals.length;
          }, 0) / completed.length
        )
      : 0;

  return (
    <div>
      <section className="hero dashboard-hero">
        <div>
          <h1>{workspace.name}</h1>
          <p>
            Your restaurant pricing cockpit. Tune filters and instantly refocus recommendations for your store, menu item,
            and positioning strategy.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn link-btn" href="/query/new">
              Refresh Market Data
            </Link>
          </div>
        </div>
        <div className="live-pill">TAILORED TO YOUR STORE</div>
      </section>

      {!yelpReady ? (
        <section className="card alert-card">
          <h2>Connect Yelp to unlock live recommendations</h2>
          <p>
            Add <code>YELP_API_KEY</code> and set <code>ENABLE_YELP=true</code> in <code>.env</code>.
          </p>
        </section>
      ) : null}

      <section className="card filter-card">
        <h2>Dashboard Controls</h2>
        <form method="get" className="dashboard-filters">
          <label>
            Restaurant
            <select name="storeId" defaultValue={selectedStoreId}>
              {stores.map((store: any) => (
                <option value={store.id} key={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Focus item
            <input name="targetItem" defaultValue={selectedItem} placeholder="e.g., Margherita Pizza" />
          </label>
          <label>
            Positioning lens
            <select name="positioning" defaultValue={selectedPositioning}>
              <option>Value</option>
              <option>Balanced</option>
              <option>Premium</option>
            </select>
          </label>
          <button type="submit" className="primary-btn">
            Update View
          </button>
        </form>
      </section>

      <section className="stats-grid">
        <article className="card metric">
          <span className="metric-label">Analyses in View</span>
          <div className="metric-value">{completed.length}</div>
        </article>
        <article className="card metric">
          <span className="metric-label">Avg Confidence</span>
          <div className="metric-value">{avgConfidence}%</div>
        </article>
        <article className="card metric">
          <span className="metric-label">Suggested Price Band</span>
          <div className="metric-value">{recommended ? `${money(recommended.low)} – ${money(recommended.high)}` : "—"}</div>
        </article>
        <article className="card metric">
          <span className="metric-label">Market Median</span>
          <div className="metric-value">{money(latestDistribution.median)}</div>
        </article>
      </section>

      <section className="grid two-col">
        <article className="card insight-card">
          <h2>Recommendation for this dashboard view</h2>
          {latest ? (
            <ul className="insights">
              <li>{latestConclusions.recommendation ?? "No recommendation available."}</li>
              <li>{latestConclusions.marketPosition ?? "No market positioning comment available."}</li>
              <li>{latestConclusions.confidenceComment ?? "No confidence comment available."}</li>
            </ul>
          ) : (
            <p className="muted">
              No completed analyses match this filter set yet. Use “Refresh Market Data” to collect results, then return to
              this dashboard to compare recommendations.
            </p>
          )}
        </article>

        <article className="card insight-card">
          <h2>Recent analyses in current view</h2>
          {runs.length === 0 ? (
            <p className="muted">No analyses found for this store/item/positioning.</p>
          ) : (
            <div className="run-list">
              {runs.slice(0, 8).map((run: any) => (
                <Link className="run-row" href={`/query/${run.id}`} key={run.id}>
                  <div>
                    <b>{run.targetItem}</b>
                    <div className="muted">
                      {run.store?.name ?? "Store"} · {run.positioningIntent} · {new Date(run.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`pill ${String(run.status).toLowerCase()}`}>{run.status}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
