import { fetchPricesMarket } from './marketPrices.js';

// Quantidade de materiais de encantamento por slot de equipamento
export function getEnchantQtyBySlot(itemId) {
  const upper = (itemId || '').split('@')[0].toUpperCase();
  if (upper.includes('_MAIN_') || upper.includes('_2H_') || upper.includes('_OFF_')) return 384;
  if (upper.includes('_BODY_') || upper.includes('_CAPE')) return 192; // peitoral e capas
  return 96; // HEAD, FEET
}

// Quantidade de recursos para encantar por tier/nível
// Exemplo: { 'T4': { 1: 16, 2: 8, 3: 4, 4: 1 }, ... }
export const ENCHANT_RESOURCE_AMOUNTS = {
  T4: { 1: 16, 2: 8, 3: 4, 4: 1 },
  T5: { 1: 32, 2: 16, 3: 8, 4: 2 },
  T6: { 1: 48, 2: 24, 3: 12, 4: 3 },
  T7: { 1: 64, 2: 32, 3: 16, 4: 4 },
  T8: { 1: 80, 2: 40, 3: 20, 4: 5 },
};

// IDs dos recursos de encantamento por tier/nível
export function getEnchantResourceId(tier, enchantLevel) {
  // Exemplo: T4_RUNE, T5_SOUL, T6_RELIC, T7_SHARD
  const base = { 1: 'RUNE', 2: 'SOUL', 3: 'RELIC', 4: 'SHARD' }[enchantLevel];
  return `${tier}_${base}`;
}

// Busca preços dos recursos de encantamento necessários para um item
export async function fetchEnchantResourcePrices(tier, fromEnchant, toEnchant, cidade) {
  const ids = [];
  for (let lvl = fromEnchant + 1; lvl <= toEnchant; lvl++) {
    ids.push(getEnchantResourceId(tier, lvl));
  }
  if (ids.length === 0) return [];
  const precos = await fetchPricesMarket(ids, cidade === 'Todos' ? undefined : [cidade]);
  return precos;
}
