// libs/useLiveCrypto.ts
import { useEffect, useMemo, useRef, useState } from "react";

type PriceRow = { price: number; change24h?: number };

type AnyJson = Record<string, any>;

/** Try multiple common shapes and coerce into { [id]: { price, change24h } } */
function normalizePrices(ids: string[], json: AnyJson): Record<string, PriceRow> {
  const out: Record<string, PriceRow> = {};

  // Helper to set if valid
  const setIf = (id: string, priceLike: unknown, change?: unknown) => {
    const n = Number(priceLike);
    if (Number.isFinite(n) && n > 0) {
      const ch = Number(change);
      out[id] = { price: n, change24h: Number.isFinite(ch) ? ch : undefined };
    }
  };

  // 1) Our original shape: { prices: { bitcoin: { price, change24h } } }
  if (json && typeof json === "object" && json.prices && typeof json.prices === "object") {
    for (const id of ids) {
      const row = json.prices[id];
      if (row) setIf(id, row.price ?? row.usd ?? row.last ?? row.value, row.change24h ?? row.change);
    }
  }

  // 2) Gecko-like: { bitcoin: { usd: 69420, usd_24h_change?: -1.2 } }
  for (const id of ids) {
    if (!out[id] && json && typeof json === "object" && json[id]) {
      const node = json[id];
      setIf(id, node.usd ?? node.price ?? node.last ?? node.value, node.usd_24h_change ?? node.change24h ?? node.change);
    }
  }

  // 3) Wrapped: { data: { bitcoin: { usd: ... } } } or { result: { ... } }
  const wrappers = [json?.data, json?.result, json?.payload];
  for (const wrap of wrappers) {
    if (!wrap || typeof wrap !== "object") continue;
    for (const id of ids) {
      if (!out[id] && wrap[id]) {
        const node = wrap[id];
        setIf(id, node.usd ?? node.price ?? node.last ?? node.value, node.usd_24h_change ?? node.change24h ?? node.change);
      }
    }
  }

  // 4) Array-ish: [{ id:"bitcoin", usd: ... }] or [{ symbol:"bitcoin", price: ... }]
  if (Array.isArray(json)) {
    for (const id of ids) {
      const row = json.find(
        (r) => r?.id === id || r?.symbol === id || r?.asset === id || r?.name === id
      );
      if (row) setIf(id, row.usd ?? row.price ?? row.last ?? row.value, row.usd_24h_change ?? row.change24h ?? row.change);
    }
  }

  // 5) Flat fallback: { usd: 123 } when only one id requested
  if (ids.length === 1 && !out[ids[0]] && json && typeof json === "object") {
    const only = ids[0];
    setIf(only, json.usd ?? json.price ?? json.last ?? json.value, json.usd_24h_change ?? json.change24h ?? json.change);
  }

  return out;
}

export function useLiveCrypto(params: {
  ids: string[];                    // e.g., ["bitcoin"]
  vs?: "usd";
  pollMs?: number;                  // e.g., 15000
  amounts?: Record<string, number>; // base holdings in native units
}) {
  const { ids, vs = "usd", pollMs = 15000, amounts = {} } = params;
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const lastGood = useRef<Record<string, PriceRow>>({});

  const fetchOnce = async () => {
    const controller = new AbortController();
    const sig = controller.signal;
    try {
      setError(null);
      const url = `/api/prices?ids=${ids.join(",")}&vs=${vs}`;
      const res = await fetch(url, { cache: "no-store", signal: sig });
      const json = await res.json().catch(() => ({} as AnyJson));
      const norm = normalizePrices(ids, json);

      // If route wraps in { ok:true, ... }, fall back to that object too
      if (Object.keys(norm).length === 0 && json?.ok && typeof json === "object") {
        const inner = { ...json };
        delete inner.ok;
        const alt = normalizePrices(ids, inner);
        if (Object.keys(alt).length) setPrices(alt), (lastGood.current = alt);
        else if (Object.keys(lastGood.current).length) setPrices(lastGood.current);
      } else if (Object.keys(norm).length) {
        setPrices(norm);
        lastGood.current = norm;
      } else if (Object.keys(lastGood.current).length) {
        setPrices(lastGood.current); // keep last good price instead of dropping to zero
      }
    } catch (e: any) {
      setError(e?.message || "price fetch failed");
      if (Object.keys(lastGood.current).length) setPrices(lastGood.current);
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  };

  useEffect(() => {
    fetchOnce();
    timer.current = window.setInterval(fetchOnce, pollMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(","), vs, pollMs]);

  const computed = useMemo(() => {
    let totalUsd = 0;
    const perAsset: Record<string, { usdValue: number; price: number; change24h?: number }> = {};
    for (const id of ids) {
      const amt = amounts[id] ?? 0;
      const p = prices[id]?.price ?? 0;
      const usdValue = amt * p;
      if (usdValue) totalUsd += usdValue;
      perAsset[id] = { usdValue, price: p, change24h: prices[id]?.change24h };
    }
    return { totalUsd, perAsset };
  }, [ids, prices, amounts]);

  return { loading, error, prices, ...computed };
}
