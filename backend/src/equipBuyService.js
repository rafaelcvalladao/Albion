import { fetchPricesMarket } from './marketPrices.js';
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

const MATERIAL_NOME = { RUNE: 'Runa', SOUL: 'Alma', RELIC: 'Relíquia', SHARD: 'Fragmento' };

async function calcularAlternativasEncantamento({ baseItemIds, tier, encantamento, cidadeDestinoNormalizada }) {
  if (encantamento <= 0 || !baseItemIds.length) return [];

  const qty = getEnchantQtyBySlot(baseItemIds[0]);
  const melhorPorCidade = {};

  for (let fromLevel = 0; fromLevel < encantamento; fromLevel++) {
    const levelItemIds = fromLevel === 0
      ? baseItemIds
      : baseItemIds.map(id => `${id}@${fromLevel}`);

    const materialIds = [];
    for (let lvl = fromLevel + 1; lvl <= encantamento; lvl++) {
      materialIds.push(getEnchantResourceId(tier, lvl));
    }

    let precos;
    try {
      precos = await fetchPricesMarket([...levelItemIds, ...materialIds], TODAS_CIDADES);
    } catch {
      continue;
    }

    // city → itemId → min price
    const cityPrices = {};
    for (const p of precos) {
      const price = Number(p.sell_price_min);
      if (!price) continue;
      if (!cityPrices[p.city]) cityPrices[p.city] = {};
      const curr = cityPrices[p.city][p.item_id];
      if (!curr || price < curr) cityPrices[p.city][p.item_id] = price;
    }

    for (const [city, items] of Object.entries(cityPrices)) {
      let melhorItemId = null;
      let melhorItemPreco = 0;
      for (const id of levelItemIds) {
        const p = items[id] || 0;
        if (p > 0 && (!melhorItemPreco || p < melhorItemPreco)) {
          melhorItemPreco = p;
          melhorItemId = id;
        }
      }
      if (!melhorItemPreco) continue;

      let custoMateriais = 0;
      let allOk = true;
      for (const matId of materialIds) {
        const p = items[matId] || 0;
        if (!p) { allOk = false; break; }
        custoMateriais += p * qty;
      }
      if (!allOk) continue;

      const cidadeNorm = normalizarCidade(city);
      const teleporte = cidadeNorm === cidadeDestinoNormalizada ? 0
        : calcularCustoTeleporte(melhorItemId, cidadeNorm, cidadeDestinoNormalizada);
      const custoFinal = melhorItemPreco + custoMateriais + teleporte;

      if (!melhorPorCidade[city] || custoFinal < melhorPorCidade[city].custoFinal) {
        const matNomes = materialIds.map(id => {
          const tipo = MATERIAL_NOME[id.split('_')[1]] || id.split('_')[1];
          return `${tipo} ${tier.slice(1)}`;
        });
        melhorPorCidade[city] = {
          cidadeOrigem: city,
          pathDesc: `.${fromLevel} + ${matNomes.join(' + ')} ×${qty}`,
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

  // Filtrar por nome e tier
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

  // Filtrar por encantamento se especificado
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

  console.log(`[equipBuy] ${itensFiltrados.length} itens para: ${equipamentoNome} (${tier}) enc=${encantamento}`);

  // Qualidade: frontend usa 0-based (0=Normal,1=Bom...), API usa 1-based (1=Normal,2=Bom...)
  const qualidadeAPI = (parseInt(qualidade) || 0) + 1;

  let precos = [];
  try {
    precos = await fetchPricesMarket(itensFiltrados, TODAS_CIDADES, qualidadeAPI);
  } catch (e) {
    console.error('[equipBuy] Erro ao buscar preços:', e.message);
    return [];
  }

  if (!precos || precos.length === 0) {
    return [];
  }

  const resultados = [];

  for (const p of precos) {
    const { item_id, city, sell_price_min, sell_price_min_date, quality } = p;

    const precoNumero = Number(sell_price_min) || 0;
    if (precoNumero === 0) continue; // sem ordens de mercado

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
      custoFinal: custoFinal,
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
