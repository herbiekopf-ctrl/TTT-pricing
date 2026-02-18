import { buildTargetSignature, normalizeItemName, tokenize } from "./normalize";

export type Candidate = {
  id: string;
  normalizedName: string;
  category?: string | null;
  variant?: string | null;
};

export type MatchResult = {
  competitorItemId: string;
  targetItemSignature: string;
  matchScore: number;
  matchMethod: string;
};

function jaccard(a: string[], b: string[]): number {
  const as = new Set(a);
  const bs = new Set(b);
  const inter = [...as].filter((t) => bs.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export function matchItems(target: { item: string; category?: string; variant?: string }, candidates: Candidate[]): MatchResult[] {
  const signature = buildTargetSignature(target.item, target.category, target.variant);
  const targetTokens = tokenize(target.item);

  return candidates
    .map((candidate) => {
      const keywordBoost = candidate.normalizedName.includes(normalizeItemName(target.item)) ? 0.2 : 0;
      const categoryBoost = target.category && candidate.category?.toLowerCase() === target.category.toLowerCase() ? 0.1 : 0;
      const similarity = jaccard(targetTokens, tokenize(candidate.normalizedName));
      const score = Math.min(1, similarity + keywordBoost + categoryBoost);

      return {
        competitorItemId: candidate.id,
        targetItemSignature: signature,
        matchScore: score,
        matchMethod: "keyword+jaccard"
      };
    })
    .filter((m) => m.matchScore >= 0.25)
    .sort((a, b) => b.matchScore - a.matchScore);
}
