// ─── Cache de preços com TTL ───
const PRICE_CACHE = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const PRICE_CACHE_MAX_SIZE = 500;
const PRICE_PENDING = new Map(); // deduplicação: evita chamar a API duas vezes para o mesmo key

const PRICE_CHUNK_SIZE = 100;
const PRICE_CONCURRENCY = 5;
const PRICE_THROTTLE_MS = 300;

const HISTORY_CHUNK_SIZE = 50;
const HISTORY_CONCURRENCY = 3;
const HISTORY_THROTTLE_MS = 300;

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
  if (PRICE_CACHE.size > PRICE_CACHE_MAX_SIZE) {
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
  const allChunks = chunk(unique, PRICE_CHUNK_SIZE);
  const merged = [];
  const concurrency = PRICE_CONCURRENCY;
  const qualitiesParam = quality > 0 ? `&qualities=${quality}` : '';

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const cacheKey = getPriceCacheKey(part, loc, quality);
      const cached = getCachedPrices(cacheKey);
      if (cached) return cached;
      if (PRICE_PENDING.has(cacheKey)) return PRICE_PENDING.get(cacheKey);

      const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(',')}?locations=${encodeURIComponent(loc)}${qualitiesParam}`;
      const promise = fetch(url, { headers: { Accept: 'application/json' } })
        .then(res => { if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`); return res.json(); })
        .then(data => { setCachedPrices(cacheKey, data); return data; })
        .finally(() => PRICE_PENDING.delete(cacheKey));
      PRICE_PENDING.set(cacheKey, promise);
      return promise;
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) merged.push(...r.value);
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, PRICE_THROTTLE_MS));
    }
  }

  return merged;
}

export async function fetchHistoryMarket(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(',') : locations;
  const allChunks = chunk(unique, HISTORY_CHUNK_SIZE);
  const concurrency = HISTORY_CONCURRENCY;

  // Buscar histórico horário (time-scale=1)
  const merged = [];
  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const url = `https://www.albion-online-data.com/api/v2/stats/history/${part.join(',')}?locations=${encodeURIComponent(loc)}&time-scale=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      return res.json();
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) merged.push(...r.value);
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, HISTORY_THROTTLE_MS));
    }
  }

  // volumeMap: key → { volume, avgPrice }
  const volumeMap = new Map();

  for (const entry of merged) {
    if (!entry.data || !Array.isArray(entry.data)) continue;
    const key = `${entry.item_id}|${entry.location}`;

    const sorted = [...entry.data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    // Vol.24h: soma das últimas 72h / 3
    const last72h = sorted.slice(-72);
    const totalCount72 = last72h.reduce((s, d) => s + (d.item_count || 0), 0);
    const avgVol = totalCount72 / 3;

    // Preço médio: média simples dos avg_price nas horas com vendas
    // Janelas progressivas: 72h → 7d (168h) → 14d (336h)
    let avgPrice = 0;
    for (const windowSize of [72, 168, 336]) {
      const salesHours = sorted.slice(-windowSize).filter(d => (d.item_count || 0) > 0);
      if (salesHours.length > 0) {
        avgPrice = Math.round(salesHours.reduce((s, d) => s + (d.avg_price || 0), 0) / salesHours.length);
        break;
      }
    }

    const prev = volumeMap.get(key);
    if (!prev || avgVol > prev.volume) {
      volumeMap.set(key, { volume: avgVol, avgPrice });
    }
  }

  return volumeMap;
}
