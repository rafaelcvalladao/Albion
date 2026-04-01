import { fetchHistory, fetchPrices } from "./albionClient.js";

export const NIVEIS = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"];

const FOCO_BASE = { T4: 41, T5: 103, T6: 257, T7: 643, T8: 1607 };
const FAMA_BASE = { T4: 22, T5: 56, T6: 140, T7: 350, T8: 875 };
const MULT_ENCHANT = [1, 1.5, 2.5, 5, 10];

const LOCATIONS = {
  wood: ["Lymhurst", "FortSterling"],
  fiber: ["Lymhurst", "FortSterling"],
  leather: ["Lymhurst", "FortSterling"],
  metal: ["Lymhurst", "FortSterling"],
  stone: ["Lymhurst", "FortSterling"],
};

const MATERIAL_CONFIG = {
  wood: {
    raw: "WOOD",
    refined: "PLANKS",
    label: "Madeira → Tábuas",
    locations: ["Lymhurst", "FortSterling"],
  },
  fiber: {
    raw: "FIBER",
    refined: "CLOTH",
    label: "Fibra → Tecido",
    locations: ["Lymhurst", "FortSterling"],
  },
  leather: {
    raw: "HIDE",
    refined: "LEATHER",
    label: "Pelego → Couro",
    locations: ["Lymhurst", "FortSterling"],
  },
  metal: {
    raw: "ORE",
    refined: "METAL", 
    label: "Minério → Barras de Metal",
    locations: ["Lymhurst", "FortSterling"],
  },
  stone: {
    raw: "ROCK",
    refined: "STONEBLOCK",
    label: "Pedra → Bloco de Pedra",
    locations: ["Lymhurst", "FortSterling"],
  },
};

function famaRefinoPorCraft(tSel, idxN) {
  const base = FAMA_BASE[tSel] ?? 22;
  const mult = MULT_ENCHANT[idxN] ?? 1;
  return Math.round(base * mult);
}

export function calcularRrrManual(foco, bonusCity) {
  if (bonusCity) return foco ? 0.539 : 0.367;
  return foco ? 0.435 : 0.152;
}

export function obterParametrosTabela(t, enc) {
  const dT = {
    T4: [2, 0.9375],
    T5: [3, 1.875],
    T6: [4, 3.75],
    T7: [5, 7.5],
    T8: [5, 15],
  };
  const [q, n] = dT[t] || [2, 1];
  const m = { ".0": 1, ".1": 2, ".2": 4, ".3": 8, ".4": 16 }[enc] || 1;
  return [q, n * m];
}

function specTotalPrata(specVars) {
  const keys = ["t4", "t5", "t6", "t7", "t8"];
  return keys.reduce((sum, k) => sum + (parseInt(String(specVars[k] ?? "0"), 10) || 0) * 30, 0);
}

function buildIdsForTier(tSel, materialType) {
  const cfg = MATERIAL_CONFIG[materialType] || MATERIAL_CONFIG.wood;
  const tNum = parseInt(tSel.slice(1), 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : "T3";
  const ids = [];
  const refinedIds = [];
  for (const n of NIVEIS) {
    ids.push(`${tSel}_${cfg.raw}${n}`, `${tSel}_${cfg.refined}${n}`, tAnt === "T3" ? `${tAnt}_${cfg.refined}` : `${tAnt}_${cfg.refined}${n}`);
    refinedIds.push(`${tSel}_${cfg.refined}${n}`);
  }
  return { tAnt, ids, refinedIds };
}

async function processarGenerico(
  tSel,
  taxaNpc,
  spec,
  buyOrder,
  foco,
  bonusFortSterling,
  materialType
) {
  const cfg = MATERIAL_CONFIG[materialType] || MATERIAL_CONFIG.wood;
  const { ids, refinedIds } = buildIdsForTier(tSel, materialType);

  const priceData = await fetchPrices(ids, cfg.locations);
  const historyData = await fetchHistory(refinedIds, cfg.locations.includes("Lymhurst") ? "Lymhurst" : cfg.locations[0], 24);

  const precoMap = {};
  for (const p of priceData) {
    const { item_id: id, city, sell_price_min, buy_price_max } = p;
    if (!precoMap[city]) precoMap[city] = {};
    precoMap[city][id] = { sell: sell_price_min, buy: buy_price_max };
  }

  const volume24h = {};
  for (const h of historyData) {
    if (h.data && h.data.length) {
      const total = h.data.reduce((s, d) => s + (d.item_count || 0), 0);
      volume24h[h.item_id] = total;
    }
  }

  const rows = [];
  for (let i = 0; i < NIVEIS.length; i++) {
    const n = NIVEIS[i];
    const nivel = tSel + n.replace("_", "").replace("@", ".");

    const rawId = `${tSel}_${cfg.raw}${n}`;
    const refinedId = `${tSel}_${cfg.refined}${n}`;
    const tNum = parseInt(tSel.slice(1), 10);
    const tAnt = tNum > 4 ? `T${tNum - 1}` : "T3";
    const antLevel = tNum === 4 ? "" : n;
    const antRefinedId = tAnt === "T3" ? `${tAnt}_${cfg.refined}` : `${tAnt}_${cfg.refined}${antLevel}`;

    const rrrVal = calcularRrrManual(foco, bonusFortSterling);
    const specVal = parseInt(spec[`t${tNum}`] ?? "0", 10) || 0;
    const rrrValAjustado = rrrVal + specVal / 100;

    const precoRaw = precoMap[bonusFortSterling ? "FortSterling" : "Lymhurst"]?.[rawId]?.sell || 0;
    const precoRefined = precoMap[bonusFortSterling ? "FortSterling" : "Lymhurst"]?.[refinedId]?.sell || 0;
    const precoAntRefined = precoMap[bonusFortSterling ? "FortSterling" : "Lymhurst"]?.[antRefinedId]?.sell || 0;

    const [qtRaw, qtAntRefined] = obterParametrosTabela(tSel, n.replace("_LEVEL", ".").replace("@", ""));
    const precoCompra = precoRaw * qtRaw + (precoAntRefined || 0) * qtAntRefined;
    const precoVenda = precoRefined * (1 - (taxaNpc / 100));

    const lucro = precoVenda - precoCompra;
    const rrr = calcularRrrManual(foco, bonusFortSterling);
    const fama = famaRefinoPorCraft(tSel, i);

    rows.push({
      nivel,
      precoRaw,
      qtRaw,
      precoAntRefined,
      precoRefined,
      precoCompra,
      precoVenda,
      lucro: Math.max(0, lucro),
      rrr: Math.round(rrr * 100),
      rrrPercent: (rrr * 100).toFixed(1),
      fama,
      volumeFs24h: volume24h[refinedId] || 0,
      strategy: lucro > 0 ? "Refinar" : "Vender bruto",
    });
  }

  return {
    material: materialType,
    tier: tSel,
    rows,
    rrrPercent: (calcularRrrManual(foco, bonusFortSterling) * 100).toFixed(1),
    strategy: "Refinar",
  };
}

export async function processarMaterial(body, materialType) {
  const {
    tier = "T6",
    taxaNpc = "800",
    spec = {},
    buyOrder = false,
    foco = false,
    bonusFortSterling = true,
  } = body;

  return await processarGenerico(
    tier,
    parseInt(taxaNpc),
    spec,
    buyOrder,
    foco,
    bonusFortSterling,
    materialType
  );
}

export async function processarWood(body) {
  return await processarMaterial(body, "wood");
}

export async function processarFiber(body) {
  return await processarMaterial(body, "fiber");
}

export async function processarLeather(body) {
  return await processarMaterial(body, "leather");
}

export async function processarMetal(body) {
  return await processarMaterial(body, "metal");
}

export async function processarStone(body) {
  return await processarMaterial(body, "stone");
}

// Funções auxiliares para strategy e schedule (simplificadas por agora)
export async function estrategiaCompleta(body) {
  // Placeholder - pode ser expandido
  return { top7: [], error: null };
}

export async function horariosUtc(tier) {
  // Placeholder - pode ser expandido
  return { schedule: [] };
}
