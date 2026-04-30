// Single price segment in a mock scenario.
export type MockPriceSegment = {
  durationSeconds: number;
  price: number;
};

// Mock price scenario (used for local simulation).
export type MockPriceScenario = {
  name: string;
  segments: MockPriceSegment[];
};