import { prisma } from "../lib/prisma";
import { createQueryRun, executeQueryRun } from "../lib/pipeline/runQuery";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: "demo_workspace" },
    update: {},
    create: { id: "demo_workspace", name: "Demo Workspace" }
  });

  const store = await prisma.store.upsert({
    where: { id: "demo_store" },
    update: {},
    create: {
      id: "demo_store",
      workspaceId: workspace.id,
      name: "Demo Bistro",
      address: "1 Market St, SF",
      lat: 37.7936,
      lng: -122.395,
      timezone: "America/Los_Angeles",
      cuisineTags: ["italian", "pizza"]
    }
  });

  const existing = await prisma.queryRun.findFirst({ where: { storeId: store.id, targetItem: "Margherita Pizza" } });
  if (!existing) {
    const run = await createQueryRun({
      workspaceId: workspace.id,
      storeId: store.id,
      targetItem: "Margherita Pizza",
      targetCategory: "pizza",
      targetVariant: "12 inch",
      radiusKm: 5,
      filters: { minRating: 4, excludeChains: true, includeDeliveryPrices: true },
      positioningIntent: "Balanced",
      storeCurrentPrice: 13.5
    });
    await executeQueryRun(run.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
