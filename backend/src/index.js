import express from "express";
import cors from "cors";
import { buscarOportunidades, CATEGORIAS, obterCategoriasDinamicas } from "./marketService.js";
import { estrategiaCompleta, horariosUtc, processarWood } from "./woodService.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "calculadora-albion-api" });
});

/** Refino de madeira — resultado principal */
app.post("/api/wood/calculate", async (req, res) => {
  try {
    const data = await processarWood(req.body || {});
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Top 7 estratégia completa (global / FS local) */
app.post("/api/wood/strategy", async (req, res) => {
  try {
    const data = await estrategiaCompleta(req.body || {});
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Últimas atualizações UTC por item (tier selecionado) */
app.get("/api/wood/schedule/:tier", async (req, res) => {
  try {
    const data = await horariosUtc(req.params.tier);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Categorias disponíveis para o analisador de mercado */
app.get("/api/market/categories", async (_req, res) => {
  try {
    const categories = await obterCategoriasDinamicas();
    console.log(`[/api/market/categories] Retornando ${categories.length} categorias: ${categories.slice(0, 5).join(", ")}...`);
    res.json({ categories });
  } catch (e) {
    console.error("[/api/market/categories] Erro ao obter categorias:", e);
    // Fallback para categorias estáticas
    const staticCats = Object.keys(CATEGORIAS);
    console.log(`[/api/market/categories] Fallback para ${staticCats.length} categorias estáticas`);
    res.json({ categories: staticCats });
  }
});

/** Arbitragem entre cidades seguras */
app.post("/api/market/opportunities", async (req, res) => {
  try {
    const {
      categoria = 'Consumível',
      offset = 0,
      step = 1500,
      maxIdadeHoras = 24, // Aumentado para 24h
      quality = 1,
      usarBuyOrder = false,
      taxaVenda = 6.5,
    } = req.body;

    console.log(`[/api/market/opportunities] Solicitado: categoria="${categoria}", offset=${offset}, step=${step}`);

    const resultados = await buscarOportunidades({
      categoria,
      offset,
      step,
      maxIdadeHoras,
      quality,
      usarBuyOrder,
      taxaVenda,
      maxItensProcessar: 999999,
    });

    console.log(`[/api/market/opportunities] Retornando ${resultados.length} oportunidades`);
    res.json({ oportunidades: resultados });
  } catch (erro) {
    console.error('[/api/market/opportunities] Erro:', erro);
    res.status(500).json({ 
      erro: erro.message || 'Erro ao buscar oportunidades' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`API REST em http://localhost:${PORT}`);
});
