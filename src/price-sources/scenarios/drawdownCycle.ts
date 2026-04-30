import type { MockPriceScenario } from "./types";

export const drawdownCycleScenario: MockPriceScenario = {
  name: "drawdown-cycle",
  segments: [
    { durationSeconds: 30, price: 1.0 },    // normal

    { durationSeconds: 40, price: 0.989 },  // short trigger (not enough for confirmation)

    { durationSeconds: 40, price: 0.993 },  // rebound to warning, trigger reset

    { durationSeconds: 260, price: 0.989 }, // confirmed drawdown

    { durationSeconds: 120, price: 0.979 }, // critical zone

    { durationSeconds: 30, price: 0.996 },  // recovery above target

    { durationSeconds: 420, price: 0.984 }, // new drawdown during cooldown, then confirmed again

    { durationSeconds: 120, price: 0.996 }, // final recovery
  ],
};

