const POSITIVE = ["great", "good", "fresh", "worth", "love", "value"];
const NEGATIVE = ["expensive", "overpriced", "small", "bland", "bad", "slow"];

export function analyzeSentiment(texts: string[]) {
  let positive = 0;
  let negative = 0;
  const aspectCounts = {
    overpriced: 0,
    value: 0,
    portion: 0,
    quality: 0,
    service: 0
  };
  const evidence: string[] = [];

  for (const text of texts) {
    const lower = text.toLowerCase();
    if (POSITIVE.some((w) => lower.includes(w))) positive += 1;
    if (NEGATIVE.some((w) => lower.includes(w))) negative += 1;

    if (lower.includes("overpriced") || lower.includes("expensive")) aspectCounts.overpriced += 1;
    if (lower.includes("value") || lower.includes("worth")) aspectCounts.value += 1;
    if (lower.includes("portion") || lower.includes("small")) aspectCounts.portion += 1;
    if (lower.includes("fresh") || lower.includes("quality")) aspectCounts.quality += 1;
    if (lower.includes("service") || lower.includes("staff")) aspectCounts.service += 1;

    if (aspectCounts.overpriced + aspectCounts.value + aspectCounts.portion + aspectCounts.quality + aspectCounts.service > 0) {
      evidence.push(text.slice(0, 160));
    }
  }

  const total = positive + negative;
  const overall = total ? (positive - negative) / total : 0;
  const valueScore = aspectCounts.value - aspectCounts.overpriced;

  return {
    overallSentiment: Number(overall.toFixed(2)),
    valueScore,
    aspectCounts,
    evidence
  };
}
