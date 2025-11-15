// libs/useLiveCrypto.ts
import { useEffect, useMemo, useRef, useState } from "react";

type PriceRow = {
  price: number;
  change24h: number | null;
};

type AnyJson = Record<string, any>;

/** Coerce arbitrary API shapes into { [id]: { price, change24h } } */
function normalizePrices(ids: string[], json: AnyJson): Record<string, PriceRow> {
  const out: Record<string, PriceRow> = {};

  const setIf = (id: string, priceLike: unknown, change?: unknown) => {
    const n = Number(priceLike);
    if (!Number.isFinite(n) || n <= 0) return;
    const ch = Number(change);
    out[id] = {
      price: n,
      change24h: Number.isFinite(ch) ? ch : null,
    };
  };

  // 1) Our original shape: { prices: { bitcoin: { price, change24h } } }
  if (json && typeof json === "object" && json.prices && typeof json.prices === "object") {
    for (const id of ids) {
      const row = json.prices[id];
      if (row) {
        setIf(
          id,
          row.price ?? row.usd ?? row.last ?? row.value,
          row.change24h ?? row.change
        );
      }
    }
  }

  // 2) Gecko-like: { bitcoin: { usd: 69420, usd_24h_change?: -1.2 } }
  for (const id of ids) {
    if (!out[id] && json && typeof json === "object" && json[id]) {
      const node = json[id];
      setIf(
        id,
        node.usd ?? node.price ?? node.last ?? node.value,
        node.usd_24h_change ?? node.change24h ?? node.change
      );
    }
  }

  // 3) Wrapped: { data: { bitcoin: { usd: ... } } } or { result: { ... } }
  const wrappers = [json?.data, json?.result, json?.payload];
  for (const wrap of wrappers) {
    if (!wrap || typeof wrap !== "object") continue;
    for (const id of ids) {
      if (!out[id] && wrap[id]) {
        const node = wrap[id];
        setIf(
          id,
          node.usd ?? node.price ?? node.last ?? node.value,
          node.usd_24h_change ?? node.change24h ?? node.change
        );
      }
    }
  }

  // 4) Array-ish: [{ id:"bitcoin", usd: ... }] or [{ symbol:"bitcoin", price: ... }]
  if (Array.isArray(json)) {
    for (const id of ids) {
      const row = json.find(
        (r) =>
          r?.id === id ||
          r?.symbol === id ||
          r?.asset === id ||
          r?.name === id
      );
      if (row) {
        setIf(
          id,
          row.usd ?? row.price ?? row.last ?? row.value,
          row.usd_24h_change ?? row.change24h ?? row.change
        );
      }
    }
  }

  // 5) Flat fallback: { usd: 123 } when only one id requested
  if (ids.length === 1 && !out[ids[0]] && json && typeof json === "object") {
    const only = ids[0];
    setIf(
      only,
      json.usd ?? json.price ?? json.last ?? json.value,
      json.usd_24h_change ?? json.change24h ?? json.change
    );
  }

  return out;
}

type UseLiveCryptoParams = {
  ids: string[];                    // e.g. ["bitcoin", "ethereum", "solana"]
  vs?: "usd";
  pollMs?: number;                  // e.g. 15000
  amounts?: Record<string, number>; // { bitcoin: 0.12, ethereum: 3.5, ... }
};

export function useLiveCrypto(params: UseLiveCryptoParams) {
  const { ids, vs = "usd", pollMs = 15000, amounts = {} } = params;

  // Normalize ids → lowercase, no blanks
  const normalizedIds = useMemo(
    () => ids.map((s) => s.trim().toLowerCase()).filter(Boolean),
    [ids]
  );

  // Normalize amounts to match normalized ids
  const normalizedAmounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of normalizedIds) {
      // try exact id, upper, lower; fallback 0
      const candidates = [id, id.toUpperCase(), id.toLowerCase()];
      let v = 0;
      for (const k of candidates) {
        if (amounts[k] != null) {
          v = Number(amounts[k]);
          break;
        }
      }
      out[id] = Number.isFinite(v) ? v : 0;
    }
    return out;
  }, [normalizedIds, amounts]);

  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGoodRef = useRef<Record<string, PriceRow>>({});

  const fetchOnce = async () => {
    if (!normalizedIds.length) {
      setPrices({});
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      const url = `/api/prices?ids=${normalizedIds.join(",")}&vs=${vs}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json().catch(() => ({}))) as AnyJson;
      const norm = normalizePrices(normalizedIds, json);

      if (Object.keys(norm).length === 0 && json?.ok && typeof json === "object") {
        // If route wraps in { ok: true, ... }, try again without ok
        const inner = { ...json };
        delete inner.ok;
        const alt = normalizePrices(normalizedIds, inner);
        if (Object.keys(alt).length) {
          setPrices(alt);
          lastGoodRef.current = alt;
        } else if (Object.keys(lastGoodRef.current).length) {
          setPrices(lastGoodRef.current);
        }
      } else if (Object.keys(norm).length) {
        setPrices(norm);
        lastGoodRef.current = norm;
      } else if (Object.keys(lastGoodRef.current).length) {
        setPrices(lastGoodRef.current);
      }
    } catch (e: any) {
      console.error("useLiveCrypto fetch error", e);
      setError(e?.message || "price fetch failed");
      if (Object.keys(lastGoodRef.current).length) {
        setPrices(lastGoodRef.current);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnce();

    if (pollMs > 0 && typeof window !== "undefined") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(fetchOnce, pollMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vs, pollMs, normalizedIds.join(",")]);

  const computed = useMemo(() => {
    let totalUsd = 0;
    const perAsset: Record<
      string,
      { usdValue: number; price: number; change24h: number | null }
    > = {};

    for (const id of normalizedIds) {
      const amt = normalizedAmounts[id] ?? 0;
      const p = prices[id]?.price ?? 0;
      const usdValue = amt * p;
      if (usdValue) totalUsd += usdValue;

      perAsset[id] = {
        usdValue,
        price: p,
        change24h: prices[id]?.change24h ?? null,
      };
    }

    return { totalUsd, perAsset };
  }, [normalizedIds, normalizedAmounts, prices]);

  return {
    loading,
    error,
    prices,          // raw price rows (debug if you ever need)
    perAsset: computed.perAsset,
    totalUsd: computed.totalUsd,
  };
}
