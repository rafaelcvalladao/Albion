import { fetchPricesMarket } from './marketPrices.js';
import { nomeItemEmPortugues, calcularCustoTeleporte } from './marketConstants.js';
import { gerarListaItens } from './marketItems.js';

const TODAS_CIDADES = [
  'Bridgewatch',
  'FortSterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Caerleon',
  'Brecilien',
];

function normalizarCidade(cidade) {
  if (!cidade) return '';
  return cidade
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
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

  console.log(`[equipBuy] ${resultados.length} resultados retornados`);

  return resultados;
}
