import type { MockPriceScenario } from "./types";

export const triggerToCriticalReboundScenario: MockPriceScenario = {
  name: "trigger-to-critical-rebound",
  segments: [
    { durationSeconds: 30, price: 1.0 },    // normal

    { durationSeconds: 120, price: 0.991 }, // warning

    { durationSeconds: 120, price: 0.989 }, // trigger (not enough for confirmation)

    { durationSeconds: 120, price: 0.979 }, // below critical (deep drawdown)

    { durationSeconds: 90, price: 0.986 },  // rebound but still below trigger

    { durationSeconds: 120, price: 0.996 }, // recovery above target
  ],
};
