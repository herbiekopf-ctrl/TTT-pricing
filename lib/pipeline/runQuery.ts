import { prisma } from "@/lib/prisma";
import type { QueryInput } from "@/lib/types";
import { collectors } from "@/lib/collectors";
import { matchItems } from "@/lib/matching/matcher";
import { buildTargetSignature } from "@/lib/matching/normalize";
import { computePriceEstimate } from "@/lib/analytics/confidence";
import { analyzeSentiment } from "@/lib/analytics/sentiment";
import { computeDistribution, recommendedBand, tradeUpDown } from "@/lib/analytics/distribution";

function toFilterSummary(filters: QueryInput["filters"]) {
  return {
    cuisine: filters.cuisine?.length ? filters.cuisine : ["all"],
    minRating: filters.minRating ?? 0,
    excludeChains: Boolean(filters.excludeChains),
    includeDeliveryPrices: Boolean(filters.includeDeliveryPrices),
    serviceStyle: filters.serviceStyle ?? "any"
  };
}

function buildConclusions(args: {
  queryRun: any;
  prices: number[];
  band: { low: number; high: number };
  dist: ReturnType<typeof computeDistribution>;
  trade: ReturnType<typeof tradeUpDown> | null;
  avgConfidence: number;
}) {
  const { queryRun, prices, band, dist, trade, avgConfidence } = args;
  const sample = prices.length;
  const marketPosition =
    queryRun.storeCurrentPrice == null
      ? "No current store price provided."
      : Number(queryRun.storeCurrentPrice) < dist.q1
        ? "Your current price is below most of the market."
        : Number(queryRun.storeCurrentPrice) > dist.q3
          ? "Your current price is above most of the market."
          : "Your current price sits within the core market range.";

  const recommendation =
    sample === 0
      ? "No matched competitor prices found. Try widening radius or relaxing filters."
      : `For a ${queryRun.positioningIntent.toLowerCase()} strategy, target ${band.low.toFixed(2)} to ${band.high.toFixed(2)}.`;

  return {
    headline: `Analyzed ${sample} matched offers within ${queryRun.radiusKm}km.`,
    recommendation,
    marketPosition,
    confidenceComment:
      avgConfidence >= 75
        ? "High confidence dataset (multi-source agreement and recency are strong)."
        : avgConfidence >= 55
          ? "Moderate confidence dataset. Validate a few competitors manually before changing price."
          : "Low confidence dataset. Collect additional non-delivery sources before changing price.",
    filterSummary: toFilterSummary(queryRun.filtersJson as QueryInput["filters"]),
    tradeGuidance: trade
      ? {
          moveToLowPct: Number(trade.toLowPct.toFixed(1)),
          moveToHighPct: Number(trade.toHighPct.toFixed(1))
        }
      : null
  };
}

export async function createQueryRun(input: QueryInput) {
  if (!input.storeId) {
    throw new Error("storeId is required");
  }

  const collectorVersions = Object.fromEntries(collectors.map((c) => [c.name, c.version]));
  return prisma.queryRun.create({
    data: {
      workspaceId: input.workspaceId,
      storeId: input.storeId,
      targetItem: input.targetItem,
      targetCategory: input.targetCategory,
      targetVariant: input.targetVariant,
      targetItemSignature: buildTargetSignature(input.targetItem, input.targetCategory, input.targetVariant),
      radiusKm: input.radiusKm,
      filtersJson: input.filters as any,
      positioningIntent: input.positioningIntent,
      storeCurrentPrice: input.storeCurrentPrice,
      collectorVersions: collectorVersions as any,
      status: "PENDING"
    }
  });
}

export async function executeQueryRun(queryRunId: string) {
  const queryRun = await prisma.queryRun.findUniqueOrThrow({ where: { id: queryRunId } });
  const store = await prisma.store.findUniqueOrThrow({ where: { id: queryRun.storeId } });
  await prisma.queryRun.update({ where: { id: queryRunId }, data: { status: "RUNNING" } });

  try {
    if (collectors.length === 0) {
      throw new Error("No live collectors enabled. Configure YELP_API_KEY and ENABLE_YELP=true.");
    }
    const collected = await Promise.all(
      collectors.map((collector) =>
        collector.collect({
          query: {
            workspaceId: queryRun.workspaceId,
            storeId: queryRun.storeId,
            targetItem: queryRun.targetItem,
            targetCategory: queryRun.targetCategory ?? undefined,
            targetVariant: queryRun.targetVariant ?? undefined,
            radiusKm: queryRun.radiusKm,
            filters: queryRun.filtersJson as QueryInput["filters"],
            positioningIntent: queryRun.positioningIntent as QueryInput["positioningIntent"],
            storeCurrentPrice: queryRun.storeCurrentPrice ? Number(queryRun.storeCurrentPrice) : undefined,
            storeLat: Number(store.lat ?? 0),
            storeLng: Number(store.lng ?? 0)
          }
        })
      )
    );

    const restaurantIds = new Map<string, string>();
    const itemIds = new Map<string, string>();

    for (const result of collected) {
      const rawMap = new Map<string, string>();
      for (const raw of result.rawPayloadRefs) {
        const created = await prisma.rawPayload.create({
          data: {
            sourceType: raw.sourceType,
            capturedAt: raw.capturedAt,
            contentType: raw.contentType,
            storageRef: raw.storageRef,
            hash: raw.hash,
            metadataJson: raw.metadata as any
          }
        });
        rawMap.set(raw.key, created.id);
      }

      for (const r of result.restaurants) {
        const dbRestaurant = await prisma.competitorRestaurant.upsert({
          where: { name_address: { name: r.name, address: r.address } },
          update: {
            lat: r.lat,
            lng: r.lng,
            googlePlaceId: r.googlePlaceId,
            yelpId: r.yelpId,
            websiteDomain: r.websiteDomain
          },
          create: {
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            googlePlaceId: r.googlePlaceId,
            yelpId: r.yelpId,
            websiteDomain: r.websiteDomain
          }
        });
        restaurantIds.set(`${r.name}|${r.address}`, dbRestaurant.id);
      }

      for (const item of result.menuItems) {
        const restaurantId = restaurantIds.get(item.restaurantKey);
        if (!restaurantId) continue;

        const existing = await prisma.competitorItem.findFirst({
          where: {
            restaurantId,
            normalizedName: item.normalizedName,
            category: item.category,
            variant: item.variant
          }
        });

        const dbItem =
          existing ??
          (await prisma.competitorItem.create({
            data: {
              restaurantId,
              normalizedName: item.normalizedName,
              category: item.category,
              variant: item.variant
            }
          }));

        itemIds.set(`${item.restaurantKey}|${item.normalizedName}`, dbItem.id);
      }

      const rawRefId = rawMap.values().next().value;
      for (const p of result.priceObservations) {
        const itemId = itemIds.get(`${p.restaurantKey}|${p.normalizedName}`);
        if (!itemId) continue;

        await prisma.priceObservation.create({
          data: {
            itemId,
            sourceType: p.sourceType,
            sourceUrl: p.sourceUrl,
            capturedAt: p.capturedAt,
            observedPrice: p.observedPrice,
            currency: p.currency,
            isDeliveryPrice: p.isDeliveryPrice,
            deliveryPlatformName: p.deliveryPlatformName,
            rawPayloadRefId: rawRefId
          }
        });
      }

      for (const rev of result.reviews) {
        const restaurantId = restaurantIds.get(rev.restaurantKey);
        if (!restaurantId) continue;
        await prisma.reviewObservation.create({
          data: {
            restaurantId,
            sourceType: rev.sourceType,
            capturedAt: rev.capturedAt,
            rating: rev.rating,
            text: rev.text,
            rawPayloadRefId: rawRefId
          }
        });
      }
    }

    const scopedItems = await prisma.competitorItem.findMany({
      include: { priceObservations: true, restaurant: true }
    });

    const matches = matchItems(
      {
        item: queryRun.targetItem,
        category: queryRun.targetCategory ?? undefined,
        variant: queryRun.targetVariant ?? undefined
      },
      scopedItems.map((item: any) => ({
        id: item.id,
        normalizedName: item.normalizedName,
        category: item.category,
        variant: item.variant
      }))
    );

    const matchedRestaurantIds = new Set<string>();

    for (const match of matches) {
      await prisma.itemMatch.create({
        data: {
          queryRunId,
          competitorItemId: match.competitorItemId,
          targetItemSignature: match.targetItemSignature,
          matchScore: match.matchScore,
          matchMethod: match.matchMethod
        }
      });

      const item = scopedItems.find((candidate: any) => candidate.id === match.competitorItemId);
      if (!item || item.priceObservations.length === 0) continue;
      matchedRestaurantIds.add(item.restaurantId);

      const estimate = computePriceEstimate(
        item.priceObservations.map((priceObservation: any) => ({
          sourceType: priceObservation.sourceType,
          price: Number(priceObservation.observedPrice),
          capturedAt: priceObservation.capturedAt,
          isDelivery: priceObservation.isDeliveryPrice
        }))
      );

      await prisma.priceEstimate.create({
        data: {
          queryRunId,
          competitorItemId: item.id,
          estimatedInStorePrice: estimate.estimatedInStorePrice,
          confidence0to100: estimate.confidence,
          confidenceFactorsJson: estimate.confidenceFactors as any,
          deliveryMarkupEstimatePct: estimate.deliveryMarkupEstimatePct,
          explanation: estimate.explanation
        }
      });
    }

    for (const restaurantId of matchedRestaurantIds) {
      const reviews = await prisma.reviewObservation.findMany({ where: { restaurantId } });
      const sentiment = analyzeSentiment(reviews.map((review: any) => review.text));
      await prisma.sentimentMetric.create({
        data: {
          queryRunId,
          restaurantId,
          overallSentiment: sentiment.overallSentiment,
          valueScore: sentiment.valueScore,
          aspectCountsJson: sentiment.aspectCounts as any,
          evidenceSnippetIds: sentiment.evidence.slice(0, 3)
        }
      });
    }

    const estimates = await prisma.priceEstimate.findMany({ where: { queryRunId } });
    const prices = estimates.map((estimate: any) => Number(estimate.estimatedInStorePrice));
    const dist = computeDistribution(prices);
    const band = recommendedBand(dist, queryRun.positioningIntent as QueryInput["positioningIntent"]);
    const trade = queryRun.storeCurrentPrice ? tradeUpDown(Number(queryRun.storeCurrentPrice), band) : null;
    const avgConfidence =
      estimates.length > 0
        ? estimates.reduce((sum: number, estimate: any) => sum + estimate.confidence0to100, 0) / estimates.length
        : 0;

    const conclusions = buildConclusions({ queryRun, prices, band, dist, trade, avgConfidence });

    await prisma.landscapeMetric.create({
      data: {
        queryRunId,
        targetItemSignature: queryRun.targetItemSignature,
        distributionStatsJson: dist as any,
        marketBandsJson: {
          below: { max: dist.q1 },
          core: { min: dist.q1, max: dist.q3 },
          above: { min: dist.q3 },
          recommended: band
        } as any,
        valueMapPointsJson: estimates.map((estimate: any) => ({
          competitorItemId: estimate.competitorItemId,
          price: Number(estimate.estimatedInStorePrice),
          confidence: estimate.confidence0to100
        })) as any,
        conclusionsJson: conclusions as any
      }
    });

    await prisma.queryRun.update({ where: { id: queryRunId }, data: { status: "COMPLETED", completedAt: new Date() } });
  } catch (error) {
    await prisma.queryRun.update({
      where: { id: queryRunId },
      data: { status: "FAILED", errorMessage: (error as Error).message }
    });
    throw error;
  }
}
