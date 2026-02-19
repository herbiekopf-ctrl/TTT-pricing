import type { Collector } from "./types";
import { normalizeItemName } from "@/lib/matching/normalize";

const competitors = [
  { name: "Urban Oven", chain: false, cuisine: "italian" },
  { name: "Pasta Grove", chain: false, cuisine: "italian" },
  { name: "Bella Corner", chain: false, cuisine: "pizza" },
  { name: "Harvest Plate", chain: false, cuisine: "american" },
  { name: "Sunset Trattoria", chain: false, cuisine: "italian" },
  { name: "Riverside Kitchen", chain: false, cuisine: "american" },
  { name: "North Fork", chain: false, cuisine: "newamerican" },
  { name: "Olive Field", chain: true, cuisine: "italian" },
  { name: "Rustic Flame", chain: false, cuisine: "pizza" },
  { name: "Market Spoon", chain: false, cuisine: "cafes" }
];

export const demoCollector: Collector = {
  name: "demo",
  version: "1.1.0",
  async collect({ query }) {
    const target = normalizeItemName(query.targetItem);
    const now = new Date();

    const eligible = competitors.filter((c, idx) => {
      if (query.filters.excludeChains && c.chain) return false;
      if (query.filters.cuisine?.length && !query.filters.cuisine.includes(c.cuisine)) return false;
      const rating = 3.8 + ((idx % 5) * 0.3);
      if ((query.filters.minRating ?? 0) > rating) return false;
      return true;
    });

    const restaurants = eligible.map((comp, idx) => ({
      name: comp.name,
      address: `${100 + idx} Main St`,
      lat: (query.storeLat ?? 37.77) + idx * 0.002,
      lng: (query.storeLng ?? -122.42) + idx * 0.002,
      websiteDomain: `${comp.name.toLowerCase().replace(/\s+/g, "")}.com`
    }));

    const menuItems = restaurants.map((r, idx) => ({
      restaurantKey: `${r.name}|${r.address}`,
      normalizedName: idx % 3 === 0 ? `${target} special` : target,
      category: query.targetCategory ?? "entree",
      variant: query.targetVariant
    }));

    const priceObservations = menuItems.flatMap((m, idx) => {
      const base = 10 + idx * 0.8;
      const observations: Array<{
        restaurantKey: string;
        normalizedName: string;
        sourceType: "WEBSITE" | "DELIVERY";
        sourceUrl: string;
        capturedAt: Date;
        observedPrice: number;
        currency: string;
        isDeliveryPrice: boolean;
        deliveryPlatformName?: string;
      }> = [
        {
          restaurantKey: m.restaurantKey,
          normalizedName: m.normalizedName,
          sourceType: "WEBSITE" as const,
          sourceUrl: `https://${restaurants[idx].websiteDomain}/menu`,
          capturedAt: now,
          observedPrice: Number(base.toFixed(2)),
          currency: "USD",
          isDeliveryPrice: false
        }
      ];

      if (query.filters.includeDeliveryPrices) {
        observations.push({
          restaurantKey: m.restaurantKey,
          normalizedName: m.normalizedName,
          sourceType: "DELIVERY" as const,
          sourceUrl: `https://delivery.example/${restaurants[idx].name}`,
          capturedAt: now,
          observedPrice: Number((base * 1.18).toFixed(2)),
          currency: "USD",
          isDeliveryPrice: true,
          deliveryPlatformName: "DemoDash"
        });
      }

      return observations;
    });

    const reviews = restaurants.map((r, idx) => ({
      restaurantKey: `${r.name}|${r.address}`,
      sourceType: "DEMO" as const,
      capturedAt: now,
      rating: 3.8 + ((idx % 5) * 0.3),
      text:
        idx % 2 === 0
          ? "Customers mention good value and fresh quality ingredients."
          : "Tasty overall, but several reviews say it feels overpriced for portion size."
    }));

    const rawPayloadRefs = [
      {
        key: "demo-snapshot",
        sourceType: "DEMO" as const,
        contentType: "application/json",
        storageRef: "seed://demo/collector",
        hash: `demohash-${eligible.length}`,
        metadata: { restaurants: restaurants.length },
        capturedAt: now
      }
    ];

    return { restaurants, menuItems, priceObservations, reviews, rawPayloadRefs };
  }
};
