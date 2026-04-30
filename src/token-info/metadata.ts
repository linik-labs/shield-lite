import { PublicKey } from "@solana/web3.js";
import { connection } from "../solana";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

const umi = createUmi(RPC_URL).use(mplTokenMetadata());

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function cleanMetadataText(value: string | undefined | null): string | null {
  if (!value) return null;

  const cleaned = value.replace(/\0/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

// PDA derivation
function getMetadataPDA(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
}

// decode helper
function extractString(data: Buffer, start: number, length: number): string {
  return data
    .slice(start, start + length)
    .toString("utf8")
    .replace(/\0/g, "")
    .trim();
}

export async function resolveTokenSymbolOrName(
  mint: string
): Promise<string | null> {
  const mintPubkey = new PublicKey(mint);

  // === 1. UMI / Metaplex (основной путь) ===
  try {
    const asset = await fetchDigitalAsset(
      umi,
      mint as unknown as Parameters<typeof fetchDigitalAsset>[1]
    );

    const symbol = cleanMetadataText(asset.metadata.symbol);
    if (symbol) return symbol;

    const name = cleanMetadataText(asset.metadata.name);
    if (name) return name;
  } catch {}

  // === 2. PDA fallback (ручной decode) ===
  try {
    const metadataPDA = getMetadataPDA(mintPubkey);
    const accountInfo = await connection.getAccountInfo(metadataPDA);

    if (accountInfo?.data) {
      const data = accountInfo.data;

      const name = extractString(data, 1 + 32 + 32, 32);
      const symbol = extractString(data, 1 + 32 + 32 + 32, 10);

      if (symbol) return symbol;
      if (name) return name;
    }
  } catch {}

  // === 3. Token-2022 / raw scan ===
  try {
    const accountInfo = await connection.getAccountInfo(mintPubkey);

    if (accountInfo?.data) {
      const raw = accountInfo.data.toString("utf8");

      const symbolMatch = raw.match(/"symbol":"([^"]+)"/);
      if (symbolMatch) return symbolMatch[1];

      const nameMatch = raw.match(/"name":"([^"]+)"/);
      if (nameMatch) return nameMatch[1];
    }
  } catch {}

  return null;
}
