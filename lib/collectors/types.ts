import type { QueryInput, StandardizedCollectorResult } from "@/lib/types";

export type CollectorContext = {
  query: QueryInput;
};

export interface Collector {
  name: string;
  version: string;
  collect(ctx: CollectorContext): Promise<StandardizedCollectorResult>;
}
