/**
 * URL base do backend (ex.: https://api.exemplo.com).
 * Definir em build/runtime via `VITE_API_BASE` (Vite injeta em `import.meta.env`).
 * Sem barra final. Vazio em dev: pedidos a `/api/...` usam o proxy do Vite.
 */
function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  if (raw == null || raw === "") return "";
  return String(raw).trim().replace(/\/+$/, "");
}

const base = getApiBase();

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export function calculateWood(body) {
  return request("/api/wood/calculate", { method: "POST", body: JSON.stringify(body) });
}

export function strategyWood(body) {
  return request("/api/wood/strategy", { method: "POST", body: JSON.stringify(body) });
}

export function scheduleWood(tier) {
  return request(`/api/wood/schedule/${encodeURIComponent(tier)}`);
}

export function marketCategories() {
  return request("/api/market/categories");
}

export function marketOpportunities(body) {
  return request("/api/market/opportunities", { method: "POST", body: JSON.stringify(body) });
}
