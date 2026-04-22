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
  // Última tentativa sem retry
  return fetch(url, { headers: { Accept: 'application/json' }, ...options });
}

/**
 * Junta pedidos à API em chunks para evitar URI demasiado longa.
 */
export async function fetchPrices(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(',') : locations;
  const merged = [];
  for (const part of chunk(unique, 80)) {
    const url = `${BASE}/prices/${part.join(',')}?locations=${encodeURIComponent(loc)}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
    merged.push(...(await res.json()));
  }
  return merged;
}

export async function fetchHistory(itemIds, locations, timescale = 24) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(',') : locations;
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
}
