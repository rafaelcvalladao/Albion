import { fetchPricesMarket } from './marketPrices.js';
import { fetchHistory } from './albionClient.js';
import { nomeItemEmPortugues, calcularCustoTeleporte } from './marketConstants.js';
import { gerarListaItens } from './marketItems.js';
import { getEnchantResourceId, getEnchantQtyBySlot } from './enchantUtils.js';

const TODAS_CIDADES = [
  'Bridgewatch',
  'FortSterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Brecilien',
];

function normalizarCidade(cidade) {
  if (!cidade) return '';
  return cidade
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

// Normaliza nomes de cidade para chave consistente (ex.: "Fort Sterling" e "FortSterling" → "fortsterling")
function cityKey(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '');
}

const MATERIAL_NOME = { RUNE: 'Runa', SOUL: 'Alma', RELIC: 'Relíquia', SHARD: 'Fragmento' };

/**
 * Constrói mapa de preços médios históricos por item+cidade.
 * Fallback priority: avg 4 semanas → avg 1 semana.
 * Usa timescale=168 (semanal), últimos 4 datapoints.
 */
function buildAvgMap(hist) {
  const map = new Map();
  for (const entry of hist) {
    if (!entry.data || !Array.isArray(entry.data) || entry.data.length === 0) continue;
    const key = `${entry.item_id}|${cityKey(entry.location)}`;
    const sorted = [...entry.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const last4w = sorted.slice(-4);

    const total4wCount = last4w.reduce((s, d) => s + (d.item_count || 0), 0);
    const total4wSilver = last4w.reduce((s, d) => s + (d.avg_price || 0) * (d.item_count || 0), 0);
    const avg4w = total4wCount > 0 ? Math.round(total4wSilver / total4wCount) : 0;

    const last1w = sorted[sorted.length - 1];
    const avg1w = (last1w?.item_count || 0) > 0 ? Math.round(last1w.avg_price || 0) : 0;

    if (avg4w > 0 || avg1w > 0) map.set(key, { avg4w, avg1w });
  }
  return map;
}

function isPriceStale(dateStr, maxHours = 6) {
  if (!dateStr || dateStr.startsWith('0001')) return true;
  try {
    const then = new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z');
    if (isNaN(then.getTime())) return true;
    return (Date.now() - then.getTime()) > maxHours * 3_600_000;
  } catch {
    return true;
  }
}

/**
 * Retorna o melhor preço disponível para um item numa cidade:
 * 1. sell_price_min atual (≤ 6 h)
 * 2. média histórica (4 semanas ou 1 semana)
 * 3. sell_price_min desatualizado (> 6 h) como último recurso
 */
function getPrice(itemId, city, priceByItemCity, avgMap) {
  const k = `${itemId}|${cityKey(city)}`;
  const sell = priceByItemCity.get(k);
  if (sell) return sell;
  const avg = avgMap.get(k);
  return avg?.avg4w || avg?.avg1w || 0;
}

async function calcularAlternativasEncantamento({ baseItemIds, tier, encantamento, cidadeDestinoNormalizada }) {
  if (encantamento <= 0 || !baseItemIds.length) return [];

  const qty = getEnchantQtyBySlot(baseItemIds[0]);

  const allItemIds = new Set();
  const levelItemsByFrom = [];
  const materialsByFrom = [];
  const allLevelItemIds = new Set();

  for (let fromLevel = 0; fromLevel < encantamento; fromLevel++) {
    const levelItemIds = fromLevel === 0
      ? baseItemIds
      : baseItemIds.map(id => `${id}@${fromLevel}`);
    const materialIds = [];
    for (let lvl = fromLevel + 1; lvl <= encantamento; lvl++) {
      materialIds.push(getEnchantResourceId(tier, lvl));
    }
    levelItemIds.forEach(id => { allItemIds.add(id); allLevelItemIds.add(id); });
    materialIds.forEach(id => allItemIds.add(id));
    levelItemsByFrom.push(levelItemIds);
    materialsByFrom.push(materialIds);
  }

  const allIds = [...allItemIds];
  let precos = [];
  let hist = [];
  try {
    [precos, hist] = await Promise.all([
      fetchPricesMarket(allIds, TODAS_CIDADES),
      fetchHistory([...allLevelItemIds], TODAS_CIDADES, 168),
    ]);
  } catch {
    return [];
  }

  // Preços ao vivo por item+cidade (guarda preço + data para checar staleness)
  const priceByItemCity = new Map();
  for (const p of precos) {
    const price = Number(p.sell_price_min) || 0;
    if (!price) continue;
    const k = `${p.item_id}|${cityKey(p.city)}`;
    const curr = priceByItemCity.get(k);
    if (!curr || price < curr.price) priceByItemCity.set(k, { price, date: p.sell_price_min_date });
  }

  // Médias históricas para fallback do item base
  const avgMapEnc = buildAvgMap(hist);

  // Materiais: somente preço ao vivo (sem fallback de média)
  const getLivePrice = (itemId, city) =>
    priceByItemCity.get(`${itemId}|${cityKey(city)}`)?.price || 0;

  // Item base: sell fresco (≤6h) → média histórica → sell desatualizado
  const getItemPrice = (itemId, city) => {
    const entry = priceByItemCity.get(`${itemId}|${cityKey(city)}`);
    const avg = avgMapEnc.get(`${itemId}|${cityKey(city)}`);
    const avgPreco = avg?.avg4w || avg?.avg1w || 0;
    if (entry && !isPriceStale(entry.date)) return entry.price;
    if (avgPreco > 0) return avgPreco;
    return entry?.price || 0;
  };

  const melhorPorCidade = {};

  for (let fromLevel = 0; fromLevel < encantamento; fromLevel++) {
    const levelItemIds = levelItemsByFrom[fromLevel];
    const materialIds = materialsByFrom[fromLevel];

    // Materiais: somente ordens ativas (não usar média para material de encantamento)
    const globalMatMin = {};
    for (const id of materialIds) {
      let min = 0;
      for (const city of TODAS_CIDADES) {
        const p = getLivePrice(id, city);
        if (p > 0 && (!min || p < min)) min = p;
      }
      globalMatMin[id] = min;
    }

    if (materialIds.some(id => !globalMatMin[id])) continue;

    const custoMateriais = materialIds.reduce((sum, id) => sum + globalMatMin[id] * qty, 0);

    const matNomes = materialIds.map(id => {
      const tipo = MATERIAL_NOME[id.split('_')[1]] || id.split('_')[1];
      return `${tipo} ${tier.slice(1)}`;
    });
    const pathDesc = `.${fromLevel} + ${matNomes.join(' + ')} ×${qty}`;

    for (const city of TODAS_CIDADES) {
      let melhorItemId = null;
      let melhorItemPreco = 0;
      for (const id of levelItemIds) {
        const p = getItemPrice(id, city);
        if (p > 0 && (!melhorItemPreco || p < melhorItemPreco)) {
          melhorItemPreco = p;
          melhorItemId = id;
        }
      }
      if (!melhorItemPreco) continue;

      const cidadeNorm = normalizarCidade(city);
      const teleporte = cidadeNorm === cidadeDestinoNormalizada ? 0
        : calcularCustoTeleporte(melhorItemId, cidadeNorm, cidadeDestinoNormalizada);
      const custoFinal = melhorItemPreco + custoMateriais + teleporte;

      if (!melhorPorCidade[city] || custoFinal < melhorPorCidade[city].custoFinal) {
        melhorPorCidade[city] = {
          cidadeOrigem: city,
          pathDesc,
          fromLevel,
          custoItem: melhorItemPreco,
          custoMateriais,
          custoTeleporte: teleporte,
          custoFinal,
        };
      }
    }
  }

  return Object.values(melhorPorCidade).sort((a, b) => a.custoFinal - b.custoFinal);
}

/**
 * Busca todas as combinações equivalentes para um nível efetivo (4-12).
 * Nível efetivo = tier_base + enchant. Ex: 7 → T7.0, T6.1, T5.2, T4.3
 * Retorna: { direto: [...], encantando: [...] } — uma linha por combinação.
 */
export async function buscarEquipamentoPorNivelEfetivo({ equipamentoNome, nivelEfetivo, qualidade, cidadeDestino }) {
  const N = parseInt(nivelEfetivo, 10);
  if (Number.isNaN(N) || N < 4 || N > 12) return { direto: [], encantando: [] };

  const cidadeDestinoNormalizada = normalizarCidade(cidadeDestino);
  const qualidadeAPI = (parseInt(qualidade) || 0) + 1;
  const termoBusca = (equipamentoNome || '').toLowerCase();

  const combinations = [];
  for (let base = Math.max(4, N - 4); base <= Math.min(8, N); base++) {
    combinations.push({ tier: `T${base}`, enchant: N - base });
  }

  let todosItens;
  try {
    todosItens = await gerarListaItens('Todos');
  } catch (e) {
    console.error('[equipBuy] Erro ao gerar lista:', e.message);
    return { direto: [], encantando: [] };
  }

  const combData = [];
  const allDiretoIds = [];

  for (const { tier, enchant } of combinations) {
    const tierItems = todosItens.filter(id => {
      if (!id.split('@')[0].startsWith(tier)) return false;
      return nomeItemEmPortugues(id).toLowerCase().includes(termoBusca);
    });
    const baseIds = [...new Set(tierItems.map(id => id.split('@')[0]))];
    if (!baseIds.length) continue;

    const directIds = enchant === 0 ? baseIds : baseIds.map(id => `${id}@${enchant}`);
    combData.push({ tier, enchant, baseIds, directIds });
    allDiretoIds.push(...directIds);
  }

  if (!allDiretoIds.length) return { direto: [], encantando: [] };

  const uniqueDiretoIds = [...new Set(allDiretoIds)];
  let precos = [];
  let histDireto = [];
  try {
    [precos, histDireto] = await Promise.all([
      fetchPricesMarket(uniqueDiretoIds, TODAS_CIDADES, qualidadeAPI),
      fetchHistory(uniqueDiretoIds, TODAS_CIDADES, 168),
    ]);
  } catch (e) {
    console.error('[equipBuy] Erro ao buscar preços:', e.message);
    return { direto: [], encantando: [] };
  }

  // sell_price_min por item+cidade
  const precoMap = {};
  for (const p of precos) {
    const price = Number(p.sell_price_min) || 0;
    if (!price) continue;
    const key = `${p.item_id}|${p.city}`;
    if (!precoMap[key] || price < precoMap[key].preco) {
      precoMap[key] = { preco: price, data: p.sell_price_min_date, quality: p.quality };
    }
  }

  const avgMapDireto = buildAvgMap(histDireto);

  // Retorna entry com preço para um item+cidade.
  // Prioridade: sell fresco (≤6h) → média histórica → sell desatualizado
  const getEntryDireto = (itemId, city) => {
    const sellKey = `${itemId}|${city}`;
    const entry = precoMap[sellKey] ?? null;
    const avg = avgMapDireto.get(`${itemId}|${cityKey(city)}`);
    const avgPreco = avg?.avg4w || avg?.avg1w || 0;

    if (entry && !isPriceStale(entry.data)) return entry;
    if (avgPreco > 0) return { preco: avgPreco, data: '', quality: qualidadeAPI };
    return entry ?? null; // sell desatualizado como último recurso
  };

  // Direto: uma linha por cidade por combinação
  const direto = [];
  for (const { tier, enchant, directIds } of combData) {
    const melhorPorCidade = {};
    for (const itemId of directIds) {
      for (const cidade of TODAS_CIDADES) {
        const entry = getEntryDireto(itemId, cidade);
        const cidadeNorm = normalizarCidade(cidade);
        const preco = entry?.preco ?? 0;
        const teleporte = preco > 0 && cidadeNorm !== cidadeDestinoNormalizada
          ? calcularCustoTeleporte(itemId, cidadeNorm, cidadeDestinoNormalizada)
          : 0;
        const custoFinal = preco > 0 ? preco + teleporte : 0;
        if (!melhorPorCidade[cidade] || (custoFinal > 0 && custoFinal < melhorPorCidade[cidade].custoFinal)) {
          melhorPorCidade[cidade] = {
            itemId, nome: nomeItemEmPortugues(itemId),
            tier, enchant,
            cidadeOrigem: cidade, cidadeDestino,
            preco,
            custoTeleporte: teleporte,
            custoFinal,
            data: String(entry?.data || ''),
            quality: Number(entry?.quality || qualidadeAPI),
          };
        }
      }
    }
    // Garantir que todas as 6 cidades apareçam, mesmo sem preço
    for (const cidade of TODAS_CIDADES) {
      if (!melhorPorCidade[cidade]) {
        melhorPorCidade[cidade] = {
          itemId: null, nome: null,
          tier, enchant,
          cidadeOrigem: cidade, cidadeDestino,
          preco: 0, custoTeleporte: 0, custoFinal: 0, data: '', quality: qualidadeAPI,
        };
      }
      direto.push(melhorPorCidade[cidade]);
    }
  }
  direto.sort((a, b) => {
    if (a.tier !== b.tier) return b.tier.localeCompare(a.tier);
    if (a.enchant !== b.enchant) return a.enchant - b.enchant;
    if (a.custoFinal === 0 && b.custoFinal !== 0) return 1;
    if (b.custoFinal === 0 && a.custoFinal !== 0) return -1;
    return a.custoFinal - b.custoFinal;
  });

  // Encantando: melhor caminho por combinação (enchant > 0)
  const encantando = [];
  for (const { tier, enchant, baseIds } of combData) {
    if (enchant === 0) continue;
    const alts = await calcularAlternativasEncantamento({
      baseItemIds: baseIds,
      tier,
      encantamento: enchant,
      cidadeDestinoNormalizada,
    });
    if (alts.length > 0) encantando.push({ ...alts[0], tier, enchant });
  }
  encantando.sort((a, b) => a.custoFinal - b.custoFinal);

  console.log(`[equipBuy] nivel=${N} → ${combData.length} combinações, ${direto.length} direto, ${encantando.length} encantando`);
  return { direto, encantando };
}

/**
 * Busca um equipamento específico em todas as cidades e calcula o preço final
 * considerando o custo de teleporte para trazer para a cidade selecionada.
 */
export async function buscarEquipamentoPorNomeComTeleporte({
  equipamentoNome,
  tier,
  qualidade,
  cidadeDestino,
  encantamento,
}) {
  const cidadeDestinoNormalizada = normalizarCidade(cidadeDestino);

  let todosItens = [];
  try {
    todosItens = await gerarListaItens('Todos');
  } catch (e) {
    console.error('[equipBuy] Erro ao gerar lista de itens:', e.message);
    return [];
  }

  const termoBusca = equipamentoNome.toLowerCase();
  let itensFiltrados = todosItens.filter(itemId => {
    const base = itemId.split('@')[0];
    if (!base.startsWith(tier)) return false;
    const nomeItem = nomeItemEmPortugues(itemId).toLowerCase();
    return nomeItem.includes(termoBusca);
  });

  if (itensFiltrados.length === 0) {
    console.log(`[equipBuy] Nenhum item encontrado: ${equipamentoNome} (${tier})`);
    return [];
  }

  const encStr = String(encantamento ?? '');
  if (encStr !== '' && encStr !== 'Todos') {
    const nivel = parseInt(encStr, 10);
    if (nivel === 0) {
      itensFiltrados = itensFiltrados.filter(id => !id.includes('@') || id.endsWith('@0'));
    } else {
      itensFiltrados = itensFiltrados.filter(id => id.endsWith(`@${nivel}`));
    }
  }

  if (itensFiltrados.length === 0) {
    console.log(`[equipBuy] Nenhum item para encantamento ${encantamento}`);
    return [];
  }

  const qualidadeAPI = (parseInt(qualidade) || 0) + 1;

  let precos = [];
  try {
    precos = await fetchPricesMarket(itensFiltrados, TODAS_CIDADES, qualidadeAPI);
  } catch (e) {
    console.error('[equipBuy] Erro ao buscar preços:', e.message);
    return [];
  }

  if (!precos || precos.length === 0) return [];

  const resultados = [];

  for (const p of precos) {
    const { item_id, city, sell_price_min, sell_price_min_date, quality } = p;
    const precoNumero = Number(sell_price_min) || 0;
    if (precoNumero === 0) continue;

    const cidadeNormalizada = normalizarCidade(city);
    const eMesmaCidade = cidadeNormalizada === cidadeDestinoNormalizada;
    const custoTeleporte = eMesmaCidade
      ? 0
      : calcularCustoTeleporte(item_id, cidadeNormalizada, cidadeDestinoNormalizada);

    const custoTeleporteNumero = Number(custoTeleporte) || 0;
    const custoFinal = precoNumero + custoTeleporteNumero;

    const enchantMatch = item_id.match(/@(\d)$/);
    const enchant = enchantMatch ? parseInt(enchantMatch[1], 10) : 0;

    resultados.push({
      itemId: item_id,
      nome: nomeItemEmPortugues(item_id),
      cidadeOrigem: String(city || ''),
      cidadeDestino: String(cidadeDestino || ''),
      enchant: Number(enchant) || 0,
      preco: precoNumero,
      custoTeleporte: custoTeleporteNumero,
      custoFinal,
      data: String(sell_price_min_date || ''),
      quality: Number(quality || qualidadeAPI),
    });
  }

  resultados.sort((a, b) => {
    if (a.custoFinal !== b.custoFinal) return a.custoFinal - b.custoFinal;
    return a.enchant - b.enchant;
  });

  const encNivel = parseInt(encantamento, 10) || 0;
  const baseItemIds = [...new Set(itensFiltrados.map(id => id.split('@')[0]))];
  const encantando = await calcularAlternativasEncantamento({
    baseItemIds,
    tier,
    encantamento: encNivel,
    cidadeDestinoNormalizada,
  });

  console.log(`[equipBuy] ${resultados.length} direto, ${encantando.length} encantando`);
  return { direto: resultados, encantando };
}
