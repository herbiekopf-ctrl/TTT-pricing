export type QueryInput = {
  workspaceId: string;
  storeId: string;
  targetItem: string;
  targetCategory?: string;
  targetVariant?: string;
  radiusKm: number;
  filters: {
    cuisine?: string[];
    excludeChains?: boolean;
    minRating?: number;
    serviceStyle?: string;
    includeDeliveryPrices?: boolean;
  };
  positioningIntent: "Value" | "Balanced" | "Premium";
  storeCurrentPrice?: number;
};

export type StandardizedCollectorResult = {
  restaurants: Array<{
    name: string;
    address: string;
    lat: number;
    lng: number;
    googlePlaceId?: string;
    yelpId?: string;
    websiteDomain?: string;
  }>;
  menuItems: Array<{
    restaurantKey: string;
    normalizedName: string;
    category?: string;
    variant?: string;
  }>;
  priceObservations: Array<{
    restaurantKey: string;
    normalizedName: string;
    sourceType: "GOOGLE" | "YELP" | "WEBSITE" | "DELIVERY" | "MANUAL" | "DEMO";
    sourceUrl: string;
    capturedAt: Date;
    observedPrice: number;
    currency: string;
    isDeliveryPrice: boolean;
    deliveryPlatformName?: string;
  }>;
  reviews: Array<{
    restaurantKey: string;
    sourceType: "GOOGLE" | "YELP" | "WEBSITE" | "DELIVERY" | "MANUAL" | "DEMO";
    capturedAt: Date;
    rating?: number;
    text: string;
  }>;
  rawPayloadRefs: Array<{
    key: string;
    sourceType: "GOOGLE" | "YELP" | "WEBSITE" | "DELIVERY" | "MANUAL" | "DEMO";
    contentType: string;
    storageRef: string;
    hash: string;
    metadata: Record<string, unknown>;
    capturedAt: Date;
  }>;
};
