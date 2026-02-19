export type SourceWeight = "WEBSITE" | "GOOGLE" | "YELP" | "DELIVERY" | "MANUAL" | "DEMO";

const SOURCE_RELIABILITY: Record<SourceWeight, number> = {
  WEBSITE: 1,
  GOOGLE: 0.8,
  YELP: 0.75,
  DELIVERY: 0.55,
  MANUAL: 0.9,
  DEMO: 0.7
};

export type PricePoint = {
  sourceType: SourceWeight;
  price: number;
  capturedAt: Date;
  isDelivery: boolean;
};

export function computePriceEstimate(points: PricePoint[]): {
  estimatedInStorePrice: number;
  confidence: number;
  confidenceFactors: Record<string, number | boolean>;
  deliveryMarkupEstimatePct: number | null;
  explanation: string;
} {
  if (!points.length) {
    return {
      estimatedInStorePrice: 0,
      confidence: 0,
      confidenceFactors: { noData: true },
      deliveryMarkupEstimatePct: null,
      explanation: "No observations found."
    };
  }

  const now = Date.now();
  const weighted = points.map((p) => {
    const ageDays = Math.max(0, (now - p.capturedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recency = Math.max(0.3, Math.exp(-ageDays / 30));
    const source = SOURCE_RELIABILITY[p.sourceType] ?? 0.5;
    const weight = recency * source;
    return { ...p, weight };
  });

  const weightedSum = weighted.reduce((sum, p) => sum + p.price * p.weight, 0);
  const totalWeight = weighted.reduce((sum, p) => sum + p.weight, 0);
  const estimate = weightedSum / totalWeight;

  const variance = weighted.reduce((sum, p) => sum + Math.pow(p.price - estimate, 2), 0) / weighted.length;
  const std = Math.sqrt(variance);
  const hasNonDelivery = weighted.some((p) => !p.isDelivery);
  const sourceCount = new Set(weighted.map((p) => p.sourceType)).size;

  const confidenceRaw = 100 - std * 8 + sourceCount * 8 + (hasNonDelivery ? 10 : -8);
  const confidence = Math.max(0, Math.min(100, Math.round(confidenceRaw)));

  const deliveryOnly = weighted.filter((p) => p.isDelivery);
  const nonDeliveryOnly = weighted.filter((p) => !p.isDelivery);
  let deliveryMarkupEstimatePct: number | null = null;
  if (deliveryOnly.length && nonDeliveryOnly.length) {
    const deliveryAvg = deliveryOnly.reduce((a, b) => a + b.price, 0) / deliveryOnly.length;
    const nonDeliveryAvg = nonDeliveryOnly.reduce((a, b) => a + b.price, 0) / nonDeliveryOnly.length;
    deliveryMarkupEstimatePct = ((deliveryAvg - nonDeliveryAvg) / nonDeliveryAvg) * 100;
  }

  return {
    estimatedInStorePrice: Number(estimate.toFixed(2)),
    confidence,
    confidenceFactors: {
      sourceCount,
      std: Number(std.toFixed(2)),
      hasNonDelivery
    },
    deliveryMarkupEstimatePct: deliveryMarkupEstimatePct ? Number(deliveryMarkupEstimatePct.toFixed(2)) : null,
    explanation: `Confidence ${confidence} based on ${sourceCount} sources, ${hasNonDelivery ? "includes" : "without"} non-delivery price and variance ${std.toFixed(2)}.`
  };
}
