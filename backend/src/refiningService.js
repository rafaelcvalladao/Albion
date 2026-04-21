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

// Normaliza nomes de cidade para chave consistente entre APIs de preço ("Fort Sterling") e histórico ("FortSterling")
const cityKey = (name) => (name || '').toLowerCase().replace(/\s+/g, '');

function famaRefinoPorCraft(tSel, idxN) {
  const base = FAMA_BASE[tSel] ?? 22;
  const mult = MULT_ENCHANT[idxN] ?? 1;
  return Math.round(base * mult);
}

export function calcularRrrManual(foco, bonusCity, dailyBonus = 0) {
  if (bonusCity) {
    if (dailyBonus === 20) return foco ? 0.578 : 0.438;
    if (dailyBonus === 10) return foco ? 0.559 : 0.405;
    return foco ? 0.539 : 0.367;
  }
  if (dailyBonus === 20) return foco ? 0.492 : 0.275;
  if (dailyBonus === 10) return foco ? 0.465 : 0.219;
  return foco ? 0.435 : 0.153;
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

function avgPriceMapFromHistory(hist) {
  const avgMap = new Map();
  for (const entry of hist) {
    const key = `${cityKey(entry.location)}|${entry.item_id}`;
    if (!entry.data || entry.data.length === 0) { avgMap.set(key, 0); continue; }
    const sorted = [...entry.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const last96h = sorted.slice(-96);
    if (last96h.length === 0) { avgMap.set(key, 0); continue; }
    const totalVol = last96h.reduce((s, d) => s + (d.item_count || 0), 0);
    const totalSilver = last96h.reduce((s, d) => s + (d.avg_price || 0) * (d.item_count || 0), 0);
    avgMap.set(key, totalVol > 0 ? Math.round(totalSilver / totalVol) : 0);
  }
  return avgMap;
}

// Média semanal: 4 semanas (últimos 4 data-points com timescale=168) → fallback 1 semana
function weeklyAvgMapFromHistory(hist) {
  const map = new Map();
  for (const entry of hist) {
    if (!entry.data || entry.data.length === 0) continue;
    const key = `${cityKey(entry.location)}|${entry.item_id}`;
    const sorted = [...entry.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const last4w = sorted.slice(-4);
    const count4w = last4w.reduce((s, d) => s + (d.item_count || 0), 0);
    const silver4w = last4w.reduce((s, d) => s + (d.avg_price || 0) * (d.item_count || 0), 0);
    const avg4w = count4w > 0 ? Math.round(silver4w / count4w) : 0;
    const last1w = sorted[sorted.length - 1];
    const avg1w = (last1w?.item_count || 0) > 0 ? Math.round(last1w.avg_price || 0) : 0;
    const avg = avg4w || avg1w;
    if (avg > 0) map.set(key, avg);
  }
  return map;
}

function volumeMapFromHistory(hist) {
  const volMap = new Map();
  for (const entry of hist) {
    const cid = cityKey(entry.location);
    const it = entry.item_id;
    if (!entry.data || entry.data.length === 0) {
      volMap.set(`${cid}|${it}`, 0);
      continue;
    }
    const sorted = [...entry.data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
    const last96h = sorted.slice(-96);
    if (last96h.length === 0) {
      volMap.set(`${cid}|${it}`, 0);
      continue;
    }
    const totalVol = last96h.reduce((s, d) => s + (d.item_count || 0), 0);
    const avgVol = totalVol / 4;
    volMap.set(`${cid}|${it}`, Math.round(avgVol));
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
  return volMap.get(`${cityKey(city)}|${itemId}`) ?? 0;
}

// ─── Função genérica: processar refino de recurso ───

async function processarRecurso(resource, body) {
  const cfg = RESOURCE_CONFIGS[resource];
  if (!cfg) throw new Error(`Recurso desconhecido: ${resource}`);

  const { tier: tSel, taxaNpc: taxaRaw, taxaVenda: taxaVendaRaw, spec = {}, buyOrder = false, foco = false, dailyBonus = 0 } = body;

  let txU = parseFloat(String(taxaRaw ?? '800').trim() || '800');
  if (Number.isNaN(txU)) txU = 800;

  let taxaVenda = parseFloat(String(taxaVendaRaw ?? '6.5').trim() || '6.5');
  if (Number.isNaN(taxaVenda)) taxaVenda = 6.5;
  const taxaVendaNota = 1 - taxaVenda / 100;

  const rrr = calcularRrrManual(foco, true, dailyBonus);
  const { ids, refinedIds } = buildIdsForTier(tSel, cfg.rawSuffix, cfg.refinedSuffix);

  const ROYAL_LOCS = ['FortSterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const ROYAL_NAMES = ['Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const [res, hist, weeklyHist, royalRes, royalHist, royalWeeklyHist] = await Promise.all([
    fetchPrices(ids, cfg.locations),
    fetchHistory(refinedIds, cfg.locations, 1),
    fetchHistory(ids, cfg.locations, 168),
    fetchPrices([...new Set(ids)], ROYAL_LOCS),
    fetchHistory(refinedIds, ROYAL_LOCS, 1),
    fetchHistory([...new Set(ids)], ROYAL_LOCS, 168),
  ]);
  const volMap = volumeMapFromHistory(hist);
  const avgMap = avgPriceMapFromHistory(hist);
  const weeklyAvg = weeklyAvgMapFromHistory(weeklyHist);
  const royalVolMap = volumeMapFromHistory(royalHist);
  const royalAvgMap = avgPriceMapFromHistory(royalHist);
  const royalWeeklyAvg = weeklyAvgMapFromHistory(royalWeeklyHist);

  const royalDc = new Map();
  const royalDcDate = new Map();
  const royalSell = new Map();
  const royalSellDate = new Map();
  for (const p of royalRes) {
    const key = `${cityKey(p.city)}|${p.item_id}`;
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
    const key = `${cityKey(p.city)}|${p.item_id}`;
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

  const getDc = (city, item) => dc.get(`${cityKey(city)}|${item}`) || weeklyAvg.get(`${cityKey(city)}|${item}`) || 0;
  const getDv = (city, item) => dv.get(`${cityKey(city)}|${item}`) || weeklyAvg.get(`${cityKey(city)}|${item}`) || 0;
  const getDt = (city, item) => dt.get(`${cityKey(city)}|${item}`) ?? null;
  const getDvt = (city, item) => dvt.get(`${cityKey(city)}|${item}`) ?? null;

  const rows = [];
  const reducaoGeral = specTotalPrata(spec); // sum(all spec levels) * 30
  const reducaoTier = (parseInt(String(spec[tSel.toLowerCase()] ?? '0'), 10) || 0) * 250;

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
    const fReal = fBase * multNivel * 0.5 ** ((reducaoGeral + reducaoTier) / 10000);
    const famaRefino = famaRefinoPorCraft(tSel, idxN);

    const cities = cfg.cities || [{ key: cfg.cityKey, name: cfg.cityName }];

    const row = {
      nivel: `${tSel}${enc}`,
      enc,
      qtTronco: qt,
      famaRefino,
    };

    const getProdPreco = (cityName, itemId) =>
      dailyBonus > 0 ? (avgMap.get(`${cityKey(cityName)}|${itemId}`) ?? 0) : getDv(cityName, itemId);

    function calcLucro(t, a, v) {
      if (t && a && v) return v * taxaVendaNota - ((t * qt + a) * (1 - rrr) + txF);
      return -9e8;
    }

    // Per-city data
    for (const city of cities) {
      const prodPreco = getProdPreco(city.name, iP);
      const cPrices = [getDc(city.name, iT), getDc(city.name, iA), prodPreco];
      row[city.key] = {
        tronco: cPrices[0],
        troncoDate: getDt(city.name, iT),
        tabuaAnt: cPrices[1],
        tabuaAntDate: getDt(city.name, iA),
        tabua: getDv(city.name, iP),
        tauaDate: getDvt(city.name, iP),
        lucro: calcLucro(...cPrices),
        volume24h: getVol(volMap, city.name, iP),
        avgPreco: avgMap.get(`${cityKey(city.name)}|${iP}`) ?? 0,
      };
    }

    // Otimizado: min cost across cities for materials, best product price
    const rawPrices = cities.map((c) => getDc(c.name, iT)).filter((v) => v > 0);
    const prevPrices = cities.map((c) => getDc(c.name, iA)).filter((v) => v > 0);
    const prodPrices = cities.map((c) => getProdPreco(c.name, iP)).filter((v) => v > 0);

    const minRaw = rawPrices.length ? Math.min(...rawPrices) : 0;
    const minPrev = prevPrices.length ? Math.min(...prevPrices) : 0;
    const maxProd = prodPrices.length ? Math.max(...prodPrices) : 0;

    const otimizado = minRaw && minPrev && maxProd
      ? maxProd * taxaVendaNota - ((minRaw * qt + minPrev) * (1 - rrr) + txF)
      : -9e8;

    row.otimizado = otimizado;
    row.melhorLucro = otimizado;

    // Melhor preço por material nas 5 cidades reais
    // Materiais: menor preço de compra (sell order ou buy order conforme config)
    // Produto refinado: maior sell order (vender pelo maior valor)
    function bestRoyalMin(itemId, map, dateMap, fallback = null) {
      let best = null;
      for (const rc of ROYAL_NAMES) {
        const k = `${cityKey(rc)}|${itemId}`;
        const p = map.get(k) || (fallback?.get(k) ?? 0);
        if (p > 0 && (!best || p < best.preco)) {
          best = { cidade: rc, preco: p, data: dateMap.get(k) ?? null };
        }
      }
      return best;
    }
    function bestRoyalMax(itemId, map, dateMap, fallback = null) {
      let best = null;
      for (const rc of ROYAL_NAMES) {
        const k = `${cityKey(rc)}|${itemId}`;
        const p = map.get(k) || (fallback?.get(k) ?? 0);
        if (p > 0 && (!best || p > best.preco)) {
          best = { cidade: rc, preco: p, data: dateMap.get(k) ?? null };
        }
      }
      return best;
    }
    const mpTronco = bestRoyalMin(iT, royalDc, royalDcDate, royalWeeklyAvg);
    const mpTabuaAnt = bestRoyalMin(iA, royalDc, royalDcDate, royalWeeklyAvg);
    // Produto: quando dailyBonus > 0 usa melhor preço médio entre cidades reais
    let mpProduto;
    if (dailyBonus > 0) {
      let bestAvgProduto = null;
      for (const rc of ROYAL_NAMES) {
        const k = `${cityKey(rc)}|${iP}`;
        const p = royalAvgMap.get(k) ?? 0;
        if (p > 0 && (!bestAvgProduto || p > bestAvgProduto.preco)) {
          bestAvgProduto = { cidade: rc, preco: p, data: royalSellDate.get(k) ?? null };
        }
      }
      mpProduto = bestAvgProduto;
    } else {
      mpProduto = bestRoyalMax(iP, royalSell, royalSellDate, royalWeeklyAvg);
    }

    let mpLucro = -9e8;
    if (mpTronco && mpTabuaAnt && mpProduto) {
      mpLucro = mpProduto.preco * taxaVendaNota - ((mpTronco.preco * qt + mpTabuaAnt.preco) * (1 - rrr) + txF);
    }

    row.melhorPreco = {
      tronco: mpTronco,
      tabuaAnt: mpTabuaAnt,
      produto: mpProduto,
      lucro: mpLucro,
      volumeProduto: mpProduto ? (royalVolMap.get(`${cityKey(mpProduto.cidade)}|${iP}`) ?? 0) : 0,
      avgPreco: mpProduto ? (royalAvgMap.get(`${cityKey(mpProduto.cidade)}|${iP}`) ?? 0) : 0,
    };

    if (otimizado > -8e8 && foco) {
      const rrrSemFoco = calcularRrrManual(false, true, dailyBonus);
      const otimizadoSemFoco = minRaw && minPrev && maxProd
        ? maxProd * taxaVendaNota - ((minRaw * qt + minPrev) * (1 - rrrSemFoco) + txF)
        : 0;
      row.foco = {
        unidades: fReal,
        prataPorFoco: fReal > 0 ? (otimizado - otimizadoSemFoco) / fReal : 0,
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

  const { taxaNpc: taxaRaw, taxaVenda: taxaVendaRaw, spec = {}, buyOrder = false, foco = true, dailyBonus = 0 } = body;

  let taxaU = parseFloat(String(taxaRaw ?? '800').trim() || '800');
  if (Number.isNaN(taxaU)) taxaU = 800;

  let taxaVenda = parseFloat(String(taxaVendaRaw ?? '6.5').trim() || '6.5');
  if (Number.isNaN(taxaVenda)) taxaVenda = 6.5;
  const taxaVendaNota = 1 - taxaVenda / 100;

  const reducaoGeral = specTotalPrata(spec); // sum(all spec levels) * 30
  const rrrConFoco = calcularRrrManual(true, true, dailyBonus);

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

  const uniqueAllIds = [...new Set(allIds)];
  const uniqueRefinedIds = [...new Set(refinedIds)];
  const ROYAL_LOCS = ['FortSterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const ROYAL_NAMES = ['Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Thetford'];
  const [res, hist, weeklyHist, royalRes, royalHist, royalWeeklyHist] = await Promise.all([
    fetchPrices(uniqueAllIds, cfg.locations),
    fetchHistory(uniqueRefinedIds, cfg.locations, 1),
    fetchHistory(uniqueAllIds, cfg.locations, 168),
    fetchPrices(uniqueAllIds, ROYAL_LOCS),
    fetchHistory(uniqueRefinedIds, ROYAL_LOCS, 1),
    fetchHistory(uniqueAllIds, ROYAL_LOCS, 168),
  ]);
  const volData = volumeMapFromHistory(hist);
  const avgData = avgPriceMapFromHistory(hist);
  const weeklyAvg = weeklyAvgMapFromHistory(weeklyHist);
  const royalVolData = volumeMapFromHistory(royalHist);
  const royalAvgData = avgPriceMapFromHistory(royalHist);
  const royalWeeklyAvg = weeklyAvgMapFromHistory(royalWeeklyHist);

  const dc = new Map();
  const dv = new Map();
  for (const p of res) {
    const key = `${cityKey(p.city)}|${p.item_id}`;
    const val = buyOrder && p.buy_price_max > 0 ? p.buy_price_max : p.sell_price_min;
    if (val > 0) dc.set(key, val);
    if (p.sell_price_min > 0) dv.set(key, p.sell_price_min);
  }

  const royalDc = new Map();
  const royalDv = new Map();
  for (const p of royalRes) {
    const key = `${cityKey(p.city)}|${p.item_id}`;
    const val = buyOrder && p.buy_price_max > 0 ? p.buy_price_max : p.sell_price_min;
    if (val > 0) royalDc.set(key, val);
    if (p.sell_price_min > 0) royalDv.set(key, p.sell_price_min);
  }

  const getDc = (c, it) => dc.get(`${cityKey(c)}|${it}`) || weeklyAvg.get(`${cityKey(c)}|${it}`) || 0;
  const getDv = (c, it) => dv.get(`${cityKey(c)}|${it}`) || weeklyAvg.get(`${cityKey(c)}|${it}`) || 0;
  const getRoyalDc = (c, it) => royalDc.get(`${cityKey(c)}|${it}`) || royalWeeklyAvg.get(`${cityKey(c)}|${it}`) || 0;
  const getRoyalDv = (c, it) => royalDv.get(`${cityKey(c)}|${it}`) || royalWeeklyAvg.get(`${cityKey(c)}|${it}`) || 0;
  const getProdLocal = (c, it) => dailyBonus > 0 ? (avgData.get(`${cityKey(c)}|${it}`) ?? 0) : getDv(c, it);
  const getProdRoyal = (c, it) => dailyBonus > 0 ? (royalAvgData.get(`${cityKey(c)}|${it}`) ?? 0) : getRoyalDv(c, it);
  const cityName = cfg.cityName;
  const cfgCities = cfg.cities || [{ name: cfg.cityName }];
  const cfgCityNames = cfgCities.map((c) => c.name);

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

      // Lucro local (cidade principal)
      const fsT = getDc(cityName, iT);
      const fsA = getDc(cityName, iA);
      const fsP = getProdLocal(cityName, iP);
      const vFs = getVol(volData, cityName, iP);

      // Lucro otimizado cfg cities (FS-LH para madeira)
      function bestOpt(cities, dcFn, prodFn) {
        const raws = cities.map((c) => dcFn(c, iT)).filter((v) => v > 0);
        const prevs = cities.map((c) => dcFn(c, iA)).filter((v) => v > 0);
        const prods = cities.map((c) => prodFn(c, iP)).filter((v) => v > 0);
        const minR = raws.length ? Math.min(...raws) : 0;
        const minP = prevs.length ? Math.min(...prevs) : 0;
        const maxS = prods.length ? Math.max(...prods) : 0;
        let bestCity = null;
        for (const c of cities) {
          if (prodFn(c, iP) === maxS) { bestCity = c; break; }
        }
        return { minR, minP, maxS, bestCity };
      }

      const optCfg = bestOpt(cfgCityNames, getDc, getProdLocal);
      const optRoyal = bestOpt(ROYAL_NAMES, getRoyalDc, getProdRoyal);

      const rrrFoco = calcularRrrManual(foco, true, dailyBonus);
      const rrrFama = calcularRrrManual(false, true, dailyBonus);
      const fama = famaRefinoPorCraft(t, idxN);
      const reducaoTierSpec = (parseInt(String(spec[t.toLowerCase()] ?? '0'), 10) || 0) * 250;
      const focoUnidades = (FOCO_BASE[t] ?? 250) * MULT_ENCHANT[idxN] * 0.5 ** ((reducaoGeral + reducaoTierSpec) / 10000);

      const custoLocal = fsT && fsA ? (fsT * qt + fsA) * (1 - rrrFoco) + txF : null;
      const custoOpt = optCfg.minR && optCfg.minP ? (optCfg.minR * qt + optCfg.minP) * (1 - rrrFoco) + txF : null;
      const custoOT = optRoyal.minR && optRoyal.minP ? (optRoyal.minR * qt + optRoyal.minP) * (1 - rrrFoco) + txF : null;

      const lucroLocal = fsT && fsA && fsP
        ? fsP * taxaVendaNota - custoLocal
        : null;
      const lucroOpt = optCfg.minR && optCfg.minP && optCfg.maxS
        ? optCfg.maxS * taxaVendaNota - custoOpt
        : null;
      const lucroOT = optRoyal.minR && optRoyal.minP && optRoyal.maxS
        ? optRoyal.maxS * taxaVendaNota - custoOT
        : null;

      const volOpt = optCfg.bestCity ? (volData.get(`${cityKey(optCfg.bestCity)}|${iP}`) ?? 0) : 0;
      const volOT = optRoyal.bestCity ? (royalVolData.get(`${cityKey(optRoyal.bestCity)}|${iP}`) ?? 0) : 0;

      // Lucro/foco: ganho marginal por ponto de foco vs não usar foco
      const lucroLocalComFoco = fsT && fsA && fsP ? fsP * taxaVendaNota - ((fsT * qt + fsA) * (1 - rrrConFoco) + txF) : null;
      const lucroLocalSemFoco = fsT && fsA && fsP ? fsP * taxaVendaNota - ((fsT * qt + fsA) * (1 - rrrFama) + txF) : null;

      const lucroPorFoco = lucroLocalComFoco != null && lucroLocalSemFoco != null
        ? (lucroLocalComFoco - lucroLocalSemFoco) / focoUnidades : null;

      const lucroOptComFoco = optCfg.minR && optCfg.minP && optCfg.maxS
        ? optCfg.maxS * taxaVendaNota - ((optCfg.minR * qt + optCfg.minP) * (1 - rrrConFoco) + txF) : null;
      const lucroOptSemFoco = optCfg.minR && optCfg.minP && optCfg.maxS
        ? optCfg.maxS * taxaVendaNota - ((optCfg.minR * qt + optCfg.minP) * (1 - rrrFama) + txF) : null;
      const lucroPorFocoOpt = lucroOptComFoco != null && lucroOptSemFoco != null
        ? (lucroOptComFoco - lucroOptSemFoco) / focoUnidades : null;

      const lucroOTComFoco = optRoyal.minR && optRoyal.minP && optRoyal.maxS
        ? optRoyal.maxS * taxaVendaNota - ((optRoyal.minR * qt + optRoyal.minP) * (1 - rrrConFoco) + txF) : null;
      const lucroOTSemFoco = optRoyal.minR && optRoyal.minP && optRoyal.maxS
        ? optRoyal.maxS * taxaVendaNota - ((optRoyal.minR * qt + optRoyal.minP) * (1 - rrrFama) + txF) : null;
      const lucroPorFocoOT = lucroOTComFoco != null && lucroOTSemFoco != null
        ? (lucroOTComFoco - lucroOTSemFoco) / focoUnidades : null;

      if (lucroLocal != null || lucroOpt != null || lucroOT != null) {
        fsFoco.push({
          item: `${t}${enc}`,
          lucro: lucroLocal ?? -9e8,
          volume: vFs,
          lucroOpt: lucroOpt ?? -9e8,
          volumeOpt: volOpt,
          lucroOT: lucroOT ?? -9e8,
          volumeOT: volOT,
          focoUnidades,
          lucroPorFoco: lucroPorFoco ?? -9e8,
          lucroPorFocoOpt: lucroPorFocoOpt ?? -9e8,
          lucroPorFocoOT: lucroPorFocoOT ?? -9e8,
          custoLocal: custoLocal ?? null,
          custoOpt: custoOpt ?? null,
          custoOT: custoOT ?? null,
        });
        const lucroFamaLocal = fsT && fsA && fsP
          ? fsP * taxaVendaNota - ((fsT * qt + fsA) * (1 - rrrFama) + txF)
          : -9e8;
        const lucroFamaComFoco = lucroLocalComFoco ?? -9e8;
        fsFama.push({
          item: `${t}${enc}`,
          fama,
          famaPerPrata:
            Math.abs(lucroFamaLocal) > 0 ? fama / Math.abs(lucroFamaLocal) : 0,
          famaPerPrataComFoco:
            Math.abs(lucroFamaComFoco) > 0 ? fama / Math.abs(lucroFamaComFoco) : 0,
          lucro: lucroFamaLocal,
          lucroComFoco: lucroFamaComFoco,
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
