// app/api/prices/route.ts
import { NextResponse } from "next/server";

type PriceRow = { price: number; change24h?: number };
type PriceMap = Record<string, PriceRow>;

// Minimal id mapping you can expand
const SYMBOL_TO_PAIR: Record<string, string> = {
  bitcoin: "BTC-USD",
  ethereum: "ETH-USD",
  solana: "SOL-USD",
};

// ---- Providers ----
async function getFromCoinbase(ids: string[], vs = "usd"): Promise<PriceMap> {
  // Coinbase is one-by-one (spot endpoint); simple + reliable
  const out: PriceMap = {};
  for (const id of ids) {
    const pair = SYMBOL_TO_PAIR[id];
    if (!pair) continue;
    const res = await fetch(`https://api.coinbase.com/v2/prices/${pair}/spot`, {
      headers: { "User-Agent": "HorizonPriceService/1.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`coinbase ${pair} ${res.status}`);
    const json = await res.json();
    out[id] = { price: parseFloat(json.data.amount) };
  }
  return out;
}

async function getFromCoingecko(ids: string[], vs = "usd"): Promise<PriceMap> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(
    ","
  )}&vs_currencies=${vs}&include_24hr_change=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "HorizonPriceService/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const j = await res.json();
  const out: PriceMap = {};
  for (const id of ids) {
    const row = j[id];
    if (!row) continue;
    out[id] = {
      price: Number(row[vs]),
      change24h: typeof row[`${vs}_24h_change`] === "number"
        ? row[`${vs}_24h_change`]
        : undefined,
    };
  }
  return out;
}

// ---- Route ----
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").map((s) => s.trim()).filter(Boolean) ?? ["bitcoin"];
  const vs = (searchParams.get("vs") || "usd").toLowerCase();

  try {
    // 1) Try Coinbase (spot)
    const coinbase = await getFromCoinbase(ids, vs);
    // 2) Optionally enrich 24h change from Coingecko (best-effort)
    try {
      const cg = await getFromCoingecko(ids, vs);
      for (const id of ids) {
        if (cg[id]?.change24h != null) {
          coinbase[id] = { ...coinbase[id], change24h: cg[id].change24h };
        }
      }
    } catch { /* ignore enrichment errors */ }
    return NextResponse.json({ prices: coinbase }, { status: 200 });
  } catch {
    // Fallback straight to Coingecko if Coinbase fails
    try {
      const cg = await getFromCoingecko(ids, vs);
      return NextResponse.json({ prices: cg }, { status: 200 });
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to fetch prices", details: String(e?.message || e) },
        { status: 502 }
      );
    }
  }
}
