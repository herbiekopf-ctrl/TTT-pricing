import type { Collector } from "./types";
import { yelpCollector } from "./yelpCollector";

const enabledCollectors: Collector[] = [];

if (process.env.ENABLE_YELP === "true" && process.env.YELP_API_KEY) {
  enabledCollectors.push(yelpCollector);
}

export const collectors: Collector[] = enabledCollectors;
