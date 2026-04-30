import { CONFIG } from "../config/user-config";
import { getPrice as getPythPrice } from "./pyth";
import { getMockPrice } from "./mock";

// Returns the active price based on configured source.
export async function getActivePrice(): Promise<number> {
  if (CONFIG.priceSource === "mock") {
    return getMockPrice();
  }

  return getPythPrice();
}
