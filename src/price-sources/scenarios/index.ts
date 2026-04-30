import { drawdownCycleScenario } from "./drawdownCycle";
import { quickConfirmedDrawdownScenario } from "./quickConfirmedDrawdown";
import { triggerToCriticalReboundScenario } from "./triggerToCriticalRebound";
import type { MockScenario } from "../../config/types";
import type { MockPriceScenario } from "./types";

// Registry of available mock scenarios.
const SCENARIOS: Record<MockScenario, MockPriceScenario> = {
  "drawdown-cycle": drawdownCycleScenario,
  "quick-confirmed-drawdown": quickConfirmedDrawdownScenario,
  "trigger-to-critical-rebound": triggerToCriticalReboundScenario,
};

export function getMockScenario(name: MockScenario): MockPriceScenario {
  const scenario = SCENARIOS[name];

  if (!scenario) {
    throw new Error(`Unknown mock scenario: ${name}`);
  }

  return scenario;
}