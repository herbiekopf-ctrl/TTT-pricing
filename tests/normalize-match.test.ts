import { describe, expect, it } from "vitest";
import { normalizeItemName, buildTargetSignature } from "@/lib/matching/normalize";
import { matchItems } from "@/lib/matching/matcher";

describe("normalize + matching", () => {
  it("normalizes item names", () => {
    expect(normalizeItemName("The Margherita Pizza (Special)! ")).toBe("margherita pizza");
    expect(buildTargetSignature("Margherita Pizza", "Pizza", "12 Inch")).toBe("margherita pizza|pizza|12 inch");
  });

  it("returns ranked matches", () => {
    const matches = matchItems(
      { item: "margherita pizza", category: "pizza" },
      [
        { id: "1", normalizedName: "margherita pizza", category: "pizza" },
        { id: "2", normalizedName: "pepperoni pizza", category: "pizza" },
        { id: "3", normalizedName: "caesar salad", category: "salad" }
      ]
    );
    expect(matches[0].competitorItemId).toBe("1");
    expect(matches.length).toBeGreaterThan(1);
  });
});
