import { NextResponse } from "next/server";
import { executeQueryRun } from "@/lib/pipeline/runQuery";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await executeQueryRun(params.id);
  return NextResponse.json({ ok: true });
}
