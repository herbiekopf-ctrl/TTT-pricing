export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const stores = await prisma.store.findMany({ take: 8, orderBy: { createdAt: "desc" } });
  const liveReady = Boolean(process.env.YELP_API_KEY) && process.env.ENABLE_YELP === "true";

  return (
    <div>
      <h1>Settings</h1>
      <div className="card">
        <h2>Live data status</h2>
        <p>
          Yelp data source: <b>{liveReady ? "Connected" : "Not connected"}</b>
        </p>
        <p>
          Required env: <code>YELP_API_KEY</code> and <code>ENABLE_YELP=true</code>.
        </p>
        <p className="muted">Demo data is disabled in this version so every analysis is based on real API results.</p>
      </div>

      <div className="card">
        <h2>Saved stores</h2>
        {stores.length === 0 ? (
          <p className="muted">No stores saved yet.</p>
        ) : (
          stores.map((store: any) => (
            <div key={store.id}>
              <b>{store.name}</b> — {store.address}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
