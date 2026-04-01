import { fetchHistory, fetchPrices } from "./albionClient.js";

export const NIVEIS = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"];

const FOCO_BASE = { T4: 41, T5: 103, T6: 257, T7: 643, T8: 1607 };
const FAMA_BASE = { T4: 22, T5: 56, T6: 140, T7: 350, T8: 875 };
const MULT_ENCHANT = [1, 1.5, 2.5, 5, 10];

const LOCATIONS_FIBER = ["Lymhurst", "FortSterling"];

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
  return dT[t] ?? [2, 0.9375];
}

function buildIdsForTier(tSel) {
  const tNum = parseInt(tSel.slice(1), 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : "T3";
  const ids = [];
  const clothIds = [];
  for (const n of NIVEIS) {
    ids.push(`${tSel}_FIBER${n}`, `${tSel}_CLOTH${n}`, tAnt === "T3" ? `${tAnt}_CLOTH` : `${tAnt}_CLOTH${n}`);
    clothIds.push(`${tSel}_CLOTH${n}`);
  }
  return { tAnt, ids, clothIds };
}

function volumeMapFromHistory(hist) {
  const volMap = new Map();
  for (const entry of hist) {
    const cid = entry.location;
    const it = entry.item_id;
    const totalVol = entry.data ? entry.data.reduce((s, d) => s + (d.item_count || 0), 0) : 0;
    volMap.set(`${cid}|${it}`, totalVol);
  }
  return volMap;
}

function convertToUTC3(isoDate) {
  if (!isoDate) return null;
  const dateStr = String(isoDate);
  if (dateStr.includes("0001")) return null;
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCHours(d.getUTCHours() - 3);
    return d.toISOString();
  } catch {
    return null;
  }
}

function specTotalPrata(spec) {
  const s = spec || {};
  const v = [s.t4, s.t5, s.t6, s.t7, s.t8];
  return v.reduce((total, val) => total + parseFloat(String(val ?? "0").trim() || "0"), 0);
}

function getVol(volMap, city, item) {
  return volMap.get(`${city}|${item}`) ?? 0;
}

export async function processarFiber(body = {}) {
  const {
    tier: tRaw = "T6",
    taxaNpc: taxaRaw,
    spec = {},
    buyOrder = false,
    foco = false,
    bonusFortSterling = true,
  } = body;

  let txU = parseFloat(String(taxaRaw ?? "800").trim() || "800");
  if (Number.isNaN(txU)) txU = 800;

  const rrr = calcularRrrManual(foco, bonusFortSterling);
  const { tAnt, ids, clothIds } = buildIdsForTier(tRaw);

  const res = await fetchPrices(ids, LOCATIONS_FIBER);
  const hist = await fetchHistory(clothIds, LOCATIONS_FIBER, 24);
  const volMap = volumeMapFromHistory(hist);

  let lastUpdated = null;
  for (const p of res) {
    const d = p.sell_price_min_date ? new Date(p.sell_price_min_date) : null;
    if (d && !Number.isNaN(d.getTime())) {
      if (!lastUpdated || d > lastUpdated) lastUpdated = d;
    }
  }

  const dc = new Map();
  const dv = new Map();
  const dt = new Map();
  const dvt = new Map();
  
  for (const p of res) {
    const key = `${p.city}|${p.item_id}`;
    const valBuy = p.buy_price_max;
    const valSell = p.sell_price_min;
    if (valSell > 0) {
      dc.set(key, buyOrder && valBuy > 0 ? valBuy : valSell);
      let dateToStore = null;
      if (buyOrder && valBuy > 0) {
        dateToStore = convertToUTC3(p.buy_price_max_date);
      } else {
        dateToStore = convertToUTC3(p.sell_price_min_date);
      }
      dt.set(key, dateToStore);
    }
    if (valSell > 0) {
      dv.set(key, valSell);
      dvt.set(key, convertToUTC3(p.sell_price_min_date));
    }
  }

  const getDc = (city, item) => dc.get(`${city}|${item}`) ?? 0;
  const getDv = (city, item) => dv.get(`${city}|${item}`) ?? 0;
  const getDt = (city, item) => dt.get(`${city}|${item}`) ?? null;
  const getDvt = (city, item) => dvt.get(`${city}|${item}`) ?? null;

  const rows = [];
  const spTotal = specTotalPrata(spec);

  for (let idxN = 0; idxN < NIVEIS.length; idxN++) {
    const n = NIVEIS[idxN];
    const enc = n ? n.split("@")[0].replace("_LEVEL", ".") : ".0";
    const [qt, fat] = obterParametrosTabela(tRaw, enc);
    const txF = (txU / 100) * fat;

    const iT = ids[idxN * 3];
    const iP = ids[idxN * 3 + 1];
    const iA = ids[idxN * 3 + 2];

    const lh = [getDc("Lymhurst", iT), getDc("Lymhurst", iA), getDv("Lymhurst", iP)];
    const ft = [getDc("Fort Sterling", iT), getDc("Fort Sterling", iA), getDv("Fort Sterling", iP)];

    function getV(t, a, v) {
      if (t && a && v) return v - ((t * qt + a) * (1 - rrr) + txF);
      return -9e8;
    }

    const lLh = getV(...lh);
    const lFt = getV(...ft);
    const mT = lh[0] && ft[0] ? Math.min(lh[0], ft[0]) : lh[0] || ft[0];
    const mA = lh[1] && ft[1] ? Math.min(lh[1], ft[1]) : lh[1] || ft[1];
    const mV = lh[2] && ft[2] ? Math.max(lh[2], ft[2]) : lh[2] || ft[2];
    const lOt = getV(mT, mA, mV);
    const melhor = Math.max(lLh, lFt, lOt);

    const fBase = FOCO_BASE[tRaw] ?? 250;
    const multNivel = [1, 1.5, 2.5, 5, 10][idxN];
    const fReal = fBase * multNivel * 0.5 ** (spTotal / 10000);

    const famaRefino = famaRefinoPorCraft(tRaw, idxN);

    const row = {
      nivel: `${tRaw}${enc}`,
      enc,
      qtFiber: qt,
      famaRefino,
      volumeFs24h: getVol(volMap, "Fort Sterling", iP),
      lymhurst: {
        fiber: lh[0],
        fiberDate: getDt("Lymhurst", iT),
        clothAnt: lh[1],
        clothAntDate: getDt("Lymhurst", iA),
        cloth: lh[2],
        clothDate: getDvt("Lymhurst", iP),
        lucro: lLh,
      },
      fortSterling: {
        fiber: ft[0],
        fiberDate: getDt("Fort Sterling", iT),
        clothAnt: ft[1],
        clothAntDate: getDt("Fort Sterling", iA),
        cloth: ft[2],
        clothDate: getDvt("Fort Sterling", iP),
        lucro: lFt,
      },
      otimizado: lOt,
      lucro: melhor,
      rrr: (rrr * 100).toFixed(1),
      foco: fReal > 0 ? { unidades: fReal, prataPorFoco: melhor / fReal } : undefined,
    };
    rows.push(row);
  }

  const maxLucro = Math.max(...rows.map((r) => r.lucro || -Infinity));
  let strategy = "Vender bruto";
  if (rows.some((r) => r.lucro > 0)) strategy = "Refinar e vender";

  const rrrPercent = (rrr * 100).toFixed(1);

  return {
    material: "fiber",
    tier: tRaw,
    strategy,
    rrrPercent,
    rows,
  };
}

export async function estrategiaCompleataFiber(body = {}) {
  return { top7: [] };
}

export async function horariosUtcFiber(tier) {
  return { schedule: [] };
}
