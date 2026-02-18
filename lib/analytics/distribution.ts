function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
}

export function computeDistribution(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const median = percentile(sorted, 0.5);
  const q3 = percentile(sorted, 0.75);
  return {
    min: sorted[0] ?? 0,
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1] ?? 0,
    sampleSize: prices.length
  };
}

export function recommendedBand(distribution: { q1: number; median: number; q3: number; min: number; max: number }, intent: "Value" | "Balanced" | "Premium") {
  const p40 = distribution.q1 + (distribution.median - distribution.q1) * 0.6;
  const p60 = distribution.median + (distribution.q3 - distribution.median) * 0.4;
  const p85 = distribution.q3 + (distribution.max - distribution.q3) * 0.4;

  if (intent === "Value") return { low: distribution.q1, high: p40 };
  if (intent === "Balanced") return { low: p40, high: p60 };
  return { low: p60, high: p85 };
}

export function tradeUpDown(current: number, band: { low: number; high: number }) {
  return {
    toLowPct: ((band.low - current) / current) * 100,
    toHighPct: ((band.high - current) / current) * 100
  };
}
