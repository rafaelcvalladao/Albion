const BASE = 'https://www.albion-online-data.com/api/v2/stats';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 4) {
  let delay = 2000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, ...options });
    if (res.status !== 429) return res;
    const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
    const wait = retryAfter > 0 ? retryAfter * 1000 : delay;
    await sleep(wait);
    delay = Math.min(delay * 2, 15000);
  }
  return fetch(url, { headers: { Accept: 'application/json' }, ...options });
}

// TTL: 2 min para preços, 5 min para histórico
const PRICES_TTL = 120_000;
const HISTORY_TTL = 300_000;
const cache = new Map();
const inFlight = new Map();

function makeCacheKey(type, ids, loc, timescale) {
  return `${type}|${ids.join(',')}|${loc}|${timescale ?? ''}`;
}

function fromCache(key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null; }
  return entry.data;
}

function toCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
  // Evict entradas mais antigas se crescer demais
  if (cache.size > 300) {
    cache.delete(cache.keys().next().value);
  }
}

function withCacheAndDedup(key, ttl, fn) {
  const hit = fromCache(key, ttl);
  if (hit !== null) return Promise.resolve(hit);
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = fn()
    .then(data => { toCache(key, data); inFlight.delete(key); return data; })
    .catch(err => { inFlight.delete(key); throw err; });
  inFlight.set(key, promise);
  return promise;
}

export async function fetchPrices(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))].sort();
  const locs = (Array.isArray(locations) ? [...locations] : locations.split(',')).sort();
  const loc = locs.join(',');
  const key = makeCacheKey('p', unique, loc);

  return withCacheAndDedup(key, PRICES_TTL, async () => {
    const merged = [];
    for (const part of chunk(unique, 80)) {
      const url = `${BASE}/prices/${part.join(',')}?locations=${encodeURIComponent(loc)}`;
      const res = await fetchWithRetry(url);
      if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
      merged.push(...(await res.json()));
    }
    return merged;
  });
}

export async function fetchHistory(itemIds, locations, timescale = 24) {
  const unique = [...new Set(itemIds.filter(Boolean))].sort();
  const locs = (Array.isArray(locations) ? [...locations] : locations.split(',')).sort();
  const loc = locs.join(',');
  const key = makeCacheKey('h', unique, loc, timescale);

  return withCacheAndDedup(key, HISTORY_TTL, async () => {
    const merged = [];
    const parts = chunk(unique, 40);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) await sleep(300);
      const url = `${BASE}/history/${parts[i].join(',')}?locations=${encodeURIComponent(loc)}&timescale=${timescale}`;
      const res = await fetchWithRetry(url);
      if (!res.ok) throw new Error(`Albion history HTTP ${res.status}`);
      merged.push(...(await res.json()));
    }
    return merged;
  });
}
