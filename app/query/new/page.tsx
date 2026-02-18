import { prisma } from "@/lib/prisma";
import { ensureDemoWorkspace } from "@/lib/demoSeed";

export default async function NewQueryPage() {
  const workspace = await ensureDemoWorkspace();
  const store = await prisma.store.findFirstOrThrow({ where: { workspaceId: workspace.id } });

  return (
    <div>
      <h1>New Query</h1>
      <form action="/api/query-runs" method="post">
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <input type="hidden" name="storeId" value={store.id} />
        <label>Target item<input name="targetItem" defaultValue="Margherita Pizza" required /></label>
        <label>Category<input name="targetCategory" defaultValue="pizza" /></label>
        <label>Variant<input name="targetVariant" defaultValue="12 inch" /></label>
        <label>Radius KM<input name="radiusKm" defaultValue="5" type="number" min="1" max="50" /></label>
        <label>Min rating<input name="minRating" type="number" step="0.1" defaultValue="4.0" /></label>
        <label>Positioning
          <select name="positioningIntent" defaultValue="Balanced">
            <option>Value</option>
            <option>Balanced</option>
            <option>Premium</option>
          </select>
        </label>
        <label>Current store price<input type="number" step="0.01" name="storeCurrentPrice" /></label>
        <label><input type="checkbox" name="includeDeliveryPrices" defaultChecked /> Include delivery prices</label>
        <label><input type="checkbox" name="excludeChains" /> Exclude chains</label>
        <button type="submit">Run query</button>
      </form>
    </div>
  );
}
