import fs from "fs";
import path from "path";

// Local Pyth crypto feed registry snapshot.
// This file is used only for feed metadata validation and human-readable logs.
// Live prices are fetched from Hermes by CONFIG.priceFeedId.
const REGISTRY_FILE = path.join(__dirname, "price_feeds.json");

type HermesFeed = {
  id: string;
  attributes?: {
    asset_type?: string;
    base?: string;
    description?: string;
    display_symbol?: string;
    generic_symbol?: string;
    quote_currency?: string;
    symbol?: string;
  };
};

export type ObservedFeed = {
  symbol: string;
  feedId: string;
};

let registry: HermesFeed[] | null = null;

function normalizeFeedId(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

function isValidPriceFeedId(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

function loadRegistry(): HermesFeed[] {
  if (registry) return registry;

  if (!fs.existsSync(REGISTRY_FILE)) {
    throw new Error(
      `[PYTH_REGISTRY] Local registry file not found: ${REGISTRY_FILE}`
    );
  }

  const raw = fs.readFileSync(REGISTRY_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("[PYTH_REGISTRY] Empty or invalid local registry file");
  }

  registry = data;
  return registry;
}

export async function resolveObservedFeed(
  feedId: string
): Promise<ObservedFeed> {
  if (!isValidPriceFeedId(feedId)) {
    throw new Error(
      `Invalid CONFIG.priceFeedId. Expected a 0x-prefixed 64-byte hex string. Check user-config.ts`
    );
  }

  const feeds = loadRegistry();
  const normalizedTarget = normalizeFeedId(feedId);

  const match = feeds.find((f) => normalizeFeedId(f.id) === normalizedTarget);

  if (!match) {
    throw new Error(
      `Unknown CONFIG.priceFeedId. No matching feed was found in the local Pyth crypto registry snapshot. Check user-config.ts or update the local registry snapshot.`
    );
  }

  const rawSymbol =
    match.attributes?.display_symbol ??
    match.attributes?.symbol ??
    match.attributes?.description ??
    match.id;

  const symbol = rawSymbol.replace(/^Crypto\./, "");

  return {
    symbol,
    feedId: `0x${normalizeFeedId(match.id)}`,
  };
}
