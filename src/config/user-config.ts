import type { UserConfig } from "./types";

export const CONFIG: UserConfig = {
  inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  outputMint: "So11111111111111111111111111111111111111112",
  priceFeedId: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",

  trigger: 0.99,
  critical: 0.98,
  target: 0.995,

  confirmationSeconds: 240,
  cooldownSeconds: 180,
  slippageBps: 100,

  protectionAmountBaseUnits: 100_000_000,
  chunkSize: 0.2,
  twapPauseSeconds: 10,

  minBalanceLamports: 50_000_000,

  priceSource: "mock",                          // "pyth" = live oracle, "mock" = simulated scenarios
  mockScenario: "trigger-to-critical-rebound",  // optional mock scenario override. Default: "drawdown-cycle"
};
