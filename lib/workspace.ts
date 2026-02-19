import { prisma } from "@/lib/prisma";

export async function ensureWorkspace() {
  const existing = await prisma.workspace.findFirst();
  if (existing) return existing;
  return prisma.workspace.create({ data: { name: "Restaurant Pricing Workspace" } });
}
