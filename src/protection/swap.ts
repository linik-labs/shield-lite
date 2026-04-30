import { CONFIG } from "../config/user-config";
import { log, logError } from "../logger";
import { getActivePrice } from "../price-sources";
import { isValidPrice } from "../price-sources/pyth";
import { connection, loadWallet } from "../solana";
import { buildSwapTransaction, getQuote } from "../jupiter";

export function calculateChunks(
  totalBaseUnits: number,
  chunkSize: number = CONFIG.chunkSize
): number[] {
  if (!Number.isFinite(totalBaseUnits) || totalBaseUnits <= 0) return [];

  if (!Number.isFinite(chunkSize) || chunkSize <= 0 || chunkSize > 1) {
    throw new Error(
      `Invalid chunkSize: ${chunkSize}. Expected value between 0 and 1 inclusive.`
    );
  }

  const chunks: number[] = [];
  let remaining = totalBaseUnits;
  const baseChunk = Math.floor(totalBaseUnits * chunkSize);

  if (baseChunk <= 0) {
    return [totalBaseUnits];
  }

  while (remaining > 0) {
    const chunk = Math.min(baseChunk, remaining);
    chunks.push(chunk);
    remaining -= chunk;
  }

  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeProtectionSwap(amountBaseUnits: number): Promise<string> {
  const wallet = loadWallet();

  log("SWAP", "preparing protection swap");
  log("SWAP", `amountBaseUnits=${amountBaseUnits}`);
  log("SWAP", `requesting quote | slippageBps=${CONFIG.slippageBps}`);

  const quote = await getQuote(amountBaseUnits, CONFIG.slippageBps);

  log(
    "SWAP",
    `quote received | outAmount=${quote.outAmount} priceImpactPct=${quote.priceImpactPct}`
  );
  log("SWAP", "building swap transaction");

  const tx = await buildSwapTransaction(quote, wallet.publicKey.toBase58());

  tx.sign([wallet]);

  const signature = await connection.sendTransaction(tx);

  log("SWAP", `transaction sent | signature=${signature}`);

  const confirmation = await connection.confirmTransaction(signature, "confirmed");

  if (confirmation.value.err) {
    logError(
      "SWAP",
      `transaction failed | err=${JSON.stringify(confirmation.value.err)}`
    );
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  log("SWAP", "transaction confirmed");

  return signature;
}

// Retries a failed chunk only while protection is still justified.
// After each swap error, price is re-checked before attempting again.
export async function executeChunkWithRetry(amountBaseUnits: number): Promise<{
  success: boolean;
  signature?: string;
  stoppedReason?: string;
}> {
  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      log("SWAP", `chunk attempt=${attempt} | amountBaseUnits=${amountBaseUnits}`);

      const signature = await executeProtectionSwap(amountBaseUnits);

      return {
        success: true,
        signature,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logError("SWAP", `chunk attempt failed | attempt=${attempt} err=${message}`);

      if (message.includes("TOKEN_NOT_TRADABLE")) {
        log("SWAP", "non-tradable token → aborting protection");

        return {
          success: false,
          stoppedReason: "non-tradable-token",
        };
      }

      const price = await getActivePrice();

      if (!isValidPrice(price)) {
        logError("SWAP", "price re-check failed after swap error");
        throw new Error("Invalid price during chunk retry flow");
      }

      log(
        "SWAP",
        `post-error price check | price=${price.toFixed(6)} recoveryTarget=${CONFIG.target}`
      );

      if (price >= CONFIG.target) {
        return {
          success: false,
          stoppedReason: "market-recovered-after-swap-error",
        };
      }

      log("SWAP", "retrying same chunk after error");

      await sleep(1500);
    }
  }
}
