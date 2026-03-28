const BASE = "https://www.albion-online-data.com/api/v2/stats";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Junta pedidos à API em chunks para evitar URI demasiado longa.
 */
export async function fetchPrices(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const merged = [];
  for (const part of chunk(unique, 80)) {
    const url = `${BASE}/prices/${part.join(",")}?locations=${encodeURIComponent(loc)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
    merged.push(...(await res.json()));
  }
  return merged;
}

export async function fetchHistory(itemIds, locations, timescale = 24) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const merged = [];
  for (const part of chunk(unique, 40)) {
    const url = `${BASE}/history/${part.join(",")}?locations=${encodeURIComponent(loc)}&timescale=${timescale}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Albion history HTTP ${res.status}`);
    merged.push(...(await res.json()));
  }
  return merged;
}
