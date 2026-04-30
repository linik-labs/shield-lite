import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { CONFIG } from "./config/user-config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} not set in .env`);
  }
  return value;
}

const RPC_URL = requireEnv("SOLANA_RPC_URL");
const SOLANA_KEYPAIR_PATH = requireEnv("SOLANA_KEYPAIR_PATH");

export const connection = new Connection(RPC_URL, "confirmed");

export function loadWallet(): Keypair {
  const absolutePath = path.resolve(SOLANA_KEYPAIR_PATH);
  const secretKeyString = fs.readFileSync(absolutePath, "utf-8");
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: string
): Promise<number> {
  // === SPECIAL CASE: native SOL ===
  if (mint === NATIVE_SOL_MINT) {
    const lamports = await connection.getBalance(owner);
    const available = Math.max(0, lamports - CONFIG.minBalanceLamports);
    return available;
  }

  // === SPL TOKEN ===
  const mintPubkey = new PublicKey(mint);

  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: mintPubkey,
  });

  if (accounts.value.length === 0) {
    return 0;
  }

  const balance =
    accounts.value[0].account.data.parsed.info.tokenAmount.amount;

  return Number(balance);
}
