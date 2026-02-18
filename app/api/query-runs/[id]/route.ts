import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const run = await prisma.queryRun.findUnique({
    where: { id: params.id },
    include: {
      itemMatches: true,
      priceEstimates: true,
      sentimentMetrics: true,
      landscapeMetrics: true
    }
  });
  return NextResponse.json(run);
}
