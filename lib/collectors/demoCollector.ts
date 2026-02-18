import type { Collector } from "./types";
import { normalizeItemName } from "@/lib/matching/normalize";

const competitors = [
  "Urban Oven", "Pasta Grove", "Bella Corner", "Harvest Plate", "Sunset Trattoria",
  "Riverside Kitchen", "North Fork", "Olive Field", "Rustic Flame", "Market Spoon"
];

export const demoCollector: Collector = {
  name: "demo",
  version: "1.0.0",
  async collect({ query }) {
    const target = normalizeItemName(query.targetItem);
    const now = new Date();

    const restaurants = competitors.map((name, idx) => ({
      name,
      address: `${100 + idx} Main St`,
      lat: 37.77 + idx * 0.002,
      lng: -122.42 + idx * 0.002,
      websiteDomain: `${name.toLowerCase().replace(/\s+/g, "")}.com`
    }));

    const menuItems = restaurants.map((r, idx) => ({
      restaurantKey: `${r.name}|${r.address}`,
      normalizedName: idx % 3 === 0 ? `${target} special` : target,
      category: query.targetCategory ?? "entree",
      variant: query.targetVariant
    }));

    const priceObservations = menuItems.flatMap((m, idx) => {
      const base = 10 + idx * 0.8;
      return [
        {
          restaurantKey: m.restaurantKey,
          normalizedName: m.normalizedName,
          sourceType: "WEBSITE" as const,
          sourceUrl: `https://${restaurants[idx].websiteDomain}/menu`,
          capturedAt: now,
          observedPrice: Number(base.toFixed(2)),
          currency: "USD",
          isDeliveryPrice: false
        },
        {
          restaurantKey: m.restaurantKey,
          normalizedName: m.normalizedName,
          sourceType: "DELIVERY" as const,
          sourceUrl: `https://delivery.example/${restaurants[idx].name}`,
          capturedAt: now,
          observedPrice: Number((base * 1.18).toFixed(2)),
          currency: "USD",
          isDeliveryPrice: true,
          deliveryPlatformName: "DemoDash"
        }
      ];
    });

    const reviews = restaurants.flatMap((r, idx) => [
      {
        restaurantKey: `${r.name}|${r.address}`,
        sourceType: "DEMO" as const,
        capturedAt: now,
        rating: 4.1 + ((idx % 4) * 0.2),
        text: idx % 2 === 0 ? "Great value and fresh quality ingredients." : "Tasty but slightly overpriced for the portion size."
      }
    ]);

    const rawPayloadRefs = [
      {
        key: "demo-snapshot",
        sourceType: "DEMO" as const,
        contentType: "application/json",
        storageRef: "seed://demo/collector",
        hash: "demohashv1",
        metadata: { restaurants: restaurants.length },
        capturedAt: now
      }
    ];

    return { restaurants, menuItems, priceObservations, reviews, rawPayloadRefs };
  }
};
