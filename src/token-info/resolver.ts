import { PublicKey } from "@solana/web3.js";
import {
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { connection } from "../solana";
import { resolveTokenSymbolOrName } from "./metadata";
import { resolveTokenLabelFromJupiter } from "./jupiter";

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

export async function resolveMintDecimals(mint: string): Promise<number> {
  const mintPubkey = new PublicKey(mint);

  try {
    const mintInfo = await getMint(connection, mintPubkey, "confirmed", TOKEN_PROGRAM_ID);
    return mintInfo.decimals;
  } catch {
    const mintInfo2022 = await getMint(
      connection,
      mintPubkey,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    return mintInfo2022.decimals;
  }
}

export async function resolveTokenDecimals(mint: string): Promise<number> {
  if (mint === NATIVE_SOL_MINT) {
    return 9;
  }
  
  return resolveMintDecimals(mint);
}

export async function resolveTokenLabel(mint: string): Promise<string> {
  const metadataLabel = await resolveTokenSymbolOrName(mint);
  if (metadataLabel) {
    return metadataLabel;
  }

  const jupiterLabel = await resolveTokenLabelFromJupiter(mint);
  if (jupiterLabel) {
    return jupiterLabel;
  }

  return "UNKNOWN_TOKEN";
}

export async function validateTokenMint(mint: string): Promise<void> {
  if (mint === NATIVE_SOL_MINT) {
    return;
  }

  await resolveMintDecimals(mint);
}
