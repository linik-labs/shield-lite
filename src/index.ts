import "dotenv/config";
import { runDrawdownGuard } from "./protection/executor";
import { CONFIG } from "./config/user-config";
import { getMockScenario } from "./price-sources/scenarios";
import { startMockScenario, hasActiveMockScenario } from "./price-sources/mock";
import { log } from "./logger";
import { resolveObservedFeed } from "./price-feeds/registry";
import { resolveTokenLabel } from "./token-info/resolver";
import { validateTokenMint } from "./token-info/resolver";
import { requireBooleanEnv } from "./env";

function logStrategy() {
  log(
    "CONFIG",
    `trigger=${CONFIG.trigger} | critical=${CONFIG.critical} | target=${CONFIG.target} | confirm=${CONFIG.confirmationSeconds}s | cooldown=${CONFIG.cooldownSeconds}s | slip=${CONFIG.slippageBps}bps`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== Shield Lite (Watcher Mode) ===");

  let observedSymbol: string;

  try {
    const feed = await resolveObservedFeed(CONFIG.priceFeedId);
    observedSymbol = feed.symbol;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[FEED] ${message}`);
    log("SYSTEM", "startup aborted");
    process.exit(0);
  }
    

  try {
    await validateTokenMint(CONFIG.inputMint);
  } catch {
    console.error(
      `[INPUT] Invalid CONFIG.inputMint. Token mint could not be resolved. Check user-config.ts`
    );
    log("SYSTEM", "startup aborted");
    process.exit(0);
  }

  try {
    await validateTokenMint(CONFIG.outputMint);
  } catch {
    console.error(
      `[OUTPUT] Invalid CONFIG.outputMint. Token mint could not be resolved. Check user-config.ts`
    );
    log("SYSTEM", "startup aborted");
    process.exit(0);
  }

  const inputSymbol = await resolveTokenLabel(CONFIG.inputMint);
  const outputSymbol = await resolveTokenLabel(CONFIG.outputMint);
  const enableRealSwap = requireBooleanEnv("ENABLE_REAL_SWAP", false);

  log("SYSTEM", `observing ${observedSymbol}`);
  log("SYSTEM", `execution path | ${inputSymbol} -> ${outputSymbol}`);
  log(
    "SYSTEM",
    `mode=${enableRealSwap ? "real-swap" : "dry-run"} priceSource=${CONFIG.priceSource}`
  );

  if (CONFIG.priceSource === "mock" && !hasActiveMockScenario()) {
    const scenario = getMockScenario(CONFIG.mockScenario ?? "drawdown-cycle");
    startMockScenario(scenario);
    log("SYSTEM", `mock scenario started | name=${scenario.name}`);
  }

  logStrategy();

  const STARTUP_DELAY_SECONDS = 15;
  log(
    "SYSTEM",
    `startup check window | seconds=${STARTUP_DELAY_SECONDS} (press Ctrl+C to abort if configuration is incorrect)`
  );

  await sleep(STARTUP_DELAY_SECONDS * 1000);

  log("SYSTEM", "watcher started");

  while (true) {
    try {
      await runDrawdownGuard();
    } catch (err) {
      console.error("[WATCHER] Error:", err);
    }

    await sleep(10_000);
  }
}

main();
