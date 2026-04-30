import axios from "axios";

const JUP_API_BASE = "https://api.jup.ag";
const JUP_API_KEY = process.env.JUPITER_API_KEY ?? "";

type JupiterSearchItem = {
  id: string;
  name?: string | null;
  symbol?: string | null;
};

function cleanText(value: string | undefined | null): string | null {
  if (!value) return null;

  const cleaned = value.replace(/\0/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export async function resolveTokenLabelFromJupiter(
  mint: string
): Promise<string | null> {
  if (!JUP_API_KEY) {
    return null;
  }

  try {
    const resp = await axios.get<JupiterSearchItem[]>(
      `${JUP_API_BASE}/tokens/v2/search`,
      {
        headers: {
          "x-api-key": JUP_API_KEY,
        },
        params: {
          query: mint,
        },
        timeout: 10_000,
      }
    );

    const items = Array.isArray(resp.data) ? resp.data : [];

    const match = items.find((item) => item.id === mint);

    if (!match) {
      return null;
    }

    const symbol = cleanText(match.symbol);
    if (symbol) return symbol;

    const name = cleanText(match.name);
    if (name) return name;

    return null;
  } catch {
    return null;
  }
}
