import { NextRequest, NextResponse } from "next/server";
import { createQueryRun, executeQueryRun } from "@/lib/pipeline/runQuery";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const queryRun = await createQueryRun({
    workspaceId: String(form.get("workspaceId")),
    storeId: String(form.get("storeId")),
    targetItem: String(form.get("targetItem")),
    targetCategory: String(form.get("targetCategory") || ""),
    targetVariant: String(form.get("targetVariant") || ""),
    radiusKm: Number(form.get("radiusKm") || 5),
    filters: {
      minRating: Number(form.get("minRating") || 0),
      includeDeliveryPrices: form.get("includeDeliveryPrices") === "on",
      excludeChains: form.get("excludeChains") === "on"
    },
    positioningIntent: String(form.get("positioningIntent") || "Balanced") as "Value" | "Balanced" | "Premium",
    storeCurrentPrice: form.get("storeCurrentPrice") ? Number(form.get("storeCurrentPrice")) : undefined
  });

  await executeQueryRun(queryRun.id);
  return NextResponse.redirect(new URL(`/query/${queryRun.id}`, request.url));
}
