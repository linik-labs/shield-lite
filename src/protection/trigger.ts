import { CONFIG } from "../config/user-config";

export type DrawdownStatus =
  | "ok"
  | "warning"
  | "trigger"
  | "drawdown"
  | "critical";

export type DrawdownCheckResult = {
  status: DrawdownStatus;
  triggerActiveSeconds: number | null;
};

let triggerStartTime: number | null = null;

// Evaluates current price against configured thresholds.
export function checkDrawdown(price: number): DrawdownCheckResult {
  const now = Date.now();

  // Market fully recovered → reset state.
  if (price >= CONFIG.target) {
    triggerStartTime = null;
    return {
      status: "ok",
      triggerActiveSeconds: null,
    };
  }

  // Critical zone → no timer reset, reuse existing if present.
  if (price < CONFIG.critical) {
    return {
      status: "critical",
      triggerActiveSeconds:
        triggerStartTime !== null
          ? Math.floor((now - triggerStartTime) / 1000)
          : null,
    };
  }

  // Trigger zone → start or continue confirmation timer.
  if (price < CONFIG.trigger) {
    if (triggerStartTime === null) {
      triggerStartTime = now;
    }

    const triggerActiveSeconds = Math.floor((now - triggerStartTime) / 1000);

    if (triggerActiveSeconds >= CONFIG.confirmationSeconds) {
      return {
        status: "drawdown",
        triggerActiveSeconds,
      };
    }

    return {
      status: "trigger",
      triggerActiveSeconds,
    };
  }

  // Between trigger and target → warning, reset timer.
  triggerStartTime = null;

  return {
    status: "warning",
    triggerActiveSeconds: null,
  };
}
