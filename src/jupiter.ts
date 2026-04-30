import "dotenv/config";
import fetch from "node-fetch";
import { VersionedTransaction } from "@solana/web3.js";
import { CONFIG } from "./config/user-config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in .env`);
  return v;
}

const JUP_BASE = "https://api.jup.ag";
const API_KEY = requireEnv("JUPITER_API_KEY");

export type QuoteResponse = {
  outAmount: string;
  priceImpactPct: string;
  routePlan?: unknown[];
  [k: string]: unknown;
};

export async function getQuote(
  amountBaseUnits: number,
  slippageBps: number
): Promise<QuoteResponse> {
  const url =
    `${JUP_BASE}/swap/v1/quote` +
    `?inputMint=${CONFIG.inputMint}` +
    `&outputMint=${CONFIG.outputMint}` +
    `&amount=${amountBaseUnits}` +
    `&slippageBps=${slippageBps}` +
    `&onlyDirectRoutes=false`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": API_KEY,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter quote failed: ${res.status} ${res.statusText} ${text}`);
  }

  return JSON.parse(text) as QuoteResponse;
}

export async function buildSwapTransaction(
  quote: QuoteResponse,
  userPublicKey: string
): Promise<VersionedTransaction> {
  const url = `${JUP_BASE}/swap/v1/swap`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jupiter swap build failed: ${res.status} ${res.statusText} ${text}`);
  }

  const swapData = JSON.parse(text) as { swapTransaction: string };

  const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
  return VersionedTransaction.deserialize(txBuffer);
}
