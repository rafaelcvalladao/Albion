import { fetchPricesMarket } from './marketPrices.js';
import { nomeItemEmPortugues, extrairInfoItem, calcularCustoTeleporte, CIDADES_SEGURAS } from './marketConstants.js';
import { gerarListaItens } from './marketItems.js';

/**
 * Normaliza o nome da cidade para o formato esperado (ex: "Fort Sterling" -> "FortSterling")
 */
function normalizarCidade(cidade) {
  if (!cidade) return '';
  // Remove espaços e mantém a capitalização correta
  return cidade
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

/**
 * Busca um equipamento específico em todas as cidades e calcula o preço final
 * considerando o custo de teleporte para trazer para a cidade selecionada.
 * 
 * @param {string} equipamentoNome - Nome do equipamento (ex: "Espada de Guerra")
 * @param {string} tier - Tier do item (ex: "T7")
 * @param {number} qualidade - Qualidade do item (1-5)
 * @param {string} cidadeDestino - Cidade para onde trazer o item (ex: "Fort Sterling")
 * @returns {Promise<Array>} Lista de opções com preço final + teleporte
 */
export async function buscarEquipamentoPorNomeComTeleporte({ 
  equipamentoNome, 
  tier, 
  qualidade, 
  cidadeDestino 
}) {
  // Normalizar cidade destino
  const cidadeDestinoNormalizada = normalizarCidade(cidadeDestino);

  // 1. Gerar lista de TODOS os itens
  let todosItens = [];
  try {
    todosItens = await gerarListaItens('Todos');
  } catch (e) {
    console.error('[buscarEquipamentoPorNomeComTeleporte] Erro ao gerar lista de itens:', e.message);
    return [];
  }

  // 2. Filtrar por nome (case-insensitive) e tier
  const termoBusca = equipamentoNome.toLowerCase();
  const itensFiltrados = todosItens.filter(itemId => {
    // O ID tem formato como: T7_MAIN_SWORD ou T7_MAIN_SWORD@3
    const base = itemId.split('@')[0]; // Remove enchantment se existe
    
    // Verificar se começa com o tier correto
    if (!base.startsWith(tier)) return false;
    
    // Verificar se o nome em português contém o termo de busca
    const nomeItem = nomeItemEmPortugues(itemId).toLowerCase();
    return nomeItem.includes(termoBusca);
  });

  if (itensFiltrados.length === 0) {
    console.log(`[buscarEquipamentoPorNomeComTeleporte] Nenhum item encontrado para: ${equipamentoNome} (${tier})`);
    return [];
  }

  console.log(`[buscarEquipamentoPorNomeComTeleporte] ${itensFiltrados.length} itens encontrados para: ${equipamentoNome} (${tier})`);

  // 3. Buscar preços em TODAS as cidades (não filtrar)
  let precos = [];
  try {
    precos = await fetchPricesMarket(itensFiltrados, undefined, qualidade);
  } catch (e) {
    console.error('[buscarEquipamentoPorNomeComTeleporte] Erro ao buscar preços:', e.message);
    return [];
  }

  if (!precos || precos.length === 0) {
    console.log(`[buscarEquipamentoPorNomeComTeleporte] Nenhum preço encontrado para os itens filtrados`);
    return [];
  }

  // 4. Processar preços diretos (mantendo TODAS as variações de encantamento)
  const resultados = [];
  
  for (const p of precos) {
    const { item_id, city, sell_price_min, sell_price_min_date, quality } = p;
    
    // Validar que é a qualidade correta
    if (quality && quality !== qualidade) continue;

    const cidadeNormalizada = normalizarCidade(city);
    const eMesmaCidade = cidadeNormalizada === cidadeDestinoNormalizada;
    const custoTeleporte = eMesmaCidade 
      ? 0 
      : calcularCustoTeleporte(item_id, cidadeNormalizada, cidadeDestinoNormalizada);
    
    const precoNumero = Number(sell_price_min) || 0;
    const custoTeleporteNumero = Number(custoTeleporte) || 0;
    const custoFinal = precoNumero + custoTeleporteNumero;

    // Extrair nível de encantamento do item_id
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
      quality: Number(quality || qualidade),
    });
  }

  // 5. Ordenar pelo custo final (menor primeiro), depois por encantamento
  resultados.sort((a, b) => {
    if (a.custoFinal !== b.custoFinal) {
      return a.custoFinal - b.custoFinal;
    }
    return a.enchant - b.enchant;
  });
  
  console.log(`[buscarEquipamentoPorNomeComTeleporte] ${resultados.length} resultados retornados`);
  
  return resultados;
}
