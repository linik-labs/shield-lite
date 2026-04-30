import axios from "axios";
import { CONFIG } from "../config/user-config";

type HermesPriceUpdate = {
  parsed: Array<{
    id: string;
    price: {
      price: string;
      expo: number;
      conf: string;
      publish_time: number;
    };
  }>;
};

const HERMES_BASE =
  process.env.HERMES_URL ?? "https://hermes.pyth.network";

// Converts integer price + exponent to float value.
function toNumber(price: string, expo: number): number {
  const p = Number(price);
  if (!Number.isFinite(p)) return NaN;
  return p * Math.pow(10, expo);
}

// Fetches latest price from Pyth Hermes API.
export async function getPrice(): Promise<number> {
  const priceFeedId = CONFIG.priceFeedId;

  if (!priceFeedId || !priceFeedId.startsWith("0x")) {
    throw new Error(
      `CONFIG.priceFeedId must be a hex string starting with 0x. Got: ${priceFeedId}`
    );
  }

  const url = `${HERMES_BASE}/v2/updates/price/latest`;

  const resp = await axios.get<HermesPriceUpdate>(url, {
    params: { "ids[]": priceFeedId },
    timeout: 30_000,
  });

  if (resp.status !== 200) {
    throw new Error(`[HERMES] HTTP error: ${resp.status}`);
  }

  const item = resp.data?.parsed?.[0];
  if (!item?.price) {
    throw new Error("No price data from Hermes");
  }

  const value = toNumber(item.price.price, item.price.expo);

  if (!isValidPrice(value)) {
    throw new Error(`[HERMES] Invalid price value: ${value}`);
  }

  return value;
}

// Basic sanity check for price values.
export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isFinite(price);
}
