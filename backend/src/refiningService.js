import { fetchHistory, fetchPrices } from './albionClient.js';

// ─── Constantes compartilhadas ───

export const NIVEIS = ['', '_LEVEL1@1', '_LEVEL2@2', '_LEVEL3@3', '_LEVEL4@4'];

const FOCO_BASE = { T4: 41, T5: 103, T6: 257, T7: 643, T8: 1607 };
const FAMA_BASE = { T4: 22, T5: 56, T6: 140, T7: 350, T8: 875 };
const MULT_ENCHANT = [1, 1.5, 2.5, 5, 10];

// ─── Configuração por recurso ───

const RESOURCE_CONFIGS = {
  wood: {
    locations: ['FortSterling', 'Lymhurst'],
    rawSuffix: '_WOOD',
    refinedSuffix: '_PLANKS',
    cityKey: 'fortSterling',
    cityName: 'Fort Sterling',
    cities: [
      { key: 'fortSterling', name: 'Fort Sterling' },
      { key: 'lymhurst', name: 'Lymhurst' },
    ],
    scheduleLabel: 'MADEIRA',
  },
  fiber: {
    locations: ['Lymhurst'],
    rawSuffix: '_FIBER',
    refinedSuffix: '_CLOTH',
    cityKey: 'lymhurst',
    cityName: 'Lymhurst',
    scheduleLabel: 'FIBRA',
  },
  leather: {
    locations: ['Martlock'],
    rawSuffix: '_HIDE',
    refinedSuffix: '_LEATHER',
    cityKey: 'martlock',
    cityName: 'Martlock',
    scheduleLabel: 'COURO',
  },
  metal: {
    locations: ['Thetford'],
    rawSuffix: '_ORE',
    refinedSuffix: '_METALBAR',
    cityKey: 'thetford',
    cityName: 'Thetford',
    scheduleLabel: 'MINÉRIO',
  },
  stone: {
    locations: ['Bridgewatch'],
    rawSuffix: '_ROCK',
    refinedSuffix: '_STONEBLOCK',
    cityKey: 'bridgewatch',
    cityName: 'Bridgewatch',
    scheduleLabel: 'PEDRA',
  },
};

// ─── Funções utilitárias (compartilhadas) ───

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
  const m = { '.0': 1, '.1': 2, '.2': 4, '.3': 8, '.4': 16 }[enc] || 1;
  return [q, n * m];
}

function specTotalPrata(specVars) {
  const keys = ['t4', 't5', 't6', 't7', 't8'];
  return keys.reduce((sum, k) => sum + (parseInt(String(specVars[k] ?? '0'), 10) || 0) * 30, 0);
}

function buildIdsForTier(tSel, rawSuffix, refinedSuffix) {
  const tNum = parseInt(tSel.slice(1), 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : 'T3';
  const ids = [];
  const refinedIds = [];
  for (const n of NIVEIS) {
    ids.push(
      `${tSel}${rawSuffix}${n}`,
      `${tSel}${refinedSuffix}${n}`,
      tAnt === 'T3' ? `${tAnt}${refinedSuffix}` : `${tAnt}${refinedSuffix}${n}`,
    );
    refinedIds.push(`${tSel}${refinedSuffix}${n}`);
  }
  return { tAnt, ids, refinedIds };
}

function volumeMapFromHistory(hist) {
  const volMap = new Map();
  for (const entry of hist) {
    const cid = entry.location;
    const it = entry.item_id;
    if (!entry.data || entry.data.length === 0) {
      volMap.set(`${cid}|${it}`, 0);
      continue;
    }
    // Ordenar por timestamp e remover o data-point mais recente (dia parcial/incompleto)
    const sorted = [...entry.data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
    const complete = sorted.length > 1 ? sorted.slice(0, -1) : sorted;
    const totalVol = complete.reduce((s, d) => s + (d.item_count || 0), 0);
    const days = complete.length || 1;
    volMap.set(`${cid}|${it}`, Math.round(totalVol / days));
  }
  return volMap;
}

function convertToUTC3(isoDate) {
  if (!isoDate) return null;
  const dateStr = String(isoDate);
  if (dateStr.includes('0001')) return null;
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCHours(d.getUTCHours() - 3);
    return d.toISOString();
  } catch {
    return null;
  }
}

function getVol(volMap, city, itemId) {
  return volMap.get(`${city}|${itemId}`) ?? 0;
}

// ─── Função genérica: processar refino de recurso ───

async function processarRecurso(resource, body) {
  const cfg = RESOURCE_CONFIGS[resource];
  if (!cfg) throw new Error(`Recurso desconhecido: ${resource}`);

  const { tier: tSel, taxaNpc: taxaRaw, spec = {}, buyOrder = false, foco = false } = body;

  let txU = parseFloat(String(taxaRaw ?? '800').trim() || '800');
  if (Number.isNaN(txU)) txU = 800;

  const rrr = calcularRrrManual(foco, true);
  const { ids, refinedIds } = buildIdsForTier(tSel, cfg.rawSuffix, cfg.refinedSuffix);

  const res = await fetchPrices(ids, cfg.locations);
  const hist = await fetchHistory(refinedIds, cfg.locations, 6);
  const volMap = volumeMapFromHistory(hist);

  // Preços de todas as 5 cidades reais para linha "melhor preço"
  const ROYAL_LOCS = ['FortSterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const ROYAL_NAMES = ['Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const royalRes = await fetchPrices([...new Set(ids)], ROYAL_LOCS);

  const royalDc = new Map();
  const royalDcDate = new Map();
  const royalSell = new Map();
  const royalSellDate = new Map();
  for (const p of royalRes) {
    const key = `${p.city}|${p.item_id}`;
    const valBuy = p.buy_price_max;
    const valSell = p.sell_price_min;
    if (valSell > 0) {
      const price = buyOrder && valBuy > 0 ? valBuy : valSell;
      const date = buyOrder && valBuy > 0
        ? convertToUTC3(p.buy_price_max_date)
        : convertToUTC3(p.sell_price_min_date);
      royalDc.set(key, price);
      royalDcDate.set(key, date);
      royalSell.set(key, valSell);
      royalSellDate.set(key, convertToUTC3(p.sell_price_min_date));
    }
  }

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
    const enc = n ? n.split('@')[0].replace('_LEVEL', '.') : '.0';
    const [qt, fat] = obterParametrosTabela(tSel, enc);
    const txF = (txU / 100) * fat;

    const iT = ids[idxN * 3];
    const iP = ids[idxN * 3 + 1];
    const iA = ids[idxN * 3 + 2];

    const fBase = FOCO_BASE[tSel] ?? 250;
    const multNivel = MULT_ENCHANT[idxN];
    const fReal = fBase * multNivel * 0.5 ** (spTotal / 10000);
    const famaRefino = famaRefinoPorCraft(tSel, idxN);

    const cities = cfg.cities || [{ key: cfg.cityKey, name: cfg.cityName }];

    const row = {
      nivel: `${tSel}${enc}`,
      enc,
      qtTronco: qt,
      famaRefino,
    };

    function calcLucro(t, a, v) {
      if (t && a && v) return v - ((t * qt + a) * (1 - rrr) + txF);
      return -9e8;
    }

    // Per-city data
    for (const city of cities) {
      const cPrices = [getDc(city.name, iT), getDc(city.name, iA), getDv(city.name, iP)];
      row[city.key] = {
        tronco: cPrices[0],
        troncoDate: getDt(city.name, iT),
        tabuaAnt: cPrices[1],
        tabuaAntDate: getDt(city.name, iA),
        tabua: cPrices[2],
        tauaDate: getDvt(city.name, iP),
        lucro: calcLucro(...cPrices),
        volume24h: getVol(volMap, city.name, iP),
      };
    }

    // Otimizado: min cost across cities for materials, min sell order for product
    const rawPrices = cities.map((c) => getDc(c.name, iT)).filter((v) => v > 0);
    const prevPrices = cities.map((c) => getDc(c.name, iA)).filter((v) => v > 0);
    const prodPrices = cities.map((c) => getDv(c.name, iP)).filter((v) => v > 0);

    const minRaw = rawPrices.length ? Math.min(...rawPrices) : 0;
    const minPrev = prevPrices.length ? Math.min(...prevPrices) : 0;
    const minProd = prodPrices.length ? Math.min(...prodPrices) : 0;

    const otimizado = minRaw && minPrev && minProd
      ? minProd - ((minRaw * qt + minPrev) * (1 - rrr) + txF)
      : -9e8;

    row.otimizado = otimizado;
    row.melhorLucro = otimizado;

    // Melhor preço por material nas 5 cidades reais
    // Materiais: menor preço de compra (sell order ou buy order conforme config)
    // Produto refinado: menor sell order
    function bestRoyal(itemId, map, dateMap) {
      let best = null;
      for (const rc of ROYAL_NAMES) {
        const p = map.get(`${rc}|${itemId}`) ?? 0;
        if (p > 0 && (!best || p < best.preco)) {
          best = { cidade: rc, preco: p, data: dateMap.get(`${rc}|${itemId}`) ?? null };
        }
      }
      return best;
    }
    row.melhorPreco = {
      tronco: bestRoyal(iT, royalDc, royalDcDate),
      tabuaAnt: bestRoyal(iA, royalDc, royalDcDate),
      produto: bestRoyal(iP, royalSell, royalSellDate),
    };

    if (otimizado > -8e8 && foco) {
      row.foco = {
        unidades: fReal,
        prataPorFoco: otimizado / fReal,
      };
    }
    rows.push(row);
  }

  return {
    tier: tSel,
    strategy: buyOrder ? 'BUY ORDER' : 'SELL ORDER',
    rrr,
    rrrPercent: rrr * 100,
    taxaNpc: txU,
    lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
    rows,
  };
}

// ─── Função genérica: estratégia completa ───

async function estrategiaCompletaRecurso(resource, body) {
  const cfg = RESOURCE_CONFIGS[resource];
  if (!cfg) throw new Error(`Recurso desconhecido: ${resource}`);

  const { taxaNpc: taxaRaw, spec: _spec = {}, buyOrder = false, foco = true } = body;

  let taxaU = parseFloat(String(taxaRaw ?? '800').trim() || '800');
  if (Number.isNaN(taxaU)) taxaU = 800;

  const allIds = [];
  const refinedIds = [];
  for (const t of ['T4', 'T5', 'T6', 'T7', 'T8']) {
    const tAnt = parseInt(t[1], 10) > 4 ? `T${parseInt(t[1], 10) - 1}` : 'T3';
    for (const n of NIVEIS) {
      allIds.push(
        `${t}${cfg.rawSuffix}${n}`,
        `${t}${cfg.refinedSuffix}${n}`,
        tAnt === 'T3' ? `${tAnt}${cfg.refinedSuffix}` : `${tAnt}${cfg.refinedSuffix}${n}`,
      );
      refinedIds.push(`${t}${cfg.refinedSuffix}${n}`);
    }
  }

  const res = await fetchPrices([...new Set(allIds)], cfg.locations);
  const hist = await fetchHistory([...new Set(refinedIds)], cfg.locations, 24);
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
  const cityName = cfg.cityName;

  const fsFoco = [];
  const fsFama = [];

  for (const t of ['T4', 'T5', 'T6', 'T7', 'T8']) {
    const tAnt = parseInt(t[1], 10) > 4 ? `T${parseInt(t[1], 10) - 1}` : 'T3';
    for (let idxN = 0; idxN < NIVEIS.length; idxN++) {
      const n = NIVEIS[idxN];
      const enc = n ? n.split('@')[0].replace('_LEVEL', '.') : '.0';
      const [qt, fat] = obterParametrosTabela(t, enc);
      const txF = (taxaU / 100) * fat;

      const iT = `${t}${cfg.rawSuffix}${n}`;
      const iP = `${t}${cfg.refinedSuffix}${n}`;
      const iA = tAnt === 'T3' ? `${tAnt}${cfg.refinedSuffix}` : `${tAnt}${cfg.refinedSuffix}${n}`;

      const fsT = getDc(cityName, iT);
      const fsA = getDc(cityName, iA);
      const fsP = getDv(cityName, iP);
      const vFs = getVol(volData, cityName, iP);

      const rrrFoco = calcularRrrManual(foco, true);
      const rrrFama = calcularRrrManual(false, true);
      const fama = famaRefinoPorCraft(t, idxN);

      if (fsT && fsA && fsP) {
        fsFoco.push({
          item: `${t}${enc}`,
          lucro: fsP - ((fsT * qt + fsA) * (1 - rrrFoco) + txF),
          volume: vFs,
        });
        const lucroBrutoFamaLocal = fsP - ((fsT * qt + fsA) * (1 - rrrFama) + txF);
        fsFama.push({
          item: `${t}${enc}`,
          fama,
          famaPerPrata:
            Math.abs(lucroBrutoFamaLocal) > 0 ? fama / Math.abs(lucroBrutoFamaLocal) : 0,
          lucro: lucroBrutoFamaLocal,
          volume: vFs,
        });
      }
    }
  }

  const sortDesc = (a, b) => b.lucro - a.lucro;
  const sortDescFama = (a, b) => b.fama - a.fama;
  const top = (arr, n = 8) => [...arr].sort(sortDesc).slice(0, n);
  const topFama = (arr, n = 8) => [...arr].sort(sortDescFama).slice(0, n);

  return {
    fsLocalFoco: top(fsFoco),
    fsLocalFama: topFama(fsFama),
    fsLocalFamaAll: fsFama,
  };
}

// ─── Horários UTC (genérico para qualquer recurso) ───

async function horariosUtcRecurso(resource, tier) {
  const cfg = RESOURCE_CONFIGS[resource];
  if (!cfg) throw new Error(`Recurso desconhecido: ${resource}`);

  const tSel = tier || 'T6';
  const tNum = parseInt(tSel[1], 10);
  const tAnt = tNum > 4 ? `T${tNum - 1}` : 'T3';
  const ids = [];
  for (const n of NIVEIS) {
    ids.push(
      `${tSel}${cfg.rawSuffix}${n}`,
      `${tSel}${cfg.refinedSuffix}${n}`,
      tAnt === 'T3' ? `${tAnt}${cfg.refinedSuffix}` : `${tAnt}${cfg.refinedSuffix}${n}`,
    );
  }

  const res = await fetchPrices(ids, cfg.locations);
  const checkDict = new Map();
  for (const p of res) {
    const dateUTC = convertToUTC3(p.sell_price_min_date);
    if (dateUTC) {
      checkDict.set(`${p.city}|${p.item_id}`, dateUTC);
    }
  }

  function fmt(city, itemId) {
    const f = checkDict.get(`${city}|${itemId}`);
    if (!f) return '---';
    return `${f.slice(8, 10)}/${f.slice(5, 7)} ${f.slice(11, 16)}`;
  }

  const blocos = [];
  for (let idx = 0; idx < NIVEIS.length; idx++) {
    const n = NIVEIS[idx];
    const enc = n ? n.split('@')[0].replace('_LEVEL', '.') : '.0';
    const iT = ids[idx * 3];
    const iP = ids[idx * 3 + 1];
    const iA = ids[idx * 3 + 2];
    blocos.push({
      titulo: `${cfg.scheduleLabel} ${tSel}${enc}`,
      enc,
      cities: [
        {
          city: cfg.cityName,
          tronco: fmt(cfg.cityName, iT),
          tabuaAnt: fmt(cfg.cityName, iA),
          tabuaSell: fmt(cfg.cityName, iP),
        },
      ],
    });
  }

  return { tier: tSel, blocos };
}

// ─── Exports por recurso (compatíveis com a API existente) ───

// Wood
export const processarWood = (body) => processarRecurso('wood', body);
export const estrategiaCompleta = (body) => estrategiaCompletaRecurso('wood', body);
export const horariosUtc = (tier) => horariosUtcRecurso('wood', tier);

// Fiber
export const processarFiber = (body) => processarRecurso('fiber', body);
export const estrategiaCompletaFiber = (body) => estrategiaCompletaRecurso('fiber', body);

// Leather
export const processarLeather = (body) => processarRecurso('leather', body);
export const estrategiaCompletaLeather = (body) => estrategiaCompletaRecurso('leather', body);

// Metal
export const processarMetal = (body) => processarRecurso('metal', body);
export const estrategiaCompletaMetal = (body) => estrategiaCompletaRecurso('metal', body);

// Stone
export const processarStone = (body) => processarRecurso('stone', body);
export const estrategiaCompleteStone = (body) => estrategiaCompletaRecurso('stone', body);
