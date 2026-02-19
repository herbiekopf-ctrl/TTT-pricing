import { createHash } from "node:crypto";
import type { Collector } from "./types";
import { normalizeItemName } from "@/lib/matching/normalize";

const YELP_API_BASE = "https://api.yelp.com/v3";

type YelpBusiness = {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  price?: string;
  distance?: number;
  categories?: Array<{ alias: string; title: string }>;
  transactions?: string[];
  coordinates?: { latitude?: number; longitude?: number };
  location?: { display_address?: string[] };
  url?: string;
};

function priceTierToEstimatedInStorePrice(tier: string | undefined, fallback: number) {
  const map: Record<string, number> = {
    "$": 11,
    "$$": 17,
    "$$$": 26,
    "$$$$": 40
  };
  return map[tier ?? ""] ?? fallback;
}

function shouldExcludeChain(name: string) {
  const chainHints = ["pizza hut", "domino", "mcdonald", "subway", "starbucks", "kfc", "burger king"];
  return chainHints.some((hint) => name.toLowerCase().includes(hint));
}

export const yelpCollector: Collector = {
  name: "yelp",
  version: "1.0.0",
  async collect({ query }) {
    const yelpKey = process.env.YELP_API_KEY;
    if (!yelpKey || process.env.ENABLE_YELP !== "true") {
      return { restaurants: [], menuItems: [], priceObservations: [], reviews: [], rawPayloadRefs: [] };
    }

    const now = new Date();
    const normalized = normalizeItemName(query.targetItem);
    const searchParams = new URLSearchParams({
      term: query.targetItem,
      latitude: String(query.storeLat ?? 0),
      longitude: String(query.storeLng ?? 0),
      radius: String(Math.min(Math.round(query.radiusKm * 1000), 40000)),
      limit: "20",
      sort_by: "rating"
    });

    if (query.filters.cuisine?.length) {
      searchParams.set("categories", query.filters.cuisine.join(","));
    }

    const response = await fetch(`${YELP_API_BASE}/businesses/search?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${yelpKey}` },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Yelp search failed (${response.status})`);
    }

    const payload = (await response.json()) as { businesses: YelpBusiness[] };
    const businesses = payload.businesses.filter((business) => {
      if (!business.coordinates?.latitude || !business.coordinates?.longitude) return false;
      if ((query.filters.minRating ?? 0) > (business.rating ?? 0)) return false;
      if (query.filters.excludeChains && shouldExcludeChain(business.name)) return false;
      return true;
    });

    const restaurants = businesses.map((business) => ({
      name: business.name,
      address: business.location?.display_address?.join(", ") ?? "Unknown address",
      lat: business.coordinates!.latitude!,
      lng: business.coordinates!.longitude!,
      yelpId: business.id,
      websiteDomain: undefined
    }));

    const menuItems = restaurants.map((restaurant) => ({
      restaurantKey: `${restaurant.name}|${restaurant.address}`,
      normalizedName: normalized,
      category: query.targetCategory ?? "menu-item",
      variant: query.targetVariant
    }));

    const priceObservations = businesses.flatMap((business, index) => {
      const restaurant = restaurants[index];
      const restaurantKey = `${restaurant.name}|${restaurant.address}`;
      const baseFromTier = priceTierToEstimatedInStorePrice(
        business.price,
        12 + ((business.rating ?? 4) - 3.5) * 4
      );

      const observations: Array<{
        restaurantKey: string;
        normalizedName: string;
        sourceType: "YELP" | "DELIVERY";
        sourceUrl: string;
        capturedAt: Date;
        observedPrice: number;
        currency: string;
        isDeliveryPrice: boolean;
        deliveryPlatformName?: string;
      }> = [
        {
          restaurantKey,
          normalizedName: normalized,
          sourceType: "YELP" as const,
          sourceUrl: business.url ?? `https://www.yelp.com/biz/${business.id}`,
          capturedAt: now,
          observedPrice: Number(baseFromTier.toFixed(2)),
          currency: "USD",
          isDeliveryPrice: false
        }
      ];

      const offersDelivery = business.transactions?.includes("delivery") ?? false;
      if (query.filters.includeDeliveryPrices && offersDelivery) {
        observations.push({
          restaurantKey,
          normalizedName: normalized,
          sourceType: "DELIVERY" as const,
          sourceUrl: business.url ?? `https://www.yelp.com/biz/${business.id}`,
          capturedAt: now,
          observedPrice: Number((baseFromTier * 1.16).toFixed(2)),
          currency: "USD",
          isDeliveryPrice: true,
          deliveryPlatformName: "Yelp Delivery"
        });
      }

      return observations;
    });

    const reviews = businesses
      .map((business) => ({
        restaurantKey: `${business.name}|${business.location?.display_address?.join(", ") ?? "Unknown address"}`,
        sourceType: "YELP" as const,
        capturedAt: now,
        rating: business.rating,
        text: `Yelp profile: ${business.review_count ?? 0} reviews, rating ${business.rating ?? "N/A"}, price tier ${business.price ?? "unknown"}.`
      }));

    const raw = JSON.stringify(payload);
    const rawPayloadRefs = [
      {
        key: "yelp-search",
        sourceType: "YELP" as const,
        contentType: "application/json",
        storageRef: "memory://yelp/search",
        hash: createHash("sha256").update(raw).digest("hex"),
        metadata: {
          count: businesses.length,
          term: query.targetItem
        },
        capturedAt: now
      }
    ];

    return { restaurants, menuItems, priceObservations, reviews, rawPayloadRefs };
  }
};
