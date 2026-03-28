import express from "express";
import cors from "cors";
import { buscarOportunidades, CATEGORIAS } from "./marketService.js";
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
app.get("/api/market/categories", (_req, res) => {
  res.json({ categories: Object.keys(CATEGORIAS) });
});

/** Arbitragem entre cidades seguras */
app.post("/api/market/opportunities", async (req, res) => {
  try {
    const { categoria, maxIdadeHoras } = req.body || {};
    if (!categoria || !CATEGORIAS[categoria]) {
      return res.status(400).json({ error: "Categoria inválida ou em falta." });
    }
    const oportunidades = await buscarOportunidades({
      categoria,
      maxIdadeHoras: maxIdadeHoras ?? 6,
    });
    res.json({ oportunidades });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`API REST em http://localhost:${PORT}`);
});
