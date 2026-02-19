export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/workspace";

export default async function NewQueryPage() {
  const workspace = await ensureWorkspace();
  const store = await prisma.store.findFirst({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="hero">
        <h1>Update Your Market Inputs</h1>
        <p>
          This is the data-entry workspace for your dashboard. Update your store and market inputs to generate refreshed pricing recommendations.
        </p>
      </div>

      <form action="/api/query-runs" method="post" className="stacked-form">
        <input type="hidden" name="workspaceId" value={workspace.id} />
        {store ? <input type="hidden" name="storeId" value={store.id} /> : null}

        <section className="card">
          <h2>Your Store</h2>
          <div className="grid three">
            <label>
              Store name
              <input name="storeName" defaultValue={store?.name ?? ""} required />
            </label>
            <label>
              Store timezone
              <input name="storeTimezone" defaultValue={store?.timezone ?? "America/Los_Angeles"} required />
            </label>
            <label>
              Cuisine tags (comma separated)
              <input name="storeCuisineTags" defaultValue={store?.cuisineTags?.join(", ") ?? ""} />
            </label>
          </div>
          <label>
            Address
            <input name="storeAddress" defaultValue={store?.address ?? ""} required />
          </label>
          <div className="grid three">
            <label>
              Latitude
              <input name="storeLat" type="number" step="0.0001" defaultValue={String(store?.lat ?? "")} required />
            </label>
            <label>
              Longitude
              <input name="storeLng" type="number" step="0.0001" defaultValue={String(store?.lng ?? "")} required />
            </label>
            <label>
              Current item price (optional)
              <input type="number" step="0.01" name="storeCurrentPrice" placeholder="13.99" />
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Target Item & Positioning</h2>
          <div className="grid three">
            <label>
              Target item
              <input name="targetItem" placeholder="Margherita Pizza" required />
            </label>
            <label>
              Category
              <input name="targetCategory" placeholder="pizza" />
            </label>
            <label>
              Variant/size
              <input name="targetVariant" placeholder="12 inch" />
            </label>
          </div>
          <div className="grid three">
            <label>
              Positioning intent
              <select name="positioningIntent" defaultValue="Balanced">
                <option>Value</option>
                <option>Balanced</option>
                <option>Premium</option>
              </select>
            </label>
            <label>
              Search radius (km)
              <input name="radiusKm" defaultValue="5" type="number" min="1" max="40" />
            </label>
            <label>
              Minimum Yelp rating
              <input name="minRating" type="number" step="0.1" defaultValue="4.0" />
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Competitive Filters</h2>
          <div className="grid three">
            <label>
              Cuisine filter (Yelp category aliases)
              <input name="cuisine" placeholder="italian,pizza" />
            </label>
            <label>
              Service style
              <select name="serviceStyle" defaultValue="any">
                <option value="any">Any</option>
                <option value="dine-in">Dine-in</option>
                <option value="counter-service">Counter Service</option>
                <option value="delivery-first">Delivery-first</option>
              </select>
            </label>
            <label className="checkline">
              <input type="checkbox" name="excludeChains" /> Exclude chains
            </label>
          </div>
          <label className="checkline">
            <input type="checkbox" name="includeDeliveryPrices" defaultChecked /> Include delivery prices
          </label>
        </section>

        <button type="submit" className="primary-btn">Generate Updated Pricing Advice</button>
      </form>
    </div>
  );
}
