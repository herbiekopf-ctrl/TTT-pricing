import { randomUUID } from "node:crypto";

type Row = Record<string, any>;

const db = {
  workspace: [] as Row[],
  store: [] as Row[],
  queryRun: [] as Row[],
  competitorRestaurant: [] as Row[],
  competitorItem: [] as Row[],
  rawPayload: [] as Row[],
  priceObservation: [] as Row[],
  reviewObservation: [] as Row[],
  itemMatch: [] as Row[],
  priceEstimate: [] as Row[],
  sentimentMetric: [] as Row[],
  landscapeMetric: [] as Row[],
  workspaceItemMapping: [] as Row[]
};

function now() {
  return new Date();
}

function id() {
  return randomUUID();
}

function withTimestamps(data: Row) {
  return { id: data.id ?? id(), createdAt: data.createdAt ?? now(), updatedAt: now(), ...data };
}

function model(table: keyof typeof db) {
  const rows = db[table];

  return {
    async create({ data }: { data: Row }) {
      const record = withTimestamps(data);
      rows.push(record);
      return record;
    },
    async findFirst(args?: { where?: Row }) {
      if (!args?.where) return rows[0] ?? null;
      return rows.find((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v)) ?? null;
    },
    async findFirstOrThrow(args?: { where?: Row }) {
      const found = await this.findFirst(args);
      if (!found) throw new Error(`${String(table)} not found`);
      return found;
    },
    async findUniqueOrThrow({ where }: { where: Row }) {
      const found = rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      if (!found) throw new Error(`${String(table)} not found`);
      return found;
    },
    async findUnique({ where }: { where: Row }) {
      return rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null;
    },
    async findMany(args?: { where?: Row; orderBy?: Row; take?: number; include?: Row }) {
      let result = [...rows];
      if (args?.where) {
        result = result.filter((r) => Object.entries(args.where ?? {}).every(([k, v]) => r[k] === v));
      }
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0];
        result.sort((a, b) => (dir === "desc" ? (a[field] < b[field] ? 1 : -1) : a[field] > b[field] ? 1 : -1));
      }
      if (typeof args?.take === "number") result = result.slice(0, args.take);
      if (!args?.include) return result;

      return result.map((row) => hydrate(table, row, args.include!));
    },
    async update({ where, data }: { where: Row; data: Row }) {
      const index = rows.findIndex((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      if (index < 0) throw new Error(`${String(table)} not found`);
      rows[index] = { ...rows[index], ...data, updatedAt: now() };
      return rows[index];
    },
    async upsert({ where, create, update }: { where: Row; create: Row; update: Row }) {
      let found: Row | undefined;
      if (where.name_address) {
        found = rows.find((r) => r.name === where.name_address.name && r.address === where.name_address.address);
      } else {
        found = rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      }
      if (!found) {
        const record = withTimestamps(create);
        rows.push(record);
        return record;
      }
      Object.assign(found, update, { updatedAt: now() });
      return found;
    }
  };
}

function hydrate(table: keyof typeof db, row: Row, include: Row) {
  const base = { ...row };
  if (table === "queryRun" && include.store) {
    base.store = db.store.find((s) => s.id === row.storeId);
  }
  if (table === "itemMatch" && include.competitorItem) {
    const item = db.competitorItem.find((i) => i.id === row.competitorItemId);
    if (item) {
      const competitorInclude = include.competitorItem.include ?? {};
      base.competitorItem = { ...item };
      if (competitorInclude.restaurant) {
        base.competitorItem.restaurant = db.competitorRestaurant.find((r) => r.id === item.restaurantId);
      }
      if (competitorInclude.priceObservations) {
        base.competitorItem.priceObservations = db.priceObservation.filter((p) => p.itemId === item.id);
      }
      if (competitorInclude.estimates) {
        const where = competitorInclude.estimates.where ?? {};
        base.competitorItem.estimates = db.priceEstimate.filter((p) => p.competitorItemId === item.id && Object.entries(where).every(([k, v]) => p[k] === v));
      }
    }
  }
  if (table === "sentimentMetric" && include.restaurant) {
    base.restaurant = db.competitorRestaurant.find((r) => r.id === row.restaurantId);
  }
  if (table === "competitorRestaurant" && include.reviews) {
    base.reviews = db.reviewObservation.filter((r) => r.restaurantId === row.id);
  }
  return base;
}

export function createFallbackPrisma() {
  return {
    workspace: model("workspace"),
    store: model("store"),
    queryRun: model("queryRun"),
    competitorRestaurant: model("competitorRestaurant"),
    competitorItem: model("competitorItem"),
    rawPayload: model("rawPayload"),
    priceObservation: model("priceObservation"),
    reviewObservation: model("reviewObservation"),
    itemMatch: model("itemMatch"),
    priceEstimate: model("priceEstimate"),
    sentimentMetric: model("sentimentMetric"),
    landscapeMetric: model("landscapeMetric"),
    workspaceItemMapping: model("workspaceItemMapping"),
    async $disconnect() {}
  };
}
