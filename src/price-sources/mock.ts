import type { MockPriceScenario } from "./scenarios/types";

let activeScenario: MockPriceScenario | null = null;
let simulationStartTime: number | null = null;

// Initializes mock price simulation.
export function startMockScenario(scenario: MockPriceScenario): void {
  activeScenario = scenario;
  simulationStartTime = Date.now();
}

// Resets mock simulation state.
export function resetMockScenario(): void {
  activeScenario = null;
  simulationStartTime = null;
}

// Returns true if a mock scenario is currently active.
export function hasActiveMockScenario(): boolean {
  return activeScenario !== null && simulationStartTime !== null;
}

// Returns current simulated price based on scenario timeline.
export function getMockPrice(): number {
  if (!activeScenario || simulationStartTime === null) {
    throw new Error("[MOCK] No active mock scenario. Call startMockScenario() first.");
  }

  const elapsedSeconds = Math.floor((Date.now() - simulationStartTime) / 1000);

  let accumulatedSeconds = 0;

  for (const segment of activeScenario.segments) {
    accumulatedSeconds += segment.durationSeconds;

    if (elapsedSeconds < accumulatedSeconds) {
      return segment.price;
    }
  }

  // Fallback to last segment price if scenario duration exceeded.
  const lastSegment = activeScenario.segments[activeScenario.segments.length - 1];

  if (!lastSegment) {
    throw new Error("[MOCK] Scenario has no segments.");
  }

  return lastSegment.price;
}

// Returns current simulation state snapshot.
export function getMockScenarioState() {
  if (!activeScenario || simulationStartTime === null) {
    return {
      active: false,
      scenarioName: null,
      elapsedSeconds: 0,
    };
  }

  return {
    active: true,
    scenarioName: activeScenario.name,
    elapsedSeconds: Math.floor((Date.now() - simulationStartTime) / 1000),
  };
}
