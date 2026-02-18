import { Queue, Worker } from "bullmq";
import { executeQueryRun } from "@/lib/pipeline/runQuery";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379)
};

export const queryQueue = new Queue("query-runs", { connection });

export function startQueryWorker() {
  return new Worker(
    "query-runs",
    async (job) => {
      await executeQueryRun(job.data.queryRunId as string);
    },
    { connection }
  );
}
