
import { prisma } from "@/lib/prisma";
import type { QueryInput } from "@/lib/types";
import { collectors } from "@/lib/collectors";
import { matchItems } from "@/lib/matching/matcher";
import { buildTargetSignature } from "@/lib/matching/normalize";
import { computePriceEstimate } from "@/lib/analytics/confidence";
import { analyzeSentiment } from "@/lib/analytics/sentiment";
import { computeDistribution, recommendedBand, tradeUpDown } from "@/lib/analytics/distribution";

export async function createQueryRun(input: QueryInput) {
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
  await prisma.queryRun.update({ where: { id: queryRunId }, data: { status: "RUNNING" } });

  try {
    const collected = await Promise.all(collectors.map((c) => c.collect({ query: {
      workspaceId: queryRun.workspaceId,
      storeId: queryRun.storeId,
      targetItem: queryRun.targetItem,
      targetCategory: queryRun.targetCategory ?? undefined,
      targetVariant: queryRun.targetVariant ?? undefined,
      radiusKm: queryRun.radiusKm,
      filters: queryRun.filtersJson as QueryInput["filters"],
      positioningIntent: queryRun.positioningIntent as QueryInput["positioningIntent"],
      storeCurrentPrice: queryRun.storeCurrentPrice ? Number(queryRun.storeCurrentPrice) : undefined
    } } )));

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

      const restaurantIds = new Map<string, string>();
      for (const r of result.restaurants) {
        const db = await prisma.competitorRestaurant.upsert({
          where: { name_address: { name: r.name, address: r.address } },
          update: { lat: r.lat, lng: r.lng, googlePlaceId: r.googlePlaceId, yelpId: r.yelpId, websiteDomain: r.websiteDomain },
          create: { name: r.name, address: r.address, lat: r.lat, lng: r.lng, googlePlaceId: r.googlePlaceId, yelpId: r.yelpId, websiteDomain: r.websiteDomain }
        });
        restaurantIds.set(`${r.name}|${r.address}`, db.id);
      }

      const itemIds = new Map<string, string>();
      for (const item of result.menuItems) {
        const restaurantId = restaurantIds.get(item.restaurantKey);
        if (!restaurantId) continue;
        const dbItem = await prisma.competitorItem.create({
          data: { restaurantId, normalizedName: item.normalizedName, category: item.category, variant: item.variant }
        });
        itemIds.set(`${item.restaurantKey}|${item.normalizedName}`, dbItem.id);
      }

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
            rawPayloadRefId: rawMap.get("demo-snapshot")
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
            rawPayloadRefId: rawMap.get("demo-snapshot")
          }
        });
      }

      const candidateItems = await prisma.competitorItem.findMany({ include: { priceObservations: true, restaurant: true } });
      const matches = matchItems(
        { item: queryRun.targetItem, category: queryRun.targetCategory ?? undefined, variant: queryRun.targetVariant ?? undefined },
        candidateItems.map((i: any) => ({ id: i.id, normalizedName: i.normalizedName, category: i.category, variant: i.variant }))
      );

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

        const item = candidateItems.find((x: any) => x.id === match.competitorItemId);
        if (!item || item.priceObservations.length === 0) continue;
        const estimate = computePriceEstimate(item.priceObservations.map((po: any) => ({
          sourceType: po.sourceType,
          price: Number(po.observedPrice),
          capturedAt: po.capturedAt,
          isDelivery: po.isDeliveryPrice
        })));

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

      const restaurants = await prisma.competitorRestaurant.findMany({
        include: { reviews: true }
      });
      for (const restaurant of restaurants) {
        const sentiment = analyzeSentiment(restaurant.reviews.map((r: any) => r.text));
        await prisma.sentimentMetric.create({
          data: {
            queryRunId,
            restaurantId: restaurant.id,
            overallSentiment: sentiment.overallSentiment,
            valueScore: sentiment.valueScore,
            aspectCountsJson: sentiment.aspectCounts as any,
            evidenceSnippetIds: sentiment.evidence.slice(0, 3)
          }
        });
      }

      const estimates = await prisma.priceEstimate.findMany({ where: { queryRunId } });
      const prices = estimates.map((e: any) => Number(e.estimatedInStorePrice));
      const dist = computeDistribution(prices);
      const band = recommendedBand(dist, queryRun.positioningIntent as QueryInput["positioningIntent"]);
      const trade = queryRun.storeCurrentPrice ? tradeUpDown(Number(queryRun.storeCurrentPrice), band) : null;

      const conclusions = {
        message: `Within ${queryRun.radiusKm}km, matched ${prices.length} competitors. ${queryRun.positioningIntent} intent suggests ${band.low.toFixed(2)}-${band.high.toFixed(2)} range.`,
        anchor: `Store radius around selected location with filters ${JSON.stringify(queryRun.filtersJson)}`,
        trade
      };

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
          valueMapPointsJson: estimates.map((e: any) => ({ competitorItemId: e.competitorItemId, price: Number(e.estimatedInStorePrice), confidence: e.confidence0to100 })) as any,
          conclusionsJson: conclusions as any
        }
      });
    }

    await prisma.queryRun.update({ where: { id: queryRunId }, data: { status: "COMPLETED", completedAt: new Date() } });
  } catch (error) {
    await prisma.queryRun.update({ where: { id: queryRunId }, data: { status: "FAILED", errorMessage: (error as Error).message } });
    throw error;
  }
}
