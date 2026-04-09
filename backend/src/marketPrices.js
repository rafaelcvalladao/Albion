// ─── Cache de preços com TTL ───
const PRICE_CACHE = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getPriceCacheKey(itemIds, locations, quality) {
  return `${itemIds.sort().join(',')}|${locations}|${quality}`;
}

function getCachedPrices(key) {
  const cached = PRICE_CACHE.get(key);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) return cached.data;
  PRICE_CACHE.delete(key);
  return null;
}

function setCachedPrices(key, data) {
  PRICE_CACHE.set(key, { data, ts: Date.now() });
  if (PRICE_CACHE.size > 500) {
    const now = Date.now();
    for (const [k, v] of PRICE_CACHE) {
      if (now - v.ts > PRICE_CACHE_TTL) PRICE_CACHE.delete(k);
    }
  }
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchPricesMarket(itemIds, locations, quality = 0) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(',') : locations;
  const allChunks = chunk(unique, 100);
  const merged = [];
  const concurrency = 5;
  const qualitiesParam = quality > 0 ? `&qualities=${quality}` : '';

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const cacheKey = getPriceCacheKey(part, loc, quality);
      const cached = getCachedPrices(cacheKey);
      if (cached) return cached;

      const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(',')}?locations=${encodeURIComponent(loc)}${qualitiesParam}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
      const data = await res.json();
      setCachedPrices(cacheKey, data);
      return data;
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) merged.push(...r.value);
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return merged;
}

export async function fetchHistoryMarket(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(',') : locations;
  const allChunks = chunk(unique, 50);
  const merged = [];
  const concurrency = 3;

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const url = `https://www.albion-online-data.com/api/v2/stats/history/${part.join(',')}?locations=${encodeURIComponent(loc)}&time-scale=24`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      return res.json();
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) merged.push(...r.value);
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const volumeMap = new Map();

  for (const entry of merged) {
    if (!entry.data || !Array.isArray(entry.data)) continue;
    const key = `${entry.item_id}|${entry.location}`;

    // Ordenar por timestamp e remover o data-point mais recente (dia parcial/incompleto)
    const sorted = [...entry.data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
    const complete = sorted.length > 1 ? sorted.slice(0, -1) : sorted;
    const total = complete.reduce((s, d) => s + (d.item_count || 0), 0);
    const days = complete.length || 1;
    const avg = Math.round(total / days);

    const prev = volumeMap.get(key) || 0;
    if (avg > prev) volumeMap.set(key, avg);
  }

  return volumeMap;
}
