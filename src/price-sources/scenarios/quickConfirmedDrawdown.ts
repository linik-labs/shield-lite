import type { MockPriceScenario } from "./types";

export const quickConfirmedDrawdownScenario: MockPriceScenario = {
  name: "quick-confirmed-drawdown",
  segments: [
    { durationSeconds: 30, price: 1.0 },    // normal

    { durationSeconds: 120, price: 0.991 }, // warning only

    { durationSeconds: 60, price: 0.996 },  // recovery above target

    { durationSeconds: 300, price: 0.989 }, // confirmed drawdown

    { durationSeconds: 60, price: 0.996 },  // recovery above target

    { durationSeconds: 660, price: 0.984 }, // extended drawdown

    { durationSeconds: 300, price: 0.996 }, // recovery above target
  ],
};
