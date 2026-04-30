import { CONFIG } from "../config/user-config";
import { getActivePrice } from "../price-sources";
import { isValidPrice } from "../price-sources/pyth";
import { connection, loadWallet } from "../solana";
import { checkDrawdown, type DrawdownStatus } from "./trigger";
import { calculateChunks, executeChunkWithRetry, sleep } from "./swap";
import { getTokenBalance } from "../solana";
import { resolveTokenLabel } from "../token-info/resolver";
import { log, logError } from "../logger";
import { getResourceState } from "../resource-monitor";
import { requireBooleanEnv } from "../env";

let lastProtectionTime = 0;

// Process-level flags used to keep watcher logs readable.
let hasLoggedSystemInfo = false;
let lastLoggedStatus: DrawdownStatus | null = null;
let lastTriggerActiveSeconds: number | null = null;
let wasCooldownActive = false;
let lastBlockedProtectionKey: string | null = null;

function formatPrice(price: number): string {
  return price.toFixed(6);
}

function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(6);
}

function getCooldownRemainingSeconds(now: number): number {
  const remainingMs = CONFIG.cooldownSeconds * 1000 - (now - lastProtectionTime);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// Logs only meaningful market state transitions instead of repeating the same
// status every cycle. Also tracks trigger timer resets for observability.
function logStatusTransition(
  status: DrawdownStatus,
  price: number,
  triggerActiveSeconds: number | null
): void {
  // Trigger ended before drawdown confirmation.
  if (
    lastLoggedStatus === "trigger" &&
    (status === "warning" || status === "ok") &&
    lastTriggerActiveSeconds !== null
  ) {
    log(
      "MARKET",
      `trigger reset | price=${formatPrice(price)} active=${lastTriggerActiveSeconds}s`
    );
  }

  if (status === lastLoggedStatus) {
    if (status === "trigger") {
      lastTriggerActiveSeconds = triggerActiveSeconds;
    } else if (status !== "drawdown") {
      lastTriggerActiveSeconds = null;
    }
    return;
  }

  switch (status) {
    case "ok":
      if (lastLoggedStatus !== null) {
        log(
          "MARKET",
          `recovered to normal zone | price=${formatPrice(price)} status=ok`
        );
      } else {
        log("MARKET", `price=${formatPrice(price)} status=ok`);
      }
      break;

    case "warning":
      log(
        "MARKET",
        `entered warning zone | price=${formatPrice(price)} status=warning`
      );
      break;

    case "trigger":
      log(
        "MARKET",
        `trigger timer started | price=${formatPrice(price)} confirmAt=${CONFIG.confirmationSeconds}s`
      );
      break;

    case "drawdown":
      log(
        "MARKET",
        `drawdown confirmed | price=${formatPrice(price)} trigger active ${triggerActiveSeconds ?? CONFIG.confirmationSeconds}s / ${CONFIG.confirmationSeconds}s`
      );
      break;

    case "critical":
      log(
        "MARKET",
        `critical threshold breached | price=${formatPrice(price)} status=critical`
      );
      break;
  }

  if (status === "trigger") {
    lastTriggerActiveSeconds = triggerActiveSeconds;
  } else if (status !== "drawdown") {
    lastTriggerActiveSeconds = null;
  }

  lastLoggedStatus = status;
}

export async function runDrawdownGuard() {
  const enableRealSwap = requireBooleanEnv("ENABLE_REAL_SWAP", false);
  const INPUT = await resolveTokenLabel(CONFIG.inputMint);
  const OUTPUT = await resolveTokenLabel(CONFIG.outputMint);
  const wallet = loadWallet();

  // Static process info is logged once on startup, not on every watcher cycle.
  if (!hasLoggedSystemInfo) {
    const balanceLamports = await connection.getBalance(wallet.publicKey);

    log(
      "SYSTEM",
      `wallet=${wallet.publicKey.toBase58()} solBalance=${formatSol(balanceLamports)}`
    );

    hasLoggedSystemInfo = true;
  }

  let price = await getActivePrice();

  if (!isValidPrice(price)) {
    logError("SYSTEM", "invalid price from active source");
    return;
  }

  const resourceState = await getResourceState(wallet.publicKey);

  const now = Date.now();
  const cooldownActive = now - lastProtectionTime < CONFIG.cooldownSeconds * 1000;

  const drawdownCheck = checkDrawdown(price);
  let status = drawdownCheck.status;

  const cooldownInfo = cooldownActive
    ? ` cooldown=${getCooldownRemainingSeconds(now)}s`
    : "";

  const triggerInfo =
    status === "trigger" && drawdownCheck.triggerActiveSeconds !== null
      ? ` trigger active ${drawdownCheck.triggerActiveSeconds}s / ${CONFIG.confirmationSeconds}s`
      : "";

  // Compact per-cycle snapshot for live watcher visibility.
  log(
    "CYCLE",
    `price=${formatPrice(price)} status=${status}${cooldownInfo}${triggerInfo}`
  );

  // Separate event-style log for actual state transitions.
  logStatusTransition(status, price, drawdownCheck.triggerActiveSeconds);

  // Cooldown suppresses new protection sequences, but watcher monitoring continues.
  if (cooldownActive) {
    if (!wasCooldownActive) {
      const remaining = getCooldownRemainingSeconds(now);
      log("SYSTEM", `cooldown active | remaining=${remaining}s`);
      wasCooldownActive = true;
    }
    return;
  }

  wasCooldownActive = false;

  // No protection is allowed before confirmed drawdown / critical conditions.
  if (status === "ok" || status === "warning" || status === "trigger") {
    lastBlockedProtectionKey = null;
    return;
  }

  // Resource guard: watcher keeps observing the market, but execution is blocked
  // if wallet state does not allow safe protection.
  if (resourceState.mode === "passive") {
    const blockedKey = `${status}:${resourceState.reason}`;

    if (lastBlockedProtectionKey !== blockedKey) {
      log(
        "SYSTEM",
        `protection unavailable | status=${status} mode=${resourceState.mode} reason=${resourceState.reason}`
      );
      lastBlockedProtectionKey = blockedKey;
    }

    return;
  }

  lastBlockedProtectionKey = null;

  // Build protection plan only when execution is actually possible.
  const chunks = calculateChunks(
    CONFIG.protectionAmountBaseUnits,
    CONFIG.chunkSize
  );

  log("PROTECTION", "preparing | checking token balance");

  const tokenBalance = await getTokenBalance(
    connection,
    wallet.publicKey,
    CONFIG.inputMint
  );

  log("PROTECTION", `balance loaded | ${INPUT}=${tokenBalance}`);

  const requiredAmount = chunks.reduce((a, b) => a + b, 0);

  log(
    "PROTECTION",
    `start | mode=${enableRealSwap ? "real-swap" : "dry-run"} input=${INPUT} output=${OUTPUT} required=${requiredAmount} balance=${tokenBalance} chunks=${chunks.length}`
  );

  if (tokenBalance < requiredAmount) {
    log(
      "PROTECTION",
      `skipped | reason=insufficient-${INPUT.toLowerCase()}-balance`
    );
    return;
  }

  const signatures: string[] = [];

  // Execute protection in chunks to reduce execution risk and allow market
  // re-evaluation between steps.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    log("PROTECTION", `chunk ${i + 1}/${chunks.length} | amount=${chunk}`);

    if (enableRealSwap) {
      const result = await executeChunkWithRetry(chunk);

      if (!result.success) {
        log(
          "PROTECTION",
          `chunk ${i + 1}/${chunks.length} stopped | reason=${result.stoppedReason}`
        );
        break;
      }

      if (result.signature) {
        signatures.push(result.signature);
      }
    } else {
      log(
        "PROTECTION",
        `chunk ${i + 1}/${chunks.length} | dry-run amount=${chunk}`
      );
    }

    // Re-check market after each chunk to stop early if recovery already happened.
    price = await getActivePrice();

    if (!isValidPrice(price)) {
      logError("PROTECTION", "invalid price after chunk | stopping sequence");
      break;
    }

    const drawdownCheckAfterChunk = checkDrawdown(price);
    status = drawdownCheckAfterChunk.status;
    logStatusTransition(status, price, drawdownCheckAfterChunk.triggerActiveSeconds);

    if (price >= CONFIG.target) {
      log("PROTECTION", "stopped | reason=target-restored");
      break;
    }

    if (i < chunks.length - 1) {
      log(
        "PROTECTION",
        `pause before next chunk | seconds=${CONFIG.twapPauseSeconds}`
      );

      await sleep(CONFIG.twapPauseSeconds * 1000);

      // Re-check again after TWAP pause, before continuing to the next chunk.
      price = await getActivePrice();

      if (!isValidPrice(price)) {
        logError("PROTECTION", "invalid price before next chunk | stopping sequence");
        break;
      }

      const drawdownCheckAfterPause = checkDrawdown(price);
      status = drawdownCheckAfterPause.status;
      logStatusTransition(status, price, drawdownCheckAfterPause.triggerActiveSeconds);

      if (price >= CONFIG.target) {
        log("PROTECTION", "stopped after pause | reason=target-restored");
        break;
      }
    }
  }

  // Any completed protection attempt starts cooldown, including partial execution.
  lastProtectionTime = Date.now();
  wasCooldownActive = false;

  log("PROTECTION", "sequence completed");
  log("SYSTEM", `cooldown started | duration=${CONFIG.cooldownSeconds}s`);

  if (enableRealSwap) {
    log("PROTECTION", `signatures=${JSON.stringify(signatures)}`);
  } else {
    log("PROTECTION", "dry-run completed | no real transactions sent");
  }
}
