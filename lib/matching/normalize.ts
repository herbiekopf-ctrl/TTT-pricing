const STOPWORDS = new Set(["the", "a", "an", "and", "with", "style", "special"]);

export function normalizeItemName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token))
    .join(" ")
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeItemName(input).split(" ").filter(Boolean);
}

export function buildTargetSignature(targetItem: string, category?: string, variant?: string): string {
  return [normalizeItemName(targetItem), normalizeItemName(category ?? ""), normalizeItemName(variant ?? "")]
    .filter(Boolean)
    .join("|");
}
