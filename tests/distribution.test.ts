import { describe, expect, it } from "vitest";
import { computeDistribution, recommendedBand, tradeUpDown } from "@/lib/analytics/distribution";

describe("distribution and positioning", () => {
  const dist = computeDistribution([10, 11, 12, 13, 14, 15]);

  it("computes quartiles", () => {
    expect(dist.sampleSize).toBe(6);
    expect(dist.median).toBe(12.5);
  });

  it("returns band by intent", () => {
    const value = recommendedBand(dist, "Value");
    const premium = recommendedBand(dist, "Premium");
    expect(value.low).toBeLessThan(premium.low);
  });

  it("computes trade metrics", () => {
    const trade = tradeUpDown(12, { low: 11, high: 13 });
    expect(trade.toLowPct).toBeLessThan(0);
    expect(trade.toHighPct).toBeGreaterThan(0);
  });
});
