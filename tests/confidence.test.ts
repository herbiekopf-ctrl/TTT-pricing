import { describe, expect, it } from "vitest";
import { computePriceEstimate } from "@/lib/analytics/confidence";

describe("confidence scoring", () => {
  it("computes estimate and confidence", () => {
    const now = new Date();
    const result = computePriceEstimate([
      { sourceType: "WEBSITE", price: 12, capturedAt: now, isDelivery: false },
      { sourceType: "GOOGLE", price: 12.5, capturedAt: now, isDelivery: false },
      { sourceType: "DELIVERY", price: 14, capturedAt: now, isDelivery: true }
    ]);
    expect(result.estimatedInStorePrice).toBeGreaterThan(12);
    expect(result.confidence).toBeGreaterThan(50);
    expect(result.deliveryMarkupEstimatePct).not.toBeNull();
  });
});
