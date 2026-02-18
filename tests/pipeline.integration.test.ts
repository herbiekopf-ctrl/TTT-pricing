import { describe, expect, it } from "vitest";
import { demoCollector } from "@/lib/collectors/demoCollector";
import { matchItems } from "@/lib/matching/matcher";
import { computePriceEstimate } from "@/lib/analytics/confidence";

describe("mock collector pipeline", () => {
  it("collects, matches and estimates", async () => {
    const data = await demoCollector.collect({
      query: {
        workspaceId: "w",
        storeId: "s",
        targetItem: "Margherita Pizza",
        radiusKm: 5,
        filters: {},
        positioningIntent: "Balanced"
      }
    });

    const matches = matchItems(
      { item: "Margherita Pizza" },
      data.menuItems.map((m, idx) => ({ id: String(idx), normalizedName: m.normalizedName, category: m.category }))
    );

    expect(matches.length).toBeGreaterThan(0);

    const prices = data.priceObservations
      .filter((p) => p.restaurantKey === data.menuItems[0].restaurantKey)
      .map((p) => ({ sourceType: p.sourceType, price: p.observedPrice, capturedAt: p.capturedAt, isDelivery: p.isDeliveryPrice }));
    const estimate = computePriceEstimate(prices);

    expect(estimate.confidence).toBeGreaterThan(0);
    expect(estimate.estimatedInStorePrice).toBeGreaterThan(0);
  });
});
