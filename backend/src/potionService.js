import { fetchPrices, fetchHistory } from './albionClient.js';
import { calcularRrrManual } from './refiningService.js';

const BATCH_SIZE = 5;

// ─── Pesos dos itens (kg) — extraídos do items.xml do jogo ───
// Ingredientes: herbs, ovos, leite, álcool, manteiga, rare drops
// Outputs: cada poção por tier
const ITEM_WEIGHTS = {
  // Herbs (todos pesam 0.6)
  T2_AGARIC: 0.6, T3_COMFREY: 0.6, T4_BURDOCK: 0.6, T5_TEASEL: 0.6,
  T6_FOXGLOVE: 0.6, T7_MULLEIN: 0.6, T8_YARROW: 0.6,
  // Ovos e leite (farm products, 0.6)
  T3_EGG: 0.6, T5_EGG: 0.6,
  T4_MILK: 0.6, T6_MILK: 0.6, T8_MILK: 0.6,
  // Álcool (consumíveis leves, 0.1)
  T6_ALCOHOL: 0.1, T7_ALCOHOL: 0.1, T8_ALCOHOL: 0.1,
  // Manteiga (farm product, 0.6)
  T4_BUTTER: 0.6, T6_BUTTER: 0.6, T8_BUTTER: 0.6,
  // Rare drops (Werewolf Fangs / Elemental Remnants, 0.1)
  T3_ALCHEMY_RARE_WEREWOLF: 0.1, T5_ALCHEMY_RARE_WEREWOLF: 0.1, T7_ALCHEMY_RARE_WEREWOLF: 0.1,
  T3_ALCHEMY_RARE_ELEMENTAL: 0.1, T5_ALCHEMY_RARE_ELEMENTAL: 0.1, T7_ALCHEMY_RARE_ELEMENTAL: 0.1,
  // Output potions (por tier — extraídos do items.xml)
  T2_POTION_HEAL: 0.1, T4_POTION_HEAL: 0.3, T6_POTION_HEAL: 0.87,
  T2_POTION_ENERGY: 0.1, T4_POTION_ENERGY: 0.3, T6_POTION_ENERGY: 0.87,
  T3_POTION_STONESKIN: 0.1, T5_POTION_STONESKIN: 0.42, T7_POTION_STONESKIN: 1.44,
  T3_POTION_REVIVE: 0.1, T5_POTION_REVIVE: 0.42, T7_POTION_REVIVE: 1.15,
  T4_POTION_COOLDOWN: 0.14, T6_POTION_COOLDOWN: 0.53, T8_POTION_COOLDOWN: 1.44,
  T4_POTION_BERSERK: 0.1, T6_POTION_BERSERK: 0.42, T8_POTION_BERSERK: 1.47,
  T4_POTION_GATHER: 0.1, T6_POTION_GATHER: 0.44, T8_POTION_GATHER: 1.48,
};

// Vizinhança entre cidades (Brecilien e Caerleon não têm vizinhos)
const CITY_NEIGHBORS = {
  Bridgewatch: new Set(['Lymhurst', 'Martlock']),
  'Fort Sterling': new Set(['Thetford', 'Lymhurst']),
  Lymhurst: new Set(['Fort Sterling', 'Bridgewatch']),
  Martlock: new Set(['Bridgewatch', 'Thetford']),
  Thetford: new Set(['Martlock', 'Fort Sterling']),
  Brecilien: new Set(),
  Caerleon: new Set(),
};

const TELEPORT_RATE = 173.4;
const TELEPORT_MIN_VIZ = 92;
const TELEPORT_MIN_FAR = 184;

// Custo de teleporte por unidade de item entre duas cidades
function teleportePorUnidade(itemId, cidadeOrigem, cidadeDestino) {
  if (cidadeOrigem === cidadeDestino) return 0;
  if (cidadeOrigem === 'Caerleon' || cidadeDestino === 'Caerleon') return 0;
  const peso = ITEM_WEIGHTS[itemId] ?? 1.0;
  const vizinha = CITY_NEIGHBORS[cidadeOrigem]?.has(cidadeDestino) ?? false;
  if (vizinha) {
    return Math.max(TELEPORT_MIN_VIZ, Math.floor(peso * TELEPORT_RATE));
  }
  return Math.max(TELEPORT_MIN_FAR, Math.floor(peso * TELEPORT_RATE * 2));
}

const CITIES = [
  { key: 'bridgewatch', name: 'Bridgewatch' },
  { key: 'fortstering', name: 'Fort Sterling' },
  { key: 'lymhurst', name: 'Lymhurst' },
  { key: 'martlock', name: 'Martlock' },
  { key: 'thetford', name: 'Thetford' },
  { key: 'brecilien', name: 'Brecilien' },
  { key: 'caerleon', name: 'Caerleon' },
];

// Receitas extraídas diretamente do items.xml do ao-bin-dumps (batch de 5 poções)
const POTION_TYPES = [
  {
    id: 'HEAL',
    name: 'Poção de Cura',
    tiers: [
      {
        tier: 'T2',
        output: 'T2_POTION_HEAL',
        ingredients: [{ id: 'T2_AGARIC', qty: 8 }],
      },
      {
        tier: 'T4',
        output: 'T4_POTION_HEAL',
        ingredients: [{ id: 'T4_BURDOCK', qty: 24 }, { id: 'T3_EGG', qty: 6 }],
      },
      {
        tier: 'T6',
        output: 'T6_POTION_HEAL',
        ingredients: [{ id: 'T6_FOXGLOVE', qty: 72 }, { id: 'T5_EGG', qty: 18 }, { id: 'T6_ALCOHOL', qty: 18 }],
      },
    ],
  },
  {
    id: 'ENERGY',
    name: 'Poção de Energia',
    tiers: [
      {
        tier: 'T2',
        output: 'T2_POTION_ENERGY',
        ingredients: [{ id: 'T2_AGARIC', qty: 8 }],
      },
      {
        tier: 'T4',
        output: 'T4_POTION_ENERGY',
        ingredients: [{ id: 'T4_BURDOCK', qty: 24 }, { id: 'T4_MILK', qty: 6 }],
      },
      {
        tier: 'T6',
        output: 'T6_POTION_ENERGY',
        ingredients: [{ id: 'T6_FOXGLOVE', qty: 72 }, { id: 'T6_MILK', qty: 18 }, { id: 'T6_ALCOHOL', qty: 18 }],
      },
    ],
  },
  {
    id: 'STONESKIN',
    name: 'Poção de Resistência',
    tiers: [
      {
        tier: 'T3',
        output: 'T3_POTION_STONESKIN',
        ingredients: [{ id: 'T3_COMFREY', qty: 8 }],
      },
      {
        tier: 'T5',
        output: 'T5_POTION_STONESKIN',
        ingredients: [{ id: 'T5_TEASEL', qty: 24 }, { id: 'T4_BURDOCK', qty: 12 }, { id: 'T4_MILK', qty: 6 }],
      },
      {
        tier: 'T7',
        output: 'T7_POTION_STONESKIN',
        ingredients: [
          { id: 'T7_MULLEIN', qty: 72 },
          { id: 'T6_FOXGLOVE', qty: 36 },
          { id: 'T4_BURDOCK', qty: 36 },
          { id: 'T6_MILK', qty: 18 },
          { id: 'T7_ALCOHOL', qty: 18 },
        ],
      },
    ],
  },
  {
    id: 'GIGANTIFY',
    name: 'Poção Gigantify',
    tiers: [
      {
        tier: 'T3',
        output: 'T3_POTION_REVIVE',
        ingredients: [{ id: 'T3_COMFREY', qty: 8 }],
      },
      {
        tier: 'T5',
        output: 'T5_POTION_REVIVE',
        ingredients: [{ id: 'T5_TEASEL', qty: 24 }, { id: 'T4_BURDOCK', qty: 12 }, { id: 'T5_EGG', qty: 6 }],
      },
      {
        tier: 'T7',
        output: 'T7_POTION_REVIVE',
        ingredients: [
          { id: 'T7_MULLEIN', qty: 72 },
          { id: 'T6_FOXGLOVE', qty: 36 },
          { id: 'T5_EGG', qty: 18 },
          { id: 'T7_ALCOHOL', qty: 18 },
        ],
      },
    ],
  },
  {
    id: 'POISON',
    name: 'Poção de Veneno',
    tiers: [
      {
        tier: 'T4',
        output: 'T4_POTION_COOLDOWN',
        ingredients: [{ id: 'T4_BURDOCK', qty: 8 }, { id: 'T3_COMFREY', qty: 4 }],
      },
      {
        tier: 'T6',
        output: 'T6_POTION_COOLDOWN',
        ingredients: [
          { id: 'T6_FOXGLOVE', qty: 24 },
          { id: 'T5_TEASEL', qty: 12 },
          { id: 'T3_COMFREY', qty: 12 },
          { id: 'T6_MILK', qty: 6 },
        ],
      },
      {
        tier: 'T8',
        output: 'T8_POTION_COOLDOWN',
        ingredients: [
          { id: 'T8_YARROW', qty: 72 },
          { id: 'T7_MULLEIN', qty: 36 },
          { id: 'T5_TEASEL', qty: 36 },
          { id: 'T8_MILK', qty: 18 },
          { id: 'T8_ALCOHOL', qty: 18 },
        ],
      },
    ],
  },
  {
    id: 'BERSERK',
    name: 'Poção Berserk',
    // Ingrediente especial: Werewolf Fangs (drop de mob) — T3=Rugged, T5=Fine, T7=Pristine
    tiers: [
      {
        tier: 'T4',
        output: 'T4_POTION_BERSERK',
        ingredients: [
          { id: 'T3_ALCHEMY_RARE_WEREWOLF', qty: 1 },
          { id: 'T4_BURDOCK', qty: 16 },
        ],
      },
      {
        tier: 'T6',
        output: 'T6_POTION_BERSERK',
        ingredients: [
          { id: 'T5_ALCHEMY_RARE_WEREWOLF', qty: 1 },
          { id: 'T6_FOXGLOVE', qty: 48 },
          { id: 'T2_AGARIC', qty: 24 },
          { id: 'T6_ALCOHOL', qty: 12 },
        ],
      },
      {
        tier: 'T8',
        output: 'T8_POTION_BERSERK',
        ingredients: [
          { id: 'T7_ALCHEMY_RARE_WEREWOLF', qty: 1 },
          { id: 'T8_YARROW', qty: 144 },
          { id: 'T3_COMFREY', qty: 72 },
          { id: 'T6_ALCOHOL', qty: 72 },
          { id: 'T7_ALCOHOL', qty: 36 },
          { id: 'T8_ALCOHOL', qty: 36 },
        ],
      },
    ],
  },
  {
    id: 'GATHER',
    name: 'Poção de Coleta',
    // Ingrediente especial: Elemental Remnants (drop de mob) — T3=Rugged, T5=Fine, T7=Pristine
    tiers: [
      {
        tier: 'T4',
        output: 'T4_POTION_GATHER',
        ingredients: [
          { id: 'T3_ALCHEMY_RARE_ELEMENTAL', qty: 1 },
          { id: 'T4_BUTTER', qty: 16 },
        ],
      },
      {
        tier: 'T6',
        output: 'T6_POTION_GATHER',
        ingredients: [
          { id: 'T5_ALCHEMY_RARE_ELEMENTAL', qty: 1 },
          { id: 'T6_BUTTER', qty: 48 },
          { id: 'T6_FOXGLOVE', qty: 24 },
          { id: 'T5_TEASEL', qty: 12 },
        ],
      },
      {
        tier: 'T8',
        output: 'T8_POTION_GATHER',
        ingredients: [
          { id: 'T7_ALCHEMY_RARE_ELEMENTAL', qty: 1 },
          { id: 'T8_BUTTER', qty: 144 },
          { id: 'T8_YARROW', qty: 72 },
          { id: 'T7_MULLEIN', qty: 72 },
          { id: 'T6_FOXGLOVE', qty: 36 },
          { id: 'T8_ALCOHOL', qty: 36 },
        ],
      },
    ],
  },
];

function ck(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '');
}

function buildPriceMaps(rawPrices) {
  const priceMap = new Map(); // item_id -> cityKey -> sell_price_min
  const dateMap = new Map();  // item_id -> cityKey -> sell_price_min_date
  for (const entry of rawPrices) {
    const price = entry.sell_price_min;
    if (!price || price <= 0) continue;
    const itemId = entry.item_id;
    const cityKey = ck(entry.city);
    if (!priceMap.has(itemId)) { priceMap.set(itemId, new Map()); dateMap.set(itemId, new Map()); }
    const current = priceMap.get(itemId).get(cityKey) || 0;
    if (current === 0 || price < current) {
      priceMap.get(itemId).set(cityKey, price);
      dateMap.get(itemId).set(cityKey, entry.sell_price_min_date || null);
    }
  }
  return { priceMap, dateMap };
}

function buildVolumeMap(histData) {
  // item_id -> cityKey -> avg daily volume (últimas 72h / 3 dias)
  const volMap = new Map();
  for (const entry of histData) {
    const itemId = entry.item_id;
    const cityKey = ck(entry.location);
    if (!entry.data || entry.data.length === 0) { volMap.set(`${itemId}|${cityKey}`, 0); continue; }
    const sorted = [...entry.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const last72 = sorted.slice(-72);
    const total = last72.reduce((s, d) => s + (d.item_count || 0), 0);
    volMap.set(`${itemId}|${cityKey}`, Math.round(total / 3));
  }
  return volMap;
}

function getPrice(priceMap, itemId, cityKey) {
  return priceMap.get(itemId)?.get(cityKey) || 0;
}

function getDate(dateMap, itemId, cityKey) {
  return dateMap.get(itemId)?.get(cityKey) || null;
}

// Retorna a data mais antiga entre todas (o "gargalo" de atualização)
function oldestDate(dates) {
  let oldest = null;
  for (const d of dates) {
    if (!d) continue;
    if (!oldest || new Date(d) < new Date(oldest)) oldest = d;
  }
  return oldest;
}

export async function analyzePotions({ foco = false, dailyBonus = 0, taxaVenda = 6.5 } = {}) {
  const taxaVendaNota = 1 - taxaVenda / 100;

  // Coletar todos os item IDs necessários
  const allIds = new Set();
  const potionOutputIds = new Set();
  for (const pt of POTION_TYPES) {
    for (const tier of pt.tiers) {
      allIds.add(tier.output);
      potionOutputIds.add(tier.output);
      for (const ing of tier.ingredients) allIds.add(ing.id);
    }
  }

  const locationNames = CITIES.map(c => c.name);

  // Buscar preços e histórico em paralelo
  const [rawPrices, histData] = await Promise.all([
    fetchPrices([...allIds], locationNames),
    fetchHistory([...potionOutputIds], locationNames, 1), // timescale=1h para volume
  ]);

  const { priceMap, dateMap } = buildPriceMaps(rawPrices);
  const volMap = buildVolumeMap(histData);

  // ─── Análise mesma cidade ───
  const sameCidade = [];
  for (const pt of POTION_TYPES) {
    for (const tier of pt.tiers) {
      for (const city of CITIES) {
        const isBrecilien = city.name === 'Brecilien';
        const rrr = calcularRrrManual(foco, isBrecilien, dailyBonus);

        let ingTotal = 0;
        let valid = true;
        for (const ing of tier.ingredients) {
          const p = getPrice(priceMap, ing.id, city.key);
          if (p <= 0) { valid = false; break; }
          ingTotal += p * ing.qty;
        }
        if (!valid) continue;

        const potionPrice = getPrice(priceMap, tier.output, city.key);
        if (potionPrice <= 0) continue;

        const effectiveCost = ingTotal * (1 - rrr);
        const revenue = BATCH_SIZE * potionPrice * taxaVendaNota;
        const profit = revenue - effectiveCost;

        // Data mais antiga entre todos os preços desta linha
        const allDates = [
          getDate(dateMap, tier.output, city.key),
          ...tier.ingredients.map(ing => getDate(dateMap, ing.id, city.key)),
        ];
        const dataPreco = oldestDate(allDates);

        // Volume diário da poção nesta cidade
        const volumeDiario = volMap.get(`${tier.output}|${city.key}`) ?? 0;

        sameCidade.push({
          potionId: pt.id,
          potionName: pt.name,
          tier: tier.tier,
          output: tier.output,
          city: city.name,
          ingTotal: Math.round(ingTotal),
          effectiveCost: Math.round(effectiveCost),
          potionPrice,
          revenue: Math.round(revenue),
          profit: Math.round(profit),
          profitPerUnit: Math.round(profit / BATCH_SIZE),
          margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
          rrr: Math.round(rrr * 1000) / 10,
          dataPreco,
          volumeDiario,
        });
      }
    }
  }

  sameCidade.sort((a, b) => b.profit - a.profit);

  // ─── Análise via Brecilien (rota otimizada) ───
  const rrr_brec = calcularRrrManual(foco, true, dailyBonus);
  const brecilien = [];

  for (const pt of POTION_TYPES) {
    for (const tier of pt.tiers) {
      // Menor preço de cada ingrediente entre todas as cidades
      let ingTotal = 0;
      let valid = true;
      const ingDetalhes = [];

      for (const ing of tier.ingredients) {
        let minPrice = 0;
        let minCity = '';
        for (const city of CITIES) {
          const p = getPrice(priceMap, ing.id, city.key);
          if (p > 0 && (minPrice === 0 || p < minPrice)) {
            minPrice = p;
            minCity = city.name;
          }
        }
        if (minPrice === 0) { valid = false; break; }
        ingTotal += minPrice * ing.qty;
        ingDetalhes.push({ id: ing.id, qty: ing.qty, price: minPrice, city: minCity });
      }
      if (!valid) continue;

      // Custo de teleporte dos ingredientes → Brecilien
      let teleportIng = 0;
      for (const ing of ingDetalhes) {
        if (ing.city !== 'Brecilien') {
          teleportIng += teleportePorUnidade(ing.id, ing.city, 'Brecilien') * ing.qty;
        }
      }

      // Melhor cidade para vender a poção (considera custo de teleporte na saída)
      // Para cada cidade, calcula receita líquida = receita - teleporte das poções de Brecilien até ela
      let bestNetRevenue = 0;
      let maxPrice = 0;
      let bestCity = '';
      let teleportPocao = 0;
      for (const city of CITIES) {
        const p = getPrice(priceMap, tier.output, city.key);
        if (p <= 0) continue;
        const tpPocao = city.name !== 'Brecilien'
          ? teleportePorUnidade(tier.output, 'Brecilien', city.name) * BATCH_SIZE
          : 0;
        const netRevenue = BATCH_SIZE * p * taxaVendaNota - tpPocao;
        if (netRevenue > bestNetRevenue) {
          bestNetRevenue = netRevenue;
          maxPrice = p;
          bestCity = city.name;
          teleportPocao = tpPocao;
        }
      }
      if (maxPrice === 0) continue;

      const effectiveCost = ingTotal * (1 - rrr_brec);
      const revenue = BATCH_SIZE * maxPrice * taxaVendaNota;
      const totalTeleport = teleportIng + teleportPocao;
      const profit = revenue - effectiveCost - totalTeleport;

      // Data mais antiga entre todos os ingredientes (pior caso de atualização)
      const allIngDates = ingDetalhes.map(ing => getDate(dateMap, ing.id, ck(ing.city)));
      allIngDates.push(getDate(dateMap, tier.output, ck(bestCity)));
      const dataPreco = oldestDate(allIngDates);

      // Volume diário na melhor cidade de venda
      const volumeDiario = volMap.get(`${tier.output}|${ck(bestCity)}`) ?? 0;

      brecilien.push({
        potionId: pt.id,
        potionName: pt.name,
        tier: tier.tier,
        output: tier.output,
        sellCity: bestCity,
        sellPrice: maxPrice,
        ingTotal: Math.round(ingTotal),
        effectiveCost: Math.round(effectiveCost),
        revenue: Math.round(revenue),
        teleportIng: Math.round(teleportIng),
        teleportPocao: Math.round(teleportPocao),
        totalTeleport: Math.round(totalTeleport),
        profit: Math.round(profit),
        profitPerUnit: Math.round(profit / BATCH_SIZE),
        margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
        rrr: Math.round(rrr_brec * 1000) / 10,
        ingredientes: ingDetalhes,
        dataPreco,
        volumeDiario,
      });
    }
  }

  brecilien.sort((a, b) => b.profit - a.profit);

  return { sameCidade, brecilien };
}

export { POTION_TYPES, CITIES };
