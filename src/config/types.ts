// Price source selection.
export type PriceSource = "pyth" | "mock";

// Mock scenarios (used for testing only).
export type MockScenario =
  | "drawdown-cycle"
  | "quick-confirmed-drawdown"
  | "trigger-to-critical-rebound";

// User-defined runtime configuration.
export type UserConfig = {
  inputMint: string;
  outputMint: string;
  priceFeedId: string;

  trigger: number;
  critical: number;
  target: number;

  confirmationSeconds: number;
  slippageBps: number;
  cooldownSeconds: number;

  protectionAmountBaseUnits: number;
  chunkSize: number;
  twapPauseSeconds: number;

  minBalanceLamports: number;

  priceSource: PriceSource;

  // Only used when priceSource = "mock"
  mockScenario?: MockScenario;
};