import express from 'express';
import cors from 'cors';
import {
  buscarOportunidades,
  buscarOportunidadesStream,
  buscarVolumeParaItens,
  CATEGORIAS,
  obterCategoriasDinamicas,
} from './marketService.js';
import {
  processarWood,
  estrategiaCompleta,
  horariosUtc,
  processarFiber,
  estrategiaCompletaFiber,
  processarLeather,
  estrategiaCompletaLeather,
  processarMetal,
  estrategiaCompletaMetal,
  processarStone,
  estrategiaCompleteStone,
} from './refiningService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'xabufael';

/** Wrapper: try/catch + log + 500 automático */
const wrap = (fn) => async (req, res) => {
  try {
    const data = await fn(req, res);
    if (data !== undefined) res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'calculadora-albion-api' });
});

/** Validação de token de acesso */
app.post('/api/auth/validate', (req, res) => {
  const { token } = req.body || {};
  if (typeof token === 'string' && token === ACCESS_TOKEN) {
    return res.json({ valid: true });
  }
  res.status(401).json({ valid: false, error: 'Token inválido' });
});

// ─── Rotas de refino (calculate + strategy) ───

const refiningRoutes = [
  { path: 'wood', calcFn: processarWood, stratFn: estrategiaCompleta },
  { path: 'fiber', calcFn: processarFiber, stratFn: estrategiaCompletaFiber },
  { path: 'leather', calcFn: processarLeather, stratFn: estrategiaCompletaLeather },
  { path: 'metal', calcFn: processarMetal, stratFn: estrategiaCompletaMetal },
  { path: 'stone', calcFn: processarStone, stratFn: estrategiaCompleteStone },
];

for (const { path, calcFn, stratFn } of refiningRoutes) {
  app.post(
    `/api/${path}/calculate`,
    wrap((req) => calcFn(req.body || {})),
  );
  app.post(
    `/api/${path}/strategy`,
    wrap((req) => stratFn(req.body || {})),
  );
}

/** Últimas atualizações UTC por item (tier selecionado) — só wood por enquanto */
app.get(
  '/api/wood/schedule/:tier',
  wrap((req) => horariosUtc(req.params.tier)),
);

/** Categorias disponíveis para o analisador de mercado */
app.get('/api/market/categories', async (_req, res) => {
  try {
    const categories = await obterCategoriasDinamicas();
    console.log(
      `[/api/market/categories] Retornando ${categories.length} categorias: ${categories.slice(0, 5).join(', ')}...`,
    );
    res.json({ categories });
  } catch (e) {
    console.error('[/api/market/categories] Erro ao obter categorias:', e);
    const staticCats = Object.keys(CATEGORIAS);
    console.log(`[/api/market/categories] Fallback para ${staticCats.length} categorias estáticas`);
    res.json({ categories: staticCats });
  }
});

/** Arbitragem entre cidades seguras */
app.post(
  '/api/market/opportunities',
  wrap(async (req) => {
    const {
      categoria = 'Consumível',
      offset = 0,
      step = 1500,
      maxIdadeHoras = 168,
      quality = 0,
      usarBuyOrder = false,
      taxaVenda = 6.5,
      tier = 'Todos',
      enchantment = 'Todos',
    } = req.body;

    console.log(
      `[/api/market/opportunities] Solicitado: categoria="${categoria}", tier="${tier}", enchantment="${enchantment}", offset=${offset}, step=${step}`,
    );

    const resultados = await buscarOportunidades({
      categoria,
      offset,
      step,
      maxIdadeHoras,
      quality,
      usarBuyOrder,
      taxaVenda,
      maxItensProcessar: 999999,
      tier,
      enchantment,
    });

    console.log(`[/api/market/opportunities] Retornando ${resultados.length} oportunidades`);
    return { oportunidades: resultados };
  }),
);

/** SSE Streaming de oportunidades de arbitragem */
app.get('/api/market/opportunities/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const {
    categoria = 'Consumível',
    tier = 'Todos',
    enchantment = 'Todos',
    quality = '0',
    maxIdadeHoras = '168',
    taxaVenda = '6.5',
  } = req.query;

  console.log(
    `[SSE] Stream iniciado: categoria="${categoria}", tier="${tier}", enchantment="${enchantment}"`,
  );

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  try {
    await buscarOportunidadesStream(
      {
        categoria,
        tier,
        enchantment,
        quality: parseInt(quality) || 0,
        maxIdadeHoras: parseInt(maxIdadeHoras) || 168,
        taxaVenda: parseFloat(taxaVenda) || 6.5,
      },
      (event) => {
        if (closed) return;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
    );
  } catch (err) {
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    }
    console.error('[SSE] Erro:', err);
  }

  if (!closed) res.end();
});

/** Busca volume diário para uma lista de itens (lazy) */
app.post(
  '/api/market/volume',
  wrap(async (req) => {
    const { itemIds } = req.body || {};
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return { volumes: {} };
    }
    const ids = itemIds.slice(0, 500);
    const volumes = await buscarVolumeParaItens(ids);
    return { volumes };
  }),
);

app.listen(PORT, () => {
  console.log(`API REST em http://localhost:${PORT}`);
});
