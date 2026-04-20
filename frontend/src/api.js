export function equipBuyOptions({ equipamentoNome, nivelEfetivo, qualidade, cidadeDestino }) {
  return request('/api/equipbuy/options', {
    method: 'POST',
    body: JSON.stringify({ equipamentoNome, nivelEfetivo, qualidade, cidadeDestino }),
  });
}
/**
 * URL base do backend (ex.: https://api.exemplo.com).
 * Definir em build/runtime via `VITE_API_BASE` (Vite injeta em `import.meta.env`).
 * Sem barra final. Vazio em dev: pedidos a `/api/...` usam o proxy do Vite.
 */
function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE;
  if (raw == null || raw === '') return '';
  return String(raw).trim().replace(/\/+$/, '');
}

const base = getApiBase();

async function request(path, options = {}) {
  const fullUrl = `${base}${path}`;

  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

function createResourceFns(resource) {
  return {
    calculate: (body) =>
      request(`/api/${resource}/calculate`, { method: 'POST', body: JSON.stringify(body) }),
    strategy: (body) =>
      request(`/api/${resource}/strategy`, { method: 'POST', body: JSON.stringify(body) }),
  };
}

export const wood = createResourceFns('wood');
export const fiber = createResourceFns('fiber');
export const leather = createResourceFns('leather');
export const metal = createResourceFns('metal');
export const stone = createResourceFns('stone');

// Aliases individuais para compatibilidade
export const calculateWood = wood.calculate;
export const strategyWood = wood.strategy;
export const calculateFiber = fiber.calculate;
export const strategyFiber = fiber.strategy;
export const calculateLeather = leather.calculate;
export const strategyLeather = leather.strategy;
export const calculateMetal = metal.calculate;
export const strategyMetal = metal.strategy;
export const calculateStone = stone.calculate;
export const strategyStone = stone.strategy;

export function marketCategories() {
  return request('/api/market/categories');
}

export function marketOpportunities(body) {
  return request('/api/market/opportunities', { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Streaming de oportunidades via SSE.
 * Retorna { abort } para cancelar o stream.
 * Callbacks: onChunk(oportunidades[]), onProgress({processados, totalItens}), onDone(), onError(msg)
 */
export function marketOpportunitiesStream(params, { onChunk, onProgress, onDone, onError }) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')),
  ).toString();

  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${base}/api/market/opportunities/stream?${qs}`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream' },
      });

      if (!res.ok) {
        const text = await res.text();
        onError?.(text || `HTTP ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          let event;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'chunk') {
            onChunk?.(event.oportunidades || []);
            onProgress?.({ processados: event.processados, totalItens: event.totalItens });
          } else if (event.type === 'progress') {
            onProgress?.({ processados: event.processados, totalItens: event.totalItens });
          } else if (event.type === 'start') {
            onProgress?.({ processados: 0, totalItens: event.totalItens });
          } else if (event.type === 'done') {
            onDone?.();
          } else if (event.type === 'error') {
            onError?.(event.message);
          }
        }
      }
      // Se o buffer ainda tiver dados restantes
      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          if (event.type === 'done') onDone?.();
        } catch {
          /* ignorar */
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message || String(err));
      }
    }
  })();

  return { abort: () => controller.abort() };
}

export function marketVolume(itemIds) {
  return request('/api/market/volume', { method: 'POST', body: JSON.stringify({ itemIds }) });
}

export function validateToken(token) {
  return request('/api/auth/validate', { method: 'POST', body: JSON.stringify({ token }) });
}
