import { CONFIG } from "./config/user-config";
import { connection } from "./solana";
import { getTokenBalance } from "./solana";
import { PublicKey } from "@solana/web3.js";
import { log } from "./logger";
import { resolveTokenLabel } from "./token-info/resolver";
import { resolveTokenDecimals } from "./token-info/resolver";

export type ResourceMode = "active" | "passive";
export type ResourceReason =
  | "ok"
  | "insufficient-sol"
  | "insufficient-input-balance";

export type ResourceState = {
  mode: ResourceMode;
  reason: ResourceReason;
  solLamports: number;
  inputBalance: number;
};

let lastResourceSnapshot: ResourceState | null = null;

function determineResourceState(
  solLamports: number,
  inputBalance: number
): ResourceState {
  if (solLamports < CONFIG.minBalanceLamports) {
    return {
      mode: "passive",
      reason: "insufficient-sol",
      solLamports,
      inputBalance,
    };
  }

  if (inputBalance < CONFIG.protectionAmountBaseUnits) {
    return {
      mode: "passive",
      reason: "insufficient-input-balance",
      solLamports,
      inputBalance,
    };
  }

  return {
    mode: "active",
    reason: "ok",
    solLamports,
    inputBalance,
  };
}

function hasResourceStateChanged(
  prev: ResourceState | null,
  next: ResourceState
): boolean {
  if (!prev) return true;

  return (
    prev.mode !== next.mode ||
    prev.reason !== next.reason ||
    prev.solLamports !== next.solLamports ||
    prev.inputBalance !== next.inputBalance
  );
}

export async function getResourceState(
  walletPublicKey: PublicKey
): Promise<ResourceState> {
  const solLamports = await connection.getBalance(walletPublicKey);
  const inputBalance = await getTokenBalance(
    connection,
    walletPublicKey,
    CONFIG.inputMint
  );

  const nextState = determineResourceState(solLamports, inputBalance);

  if (hasResourceStateChanged(lastResourceSnapshot, nextState)) {
    const inputSymbol = await resolveTokenLabel(CONFIG.inputMint);
    const walletSol = (solLamports / 1e9).toFixed(6);

    let inputBalanceText: string;

    try {
      const inputDecimals = await resolveTokenDecimals(CONFIG.inputMint);
      const inputAvailable = (
        inputBalance / Math.pow(10, inputDecimals)
      ).toFixed(6);

      inputBalanceText = `inputAvailable=${inputAvailable} ${inputSymbol}`;
    } catch {
      inputBalanceText = `inputAvailableBaseUnits=${inputBalance} ${inputSymbol} | decimals=unknown`;
    }

    log(
      "STATE",
      `resources | walletSOL=${walletSol} ${inputBalanceText} mode=${nextState.mode} reason=${nextState.reason}`
    );

    lastResourceSnapshot = nextState;
  }

  return nextState;
}
