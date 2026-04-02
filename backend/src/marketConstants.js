// Mapa de distâncias entre cidades (em relação à "vizinhança")
export const CITY_DISTANCES = {
  Bridgewatch: { FortSterling: 200, Lymhurst: 200, Martlock: 200, Thetford: 200, Brecilien: 100 },
  FortSterling: { Bridgewatch: 200, Lymhurst: 100, Martlock: 200, Thetford: 200, Brecilien: 200 },
  Lymhurst: { Bridgewatch: 200, FortSterling: 100, Martlock: 200, Thetford: 100, Brecilien: 200 },
  Martlock: { Bridgewatch: 200, FortSterling: 200, Lymhurst: 200, Thetford: 200, Brecilien: 200 },
  Thetford: { Bridgewatch: 200, FortSterling: 200, Lymhurst: 100, Martlock: 200, Brecilien: 200 },
  Brecilien: { Bridgewatch: 100, FortSterling: 200, Lymhurst: 200, Martlock: 200, Thetford: 200 },
};

// Mapa de pesos dos itens (em kg)
export const ITEM_WEIGHTS = {
  _MAIN_: 1.5,
  _2H_: 2.0,
  _RANGED_: 1.5,
  _BODY_: 2.5,
  _HEAD_: 1.0,
  _SHOES_: 0.5,
  _CAPE: 0.3,
  _GLOVES_: 0.5,
  _OFF_: 1.5,
  _SHIELD_: 2.0,
  _MOUNT_: 7.0,
  _POTION_: 0.1,
  _MEAL_: 0.2,
  _DRINK_: 0.1,
  _SPICE_: 0.05,
  _HERB_: 0.05,
  _RUNE: 0.3,
  _SOUL: 0.3,
  _RELIC: 0.3,
  _BAG: 1.0,
  _AMULET_: 0.2,
  _RING_: 0.1,
  _ORE_: 0.05,
  _WOOD_: 0.05,
  _LEATHER_: 0.05,
  _CLOTH_: 0.02,
  _PLANKS: 0.1,
};

// Multiplicador crítico (TCM) por tipo de item
export const ITEM_TCM = {
  _MAIN_: 1,
  _2H_: 1,
  _RANGED_: 1,
  _BODY_: 1,
  _HEAD_: 1,
  _SHOES_: 1,
  _CAPE: 1,
  _GLOVES_: 1,
  _OFF_: 1,
  _SHIELD_: 1,
  _MOUNT_: 1,
  _POTION_: 1,
  _MEAL_: 1,
  _DRINK_: 1,
  _SPICE_: 1,
  _HERB_: 1,
  _RUNE: 1,
  _SOUL: 1,
  _RELIC: 1,
  _AMULET_: 1,
  _RING_: 1,
  _BAG: 1,
  _ORE_: 75,
  _WOOD_: 75,
  _LEATHER_: 75,
  _CLOTH_: 75,
  _PLANKS: 75,
  _METAL: 75,
  _HIDE: 75,
  _FABRIC: 75,
  _NAILS: 75,
  _SCREWS: 75,
  _BOLTS: 75,
  _HINGES: 75,
};

export const GLOBAL_DISCOUNT = 0.15;

export const QUALITY_NAMES = {
  1: 'Normal',
  2: 'Bom',
  3: 'Excepcional',
  4: 'Excelente',
  5: 'Obra-prima',
};

export const CATEGORIAS = {
  Todos: [],
  Armas: [
    '_MAIN_BLOODLETTER',
    '_MAIN_DAGGER',
    '_MAIN_SWORD',
    '_MAIN_MACE',
    '_MAIN_AXE',
    '_MAIN_HAMMER',
    '_MAIN_SPEAR',
    '_MAIN_STAFF',
    '_MAIN_CURSEDSTAFF',
    '_MAIN_NATURESTAFF',
    '_MAIN_FIRESTAFF',
    '_MAIN_FROSTSTAFF',
    '_MAIN_HOLYSTAFF',
    '_2H_BOW',
    '_2H_CROSSBOW',
    '_2H_CARVINGSWORD',
    '_2H_GREATAXE',
    '_2H_MAUL',
    '_2H_HALBERD',
    '_2H_PIKE',
    '_2H_DUALAXE_KEEPER',
    '_2H_DUALAXE',
    '_2H_MACE',
    '_RANGED_BOW',
    '_RANGED_CROSSBOW',
  ],
  'Armaduras de Peitoral': [
    '_BODY_CLERICROBE',
    '_BODY_ASSASSINJACKET',
    '_BODY_SOLDIERARMOR',
    '_BODY_MAGE',
    '_BODY_CLOTHROBES',
    '_BODY_LEATHERARMOR',
    '_BODY_PLATEARMOR',
    '_BODY_CLOTH',
    '_BODY_LEATHER',
    '_BODY_PLATE',
  ],
  'Armaduras de Cabeça': [
    '_HEAD_HUNTER',
    '_HEAD_CLERICHOOD',
    '_HEAD_SOLDIERHELMET',
    '_HEAD_MAGE',
    '_HEAD_CLOTH',
    '_HEAD_LEATHER',
    '_HEAD_PLATE',
  ],
  'Armaduras de Calçado': [
    '_SHOES_SOLDIERBOOTS',
    '_SHOES_ASSASSINSHOES',
    '_SHOES_CLERICSHOES',
    '_SHOES_CLOTH',
    '_SHOES_LEATHER',
    '_SHOES_PLATE',
  ],
  'Mão Secundária': [
    '_SHIELD_TOWER',
    '_SHIELD_KITE',
    '_SHIELD_ROUND',
    '_OFF_DAGGER',
    '_OFF_SHIELD',
  ],
  Capas: [
    '_CAPE',
    '_CAPEITEM_FW_LYMHURST',
    '_CAPEITEM_FW_FORTSTERLING',
    '_CAPEITEM_FW_MARTLOCK',
    '_CAPEITEM_FW_THETFORD',
    '_CAPEITEM_FW_BRIDGEWATCH',
  ],
  Bolsas: ['_BAG_SMALL', '_BAG_MEDIUM', '_BAG_LARGE', '_BAG'],
  Montarias: [
    '_MOUNT_HORSE',
    '_MOUNT_OX',
    '_MOUNT_SWIFTCLAW',
    '_MOUNT_STAG',
    '_MOUNT_RAM',
    '_MOUNT_MOOSE',
  ],
  Consumível: [
    '_POTION_HEAL',
    '_POTION_ENERGY',
    '_POTION_POWER',
    '_POTION_FORCE',
    '_MEAL_STEAK',
    '_MEAL_OMELETTE',
    '_MEAL_STEW',
    '_MEAL_PIE',
    '_MEAL_BREAD',
    '_MEAL_CHEESE',
    '_DRINK_WATER',
    '_DRINK_BEER',
    '_SPICE_SUGAR',
    '_SPICE_SALT',
    '_SPICE_HERB',
  ],
  'Equipamento de Coleta': [
    '_ORE_COPPER',
    '_ORE_TIN',
    '_ORE_IRON',
    '_ORE_STEEL',
    '_ORE_TITANIUM',
    '_WOOD_BIRCH',
    '_WOOD_OAK',
    '_WOOD_ASHWOOD',
    '_WOOD_IRONWOOD',
    '_WOOD_EBONWOOD',
    '_LEATHER_THIN',
    '_LEATHER_THICK',
    '_CLOTH_LINEN',
    '_CLOTH_CLOTH',
    '_CLOTH_SILK',
  ],
  Fabricação: ['_PLANKS', '_METAL', '_HIDE', '_FABRIC', '_NAILS', '_SCREWS', '_BOLTS', '_HINGES'],
  Artefatos: [
    '_RUNE_AIR',
    '_RUNE_FIRE',
    '_RUNE_FROST',
    '_RUNE_HOLY',
    '_RUNE_NATURE',
    '_RUNE_ARCANE',
    '_SOUL_',
    '_RELIC_',
  ],
  Cultivo: ['_FISH_', '_HERB_'],
  Mobília: ['_MOBILITY_'],
  Vaidade: ['_CLOTHING_'],
  Outros: ['_BOOK_', '_SCROLL_', '_CRYSTAL_'],
};

export const CIDADES_SEGURAS = [
  'Bridgewatch',
  'FortSterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Brecilien',
];

export const TIERS = ['T4', 'T5', 'T6', 'T7', 'T8'];

// ─── Helpers ───

let ITEM_NAME_PT_BR_CACHE = null;

export function setItemNameCache(cache) {
  ITEM_NAME_PT_BR_CACHE = cache;
}

export function nomeItemEmPortugues(itemId) {
  if (ITEM_NAME_PT_BR_CACHE && ITEM_NAME_PT_BR_CACHE[itemId]) {
    return ITEM_NAME_PT_BR_CACHE[itemId];
  }
  return itemId.replace(/^T[4-8]_/, '').replace(/_/g, ' ');
}

export function extrairInfoItem(itemId) {
  const tier = itemId.startsWith('T') ? itemId.slice(0, 2) : '?';
  let encanto = '0';
  if (itemId.includes('@')) {
    const parts = itemId.split('@');
    encanto = parts[parts.length - 1] || '0';
  }
  return { tier, encanto };
}

export function obterPesoItem(itemId) {
  for (const [prefixo, peso] of Object.entries(ITEM_WEIGHTS)) {
    if (itemId.toUpperCase().includes(prefixo)) return peso;
  }
  return 1.0;
}

export function obterTCMItem(itemId) {
  for (const [prefixo, tcm] of Object.entries(ITEM_TCM)) {
    if (itemId.toUpperCase().includes(prefixo)) return tcm;
  }
  return 1;
}

export function calcularCustoTeleporteComTCM(peso, tcm, cidadeOrigem, cidadeDestino) {
  const prataBase = CITY_DISTANCES[cidadeOrigem]?.[cidadeDestino] || 200;
  const custoBruto = peso * prataBase * tcm;
  return Math.round(custoBruto * (1 - GLOBAL_DISCOUNT));
}
