import { gerarListaItens } from './marketItems.js';
import { fetchPricesMarket } from './marketPrices.js';
import { nomeItemEmPortugues } from './marketConstants.js';
import { ENCHANT_RESOURCE_AMOUNTS, fetchEnchantResourcePrices } from './enchantUtils.js';

// Mapeamento de equivalência de tiers para o mesmo "power level"
const TIER_EQUIVALENTS = {
  T4: ['T4', 'T3.1', 'T2.2', 'T1.3'],
  T5: ['T5', 'T4.1', 'T3.2', 'T2.3'],
  T6: ['T6', 'T5.1', 'T4.2', 'T3.3'],
  T7: ['T7', 'T6.1', 'T5.2', 'T4.3'],
  T8: ['T8', 'T7.1', 'T6.2', 'T5.3'],
};

// Recursos de encantamento por nível
const ENCHANT_RESOURCES = {
  1: { item: 'RUNE', label: 'Runa' },
  2: { item: 'SOUL', label: 'Alma' },
  3: { item: 'RELIC', label: 'Relíquia' },
  4: { item: 'SHARD', label: 'Fragmento' },
};

export async function calcularMelhorEquipOption({ slot, tier, cidade, equipamento }) {
  // 1. Gerar lista de itens equivalentes ao tier
  const equivalentes = TIER_EQUIVALENTS[tier] || [tier];
  // 2. Filtrar itens do slot e nome
  const todosItens = await gerarListaItens(slot);
  const itensFiltrados = todosItens.filter((id) => {
    // Exemplo: T7_MAIN_SWORD@3
    const base = id.split('@')[0];
    return (
      equivalentes.some((t) => base.startsWith(t)) &&
      (!equipamento || nomeItemEmPortugues(id).toLowerCase().includes(equipamento.toLowerCase()))
    );
  });
  if (itensFiltrados.length === 0) return [];

  // 3. Buscar preços dos itens base e encantados
  const cidades = cidade === 'Todos' ? undefined : [cidade];
  const precos = await fetchPricesMarket(itensFiltrados, cidades);

  // 4. Para cada item, calcular custo de encantar até o nível máximo disponível
  const resultados = [];
  for (const p of precos) {
    const { item_id, city, sell_price_min, sell_price_min_date } = p;
    // Exemplo de ID: T7_MAIN_SWORD@3
    const [baseId, enchantStr] = item_id.split('@');
    const enchant = parseInt(enchantStr || '0', 10);
    // Calcular custo para encantar até o próximo nível (se possível)
    if (enchant < 4) {
      // Buscar preço do recurso de encantamento necessário
      const recursoPrecos = await fetchEnchantResourcePrices(tier, enchant, enchant + 1, cidade);
      const recurso = recursoPrecos[0];
      const recursoQtd = ENCHANT_RESOURCE_AMOUNTS[tier]?.[enchant + 1] || 0;
      const custoRecurso = recurso ? (recurso.sell_price_min || 0) * recursoQtd : 0;
      const custoTotal = (sell_price_min || 0) + custoRecurso;
      resultados.push({
        itemId: item_id,
        nome: nomeItemEmPortugues(item_id),
        cidade: city,
        preco: sell_price_min,
        data: sell_price_min_date,
        encantamento: enchant,
        recurso: recurso ? recurso.item_id : null,
        recursoQtd,
        precoRecurso: recurso ? recurso.sell_price_min : null,
        custoTotal,
      });
    } else {
      // Já está no máximo, não pode encantar mais
      resultados.push({
        itemId: item_id,
        nome: nomeItemEmPortugues(item_id),
        cidade: city,
        preco: sell_price_min,
        data: sell_price_min_date,
        encantamento: enchant,
        recurso: null,
        recursoQtd: 0,
        precoRecurso: null,
        custoTotal: sell_price_min || 0,
      });
    }
  }
  // Ordenar pelo custo total crescente
  resultados.sort((a, b) => (a.custoTotal || 0) - (b.custoTotal || 0));
  return resultados;
}
