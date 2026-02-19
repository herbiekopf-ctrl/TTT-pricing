export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export default async function MappingsPage() {
  const mappings = await prisma.workspaceItemMapping.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <h1>Mappings</h1>
      <form action="/api/mappings" method="post">
        <input name="workspaceId" placeholder="workspace id" required />
        <input name="targetItemSignature" placeholder="target signature" required />
        <input name="competitorItemId" placeholder="competitor item id" required />
        <select name="decision"><option>confirmed</option><option>denied</option></select>
        <button type="submit">Save mapping</button>
      </form>
      {mappings.map((m: any) => (<div className="card" key={m.id}>{m.targetItemSignature} → {m.competitorItemId} ({m.decision})</div>))}
    </div>
  );
}
