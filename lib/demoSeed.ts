import { prisma } from "@/lib/prisma";

export async function ensureDemoWorkspace() {
  let workspace = await prisma.workspace.findFirst();
  if (workspace) return workspace;

  workspace = await prisma.workspace.create({ data: { name: "Demo Workspace" } });
  await prisma.store.create({
    data: {
      workspaceId: workspace.id,
      name: "Demo Store",
      address: "1 Market St, San Francisco, CA",
      lat: 37.7936,
      lng: -122.395,
      timezone: "America/Los_Angeles",
      cuisineTags: ["italian", "casual"]
    }
  });
  return workspace;
}
