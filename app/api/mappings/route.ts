import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  await prisma.workspaceItemMapping.create({
    data: {
      workspaceId: String(form.get("workspaceId")),
      targetItemSignature: String(form.get("targetItemSignature")),
      competitorItemId: String(form.get("competitorItemId")),
      decision: String(form.get("decision"))
    }
  });
  return NextResponse.redirect(new URL("/mappings", request.url));
}
