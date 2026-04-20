// ─── Cache de preços com TTL ───
const PRICE_CACHE = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const PRICE_CACHE_MAX_SIZE = 500;

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

  // --- Fase 1: buscar histórico horário (96 horas, time-scale=1) ---
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
    const complete = sorted;
    
    // Usar últimas 96 horas (96 pontos de dados com time-scale=1)
    const last96h = complete.slice(-96);
    if (last96h.length === 0) {
      continue;
    }
    const totalCount = last96h.reduce((s, d) => s + (d.item_count || 0), 0);
    const totalSilver = last96h.reduce((s, d) => s + (d.avg_price || 0) * (d.item_count || 0), 0);
    const avgVol = totalCount / 4; // janela fixa de 96h = 4 dias
    const avgPrice = totalCount > 0 ? Math.round(totalSilver / totalCount) : 0;

    const prev = volumeMap.get(key);
    if (!prev || avgVol > prev.volume) {
      volumeMap.set(key, { volume: avgVol, avgPrice });
    }
  }

  // --- Fase 2: fallback semanal (4 semanas) para itens com volume 0 ---
  const zeroVolumeIds = new Set();
  for (const id of unique) {
    // Checar se alguma localização retornou volume > 0
    let hasVolume = false;
    for (const [k, v] of volumeMap) {
      if (k.startsWith(`${id}|`) && v.volume > 0) { hasVolume = true; break; }
    }
    if (!hasVolume) zeroVolumeIds.add(id);
  }

  if (zeroVolumeIds.size > 0) {
    const fallbackIds = [...zeroVolumeIds];
    const fallbackChunks = chunk(fallbackIds, HISTORY_CHUNK_SIZE);
    const fallbackMerged = [];

    for (let i = 0; i < fallbackChunks.length; i += concurrency) {
      const batch = fallbackChunks.slice(i, i + concurrency);
      const calls = batch.map(async (part) => {
        const url = `https://www.albion-online-data.com/api/v2/stats/history/${part.join(',')}?locations=${encodeURIComponent(loc)}&time-scale=168`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        return res.json();
      });

      const results = await Promise.allSettled(calls);
      for (const r of results) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) fallbackMerged.push(...r.value);
      }

      if (i + concurrency < fallbackChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, HISTORY_THROTTLE_MS));
      }
    }

    for (const entry of fallbackMerged) {
      if (!entry.data || !Array.isArray(entry.data)) continue;
      const key = `${entry.item_id}|${entry.location}`;

      const sorted = [...entry.data].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
      // Cada data-point = 1 semana; remover o mais recente (parcial)
      const complete = sorted.length > 1 ? sorted.slice(0, -1) : sorted;
      const totalCount = complete.reduce((s, d) => s + (d.item_count || 0), 0);
      const totalSilver = complete.reduce((s, d) => s + (d.avg_price || 0) * (d.item_count || 0), 0);
      const weeks = complete.length || 1;
      // Converter volume semanal para diário
      const avgVol = totalCount / (weeks * 7);
      const avgPrice = totalCount > 0 ? Math.round(totalSilver / totalCount) : 0;

      const prev = volumeMap.get(key);
      if (!prev || avgVol > prev.volume) {
        volumeMap.set(key, { volume: avgVol, avgPrice });
      }
    }
  }

  return volumeMap;
}
