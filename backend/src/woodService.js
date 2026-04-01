import { fetchHistory, fetchPrices } from "./albionClient.js";

export const NIVEIS = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"];

const FOCO_BASE = { T4: 41, T5: 103, T6: 257, T7: 643, T8: 1607 };
/** Fama base por craft (refino madeira → tábuas), por tier .0 — multiplicador de enchant igual ao foco. */
const FAMA_BASE = { T4: 22, T5: 56, T6: 140, T7: 350, T8: 875 };
const MULT_ENCHANT = [1, 1.5, 2.5, 5, 10];

const LOCATIONS_WOOD = ["FortSterling"];

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

function buildIdsForTier(tSel) {
  const tNum = parseInt(tSel.slice(1), 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : "T3";
  const ids = [];
  const plankIds = [];
  for (const n of NIVEIS) {
    ids.push(`${tSel}_WOOD${n}`, `${tSel}_PLANKS${n}`, tAnt === "T3" ? `${tAnt}_PLANKS` : `${tAnt}_PLANKS${n}`);
    plankIds.push(`${tSel}_PLANKS${n}`);
  }
  return { tAnt, ids, plankIds };
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
    // Converter de UTC para UTC-3: subtrair 3 horas
    d.setUTCHours(d.getUTCHours() - 3);
    // Retorna em ISO UTC-3 (que ainda tem o Z, mas representa UTC-3)
    return d.toISOString();
  } catch {
    return null;
  }
}

function convertUTCToUTC3Display(isoDateUTC3) {
  // Recebe data já em UTC-3 (ISO format), converte apenas para objeto Date para exibição
  if (!isoDateUTC3) return null;
  try {
    const d = new Date(isoDateUTC3);
    if (Number.isNaN(d.getTime())) return null;
    // Como a data já está em UTC-3 (representada com Z mas -3h), apenas retorna como está
    return d;
  } catch {
    return null;
  }
}

function getVol(volMap, city, itemId) {
  return volMap.get(`${city}|${itemId}`) ?? 0;
}

export async function processarWood(body) {
  const {
    tier: tSel,
    taxaNpc: taxaRaw,
    spec = {},
    buyOrder = false,
    foco = false,
  } = body;

  let txU = parseFloat(String(taxaRaw ?? "800").trim() || "800");
  if (Number.isNaN(txU)) txU = 800;

  const rrr = calcularRrrManual(foco, true);
  const { tAnt, ids, plankIds } = buildIdsForTier(tSel);

  const res = await fetchPrices(ids, LOCATIONS_WOOD);
  const hist = await fetchHistory(plankIds, LOCATIONS_WOOD, 24);
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
  const dt = new Map(); // Timestamps para compra (buy_price_max_date ou sell_price_min_date) - convertidos para UTC-3
  const dvt = new Map(); // Timestamps para venda (sell_price_min_date) - convertidos para UTC-3
  
  for (const p of res) {
    const key = `${p.city}|${p.item_id}`;
    const valBuy = p.buy_price_max;
    const valSell = p.sell_price_min;
    // Para compra: usa buy_price_max se disponível E buyOrder=true, senão usa sell_price_min
    if (valSell > 0) {
      dc.set(key, buyOrder && valBuy > 0 ? valBuy : valSell);
      // Armazena timestamp convertido para UTC-3
      let dateToStore = null;
      if (buyOrder && valBuy > 0) {
        dateToStore = convertToUTC3(p.buy_price_max_date);
      } else {
        dateToStore = convertToUTC3(p.sell_price_min_date);
      }
      dt.set(key, dateToStore);
    }
    // Para venda: sempre usa sell_price_min
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
    const [qt, fat] = obterParametrosTabela(tSel, enc);
    const txF = (txU / 100) * fat;

    const iT = ids[idxN * 3];
    const iP = ids[idxN * 3 + 1];
    const iA = ids[idxN * 3 + 2];

    const ft = [getDc("Fort Sterling", iT), getDc("Fort Sterling", iA), getDv("Fort Sterling", iP)];

    function getV(t, a, v) {
      if (t && a && v) return v - ((t * qt + a) * (1 - rrr) + txF);
      return -9e8;
    }

    const lFt = getV(...ft);

    const fBase = FOCO_BASE[tSel] ?? 250;
    const multNivel = [1, 1.5, 2.5, 5, 10][idxN];
    const fReal = fBase * multNivel * 0.5 ** (spTotal / 10000);

    const famaRefino = famaRefinoPorCraft(tSel, idxN);

    const row = {
      nivel: `${tSel}${enc}`,
      enc,
      qtTronco: qt,
      famaRefino,
      volumeFs24h: getVol(volMap, "Fort Sterling", iP),
      fortSterling: {
        tronco: ft[0],
        troncoDate: getDt("Fort Sterling", iT),
        tabuaAnt: ft[1],
        tabuaAntDate: getDt("Fort Sterling", iA),
        tabua: ft[2],
        tauaDate: getDvt("Fort Sterling", iP),
        lucro: lFt,
      },
      otimizado: lFt,
      melhorLucro: lFt,
    };

    if (lOt > -8e8 && foco) {
      row.foco = {
        unidades: fReal,
        prataPorFoco: lOt / fReal,
      };
    }
    rows.push(row);
  }

  return {
    tier: tSel,
    strategy: buyOrder ? "BUY ORDER" : "SELL ORDER",
    rrr,
    rrrPercent: rrr * 100,
    taxaNpc: txU,
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    rows,
  };
}

export async function estrategiaCompleta(body) {
  const {
    taxaNpc: taxaRaw,
    spec = {},
    buyOrder = false,
  } = body;

  let taxaU = parseFloat(String(taxaRaw ?? "800").trim() || "800");
  if (Number.isNaN(taxaU)) taxaU = 800;

  const specTotal = specTotalPrata(spec);
  const niveis = NIVEIS;

  const allIds = [];
  const plankIds = [];
  for (const t of ["T4", "T5", "T6", "T7", "T8"]) {
    const tAnt = parseInt(t[1], 10) > 4 ? `T${parseInt(t[1], 10) - 1}` : "T3";
    for (const n of niveis) {
      allIds.push(`${t}_WOOD${n}`, `${t}_PLANKS${n}`, tAnt === "T3" ? `${tAnt}_PLANKS` : `${tAnt}_PLANKS${n}`);
      plankIds.push(`${t}_PLANKS${n}`);
    }
  }

  const res = await fetchPrices([...new Set(allIds)], LOCATIONS_WOOD);
  const hist = await fetchHistory([...new Set(plankIds)], LOCATIONS_WOOD, 24);
  const volData = volumeMapFromHistory(hist);

  const dc = new Map();
  const dv = new Map();
  for (const p of res) {
    const key = `${p.city}|${p.item_id}`;
    const val = buyOrder && p.buy_price_max > 0 ? p.buy_price_max : p.sell_price_min;
    if (val > 0) dc.set(key, val);
    if (p.sell_price_min > 0) dv.set(key, p.sell_price_min);
  }

  const getDc = (c, it) => dc.get(`${c}|${it}`) ?? 0;
  const getDv = (c, it) => dv.get(`${c}|${it}`) ?? 0;

  const fsFoco = [];
  const fsFama = [];

  for (const t of ["T4", "T5", "T6", "T7", "T8"]) {
    const tAnt = parseInt(t[1], 10) > 4 ? `T${parseInt(t[1], 10) - 1}` : "T3";
    for (let idxN = 0; idxN < niveis.length; idxN++) {
      const n = niveis[idxN];
      const enc = n ? n.split("@")[0].replace("_LEVEL", ".") : ".0";
      const [qt, fat] = obterParametrosTabela(t, enc);
      const txF = (taxaU / 100) * fat;

      const iT = `${t}_WOOD${n}`;
      const iP = `${t}_PLANKS${n}`;
      const iA = tAnt === "T3" ? `${tAnt}_PLANKS` : `${tAnt}_PLANKS${n}`;

      const fsT = getDc("Fort Sterling", iT);
      const fsA = getDc("Fort Sterling", iA);
      const fsP = getDv("Fort Sterling", iP);

      const vFs = getVol(volData, "Fort Sterling", iP);

      const rrrFoco = calcularRrrManual(true, true);
      const rrrFama = calcularRrrManual(false, true);
      const fBase = FOCO_BASE[t] ?? 250;
      const fReal = fBase * [1, 1.5, 2.5, 5, 10][idxN] * 0.5 ** (specTotal / 10000);
      const fama = famaRefinoPorCraft(t, idxN);

      if (fsT && fsA && fsP) {
        fsFoco.push({
          item: `${t}${enc}`,
          lucro: (fsP - ((fsT * qt + fsA) * (1 - rrrFoco) + txF)) / fReal,
          volume: vFs,
        });
        const lucroBrutoFamaLocal = fsP - ((fsT * qt + fsA) * (1 - rrrFama) + txF);
        fsFama.push({
          item: `${t}${enc}`,
          fama,
          famaPerPrata: Math.abs(lucroBrutoFamaLocal) > 0 ? fama / Math.abs(lucroBrutoFamaLocal) : 0,
          lucro: lucroBrutoFamaLocal,
          volume: vFs,
        });
      }
    }
  }

  const sortDesc = (a, b) => b.lucro - a.lucro;
  const sortDescFama = (a, b) => b.fama - a.fama;
  const top = (arr, n = 15) => [...arr].sort(sortDesc).slice(0, n);
  const topFama = (arr, n = 15) => [...arr].sort(sortDescFama).slice(0, n);

  return {
    fsLocalFoco: top(fsFoco),
    fsLocalFama: topFama(fsFama),
    fsLocalFamaAll: fsFama,
  };
}

export async function horariosUtc(tier) {
  const tSel = tier || "T6";
  const tNum = parseInt(tSel[1], 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : "T3";
  const ids = [];
  for (const n of NIVEIS) {
    ids.push(`${tSel}_WOOD${n}`, `${tSel}_PLANKS${n}`, tAnt === "T3" ? `${tAnt}_PLANKS` : `${tAnt}_PLANKS${n}`);
  }

  const res = await fetchPrices(ids, LOCATIONS_WOOD);
  const checkDict = new Map();
  for (const p of res) {
    const dateUTC = convertToUTC3(p.sell_price_min_date);
    if (dateUTC) {
      checkDict.set(`${p.city}|${p.item_id}`, dateUTC);
    }
  }

  function fmt(city, itemId) {
    const f = checkDict.get(`${city}|${itemId}`);
    if (!f) return "---";
    // f já está em UTC-3: "2024-03-31T11:30:00.000Z" (mas representa UTC-3)
    return `${f.slice(8, 10)}/${f.slice(5, 7)} ${f.slice(11, 16)}`;
  }

  const blocos = [];
  for (let idx = 0; idx < NIVEIS.length; idx++) {
    const n = NIVEIS[idx];
    const enc = n ? n.split("@")[0].replace("_LEVEL", ".") : ".0";
    const iT = ids[idx * 3];
    const iP = ids[idx * 3 + 1];
    const iA = ids[idx * 3 + 2];
    blocos.push({
      titulo: `MADEIRA ${tSel}${enc}`,
      enc,
      cities: [
        {
          city: "Lymhurst",
          tronco: fmt("Lymhurst", iT),
          tabuaAnt: fmt("Lymhurst", iA),
          tabuaSell: fmt("Lymhurst", iP),
        },
        {
          city: "Fort Sterling",
          tronco: fmt("Fort Sterling", iT),
          tabuaAnt: fmt("Fort Sterling", iA),
          tabuaSell: fmt("Fort Sterling", iP),
        },
      ],
    });
  }

  return { tier: tSel, blocos };
}
