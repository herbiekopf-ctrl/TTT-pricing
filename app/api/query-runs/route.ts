import { NextRequest, NextResponse } from "next/server";
import { createQueryRun, executeQueryRun } from "@/lib/pipeline/runQuery";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/workspace";

function parseNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const workspace = await ensureWorkspace();

  if (!(process.env.ENABLE_YELP === "true" && process.env.YELP_API_KEY)) {
    return NextResponse.json(
      { error: "Live data is not configured. Set YELP_API_KEY and ENABLE_YELP=true." },
      { status: 400 }
    );
  }

  let storeId = String(form.get("storeId") || "");
  const storeName = String(form.get("storeName") || "My Restaurant");
  const storeAddress = String(form.get("storeAddress") || "Unknown");
  const storeLat = parseNumber(form.get("storeLat"), 37.7749);
  const storeLng = parseNumber(form.get("storeLng"), -122.4194);
  const storeTimezone = String(form.get("storeTimezone") || "America/Los_Angeles");
  const storeCuisineTags = String(form.get("storeCuisineTags") || "").split(",").map((c) => c.trim()).filter(Boolean);

  if (!storeId) {
    const createdStore = await prisma.store.create({
      data: {
        workspaceId: workspace.id,
        name: storeName,
        address: storeAddress,
        lat: storeLat,
        lng: storeLng,
        timezone: storeTimezone,
        cuisineTags: storeCuisineTags
      }
    });
    storeId = createdStore.id;
  }

  const cuisine = String(form.get("cuisine") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const queryRun = await createQueryRun({
    workspaceId: workspace.id,
    storeId,
    storeName,
    storeAddress,
    storeLat,
    storeLng,
    storeTimezone,
    targetItem: String(form.get("targetItem") || ""),
    targetCategory: String(form.get("targetCategory") || ""),
    targetVariant: String(form.get("targetVariant") || ""),
    radiusKm: parseNumber(form.get("radiusKm"), 5),
    filters: {
      cuisine,
      minRating: parseNumber(form.get("minRating"), 0),
      serviceStyle: String(form.get("serviceStyle") || ""),
      includeDeliveryPrices: form.get("includeDeliveryPrices") === "on",
      excludeChains: form.get("excludeChains") === "on"
    },
    positioningIntent: String(form.get("positioningIntent") || "Balanced") as "Value" | "Balanced" | "Premium",
    storeCurrentPrice: form.get("storeCurrentPrice") ? Number(form.get("storeCurrentPrice")) : undefined
  });

  await executeQueryRun(queryRun.id);
  return NextResponse.redirect(new URL(`/query/${queryRun.id}`, request.url));
}
