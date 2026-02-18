import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureDemoWorkspace } from "@/lib/demoSeed";

export default async function DashboardPage() {
  await ensureDemoWorkspace();
  const runs = await prisma.queryRun.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { store: true } });

  return (
    <div>
      <h1>Dashboard</h1>
      <Link href="/query/new">Run new analysis</Link>
      {runs.map((run: any) => (
        <div className="card" key={run.id}>
          <div><b>{run.targetItem}</b> · {run.status}</div>
          <div>{run.store.name} · radius {run.radiusKm}km · {new Date(run.createdAt).toLocaleString()}</div>
          <Link href={`/query/${run.id}`}>Open results</Link>
        </div>
      ))}
    </div>
  );
}
