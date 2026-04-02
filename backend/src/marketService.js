// Mapa de distâncias entre cidades (em relação à "vizinhança")
// Vizinhos: ~100 prata/kg, Distantes: ~200 prata/kg
const CITY_DISTANCES = {
  "Bridgewatch": { "FortSterling": 200, "Lymhurst": 200, "Martlock": 200, "Thetford": 200, "Brecilien": 100 },
  "FortSterling": { "Bridgewatch": 200, "Lymhurst": 100, "Martlock": 200, "Thetford": 200, "Brecilien": 200 },
  "Lymhurst": { "Bridgewatch": 200, "FortSterling": 100, "Martlock": 200, "Thetford": 100, "Brecilien": 200 },
  "Martlock": { "Bridgewatch": 200, "FortSterling": 200, "Lymhurst": 200, "Thetford": 200, "Brecilien": 200 },
  "Thetford": { "Bridgewatch": 200, "FortSterling": 200, "Lymhurst": 100, "Martlock": 200, "Brecilien": 200 },
  "Brecilien": { "Bridgewatch": 100, "FortSterling": 200, "Lymhurst": 200, "Martlock": 200, "Thetford": 200 }
};

// Mapa de pesos dos itens (em kg)
const ITEM_WEIGHTS = {
  "_MAIN_": 1.5, "_2H_": 2.0, "_RANGED_": 1.5,
  "_BODY_": 2.5, "_HEAD_": 1.0, "_SHOES_": 0.5, "_CAPE": 0.3, "_GLOVES_": 0.5,
  "_OFF_": 1.5, "_SHIELD_": 2.0,
  "_MOUNT_": 7.0,
  "_POTION_": 0.1, "_MEAL_": 0.2, "_DRINK_": 0.1, "_SPICE_": 0.05, "_HERB_": 0.05,
  "_RUNE": 0.3, "_SOUL": 0.3, "_RELIC": 0.3, "_BAG": 1.0, "_AMULET_": 0.2, "_RING_": 0.1,
  "_ORE_": 0.05, "_WOOD_": 0.05, "_LEATHER_": 0.05, "_CLOTH_": 0.02, "_PLANKS": 0.1,
};

// Multiplicador crítico (TCM) por tipo de item
// Equipamentos: 1x, Recursos: 50x-100x (média 75x)
const ITEM_TCM = {
  // Equipamentos (TCM = 1)
  "_MAIN_": 1, "_2H_": 1, "_RANGED_": 1,
  "_BODY_": 1, "_HEAD_": 1, "_SHOES_": 1, "_CAPE": 1, "_GLOVES_": 1,
  "_OFF_": 1, "_SHIELD_": 1,
  
  // Montarias (TCM = 1)
  "_MOUNT_": 1,
  
  // Consumíveis (TCM = 1, geralmente são leves)
  "_POTION_": 1, "_MEAL_": 1, "_DRINK_": 1, "_SPICE_": 1, "_HERB_": 1,
  
  // Artefatos (TCM = 1)
  "_RUNE": 1, "_SOUL": 1, "_RELIC": 1, "_AMULET_": 1, "_RING_": 1,
  
  // Bolsas (TCM = 1)
  "_BAG": 1,
  
  // Recursos Brutos e Refinados (TCM = 75, média de 50x-100x)
  "_ORE_": 75, "_WOOD_": 75, "_LEATHER_": 75, "_CLOTH_": 75, "_PLANKS": 75,
  "_METAL": 75, "_HIDE": 75, "_FABRIC": 75, "_NAILS": 75, "_SCREWS": 75, "_BOLTS": 75, "_HINGES": 75,
};

// Desconto global (flutuante, aqui usamos 0.15 = 15%) - em produção seria do jogo
const GLOBAL_DISCOUNT = 0.15;

const QUALITY_NAMES = { 1: "Normal", 2: "Bom", 3: "Excepcional", 4: "Excelente", 5: "Obra-prima" };

export const CATEGORIAS = {
  Todos: [],
  Armas: [
    "_MAIN_BLOODLETTER", "_MAIN_DAGGER", "_MAIN_SWORD", "_MAIN_MACE", "_MAIN_AXE", "_MAIN_HAMMER",
    "_MAIN_SPEAR", "_MAIN_STAFF", "_MAIN_CURSEDSTAFF", "_MAIN_NATURESTAFF", "_MAIN_FIRESTAFF", "_MAIN_FROSTSTAFF", "_MAIN_HOLYSTAFF",
    "_2H_BOW", "_2H_CROSSBOW", "_2H_CARVINGSWORD", "_2H_GREATAXE", "_2H_MAUL", "_2H_HALBERD", "_2H_PIKE", "_2H_DUALAXE_KEEPER", "_2H_DUALAXE", "_2H_MACE",
    "_RANGED_BOW", "_RANGED_CROSSBOW",
  ],
  "Armaduras de Peitoral": [
    "_BODY_CLERICROBE", "_BODY_ASSASSINJACKET", "_BODY_SOLDIERARMOR", "_BODY_MAGE", "_BODY_CLOTHROBES", "_BODY_LEATHERARMOR", "_BODY_PLATEARMOR",
    "_BODY_CLOTH", "_BODY_LEATHER", "_BODY_PLATE",
  ],
  "Armaduras de Cabeça": [
    "_HEAD_HUNTER", "_HEAD_CLERICHOOD", "_HEAD_SOLDIERHELMET", "_HEAD_MAGE",
    "_HEAD_CLOTH", "_HEAD_LEATHER", "_HEAD_PLATE",
  ],
  "Armaduras de Calçado": [
    "_SHOES_SOLDIERBOOTS", "_SHOES_ASSASSINSHOES", "_SHOES_CLERICSHOES",
    "_SHOES_CLOTH", "_SHOES_LEATHER", "_SHOES_PLATE",
  ],
  "Mão Secundária": [
    "_SHIELD_TOWER", "_SHIELD_KITE", "_SHIELD_ROUND", "_OFF_DAGGER", "_OFF_SHIELD",
  ],
  Capas: ["_CAPE", "_CAPEITEM_FW_LYMHURST", "_CAPEITEM_FW_FORTSTERLING", "_CAPEITEM_FW_MARTLOCK", "_CAPEITEM_FW_THETFORD", "_CAPEITEM_FW_BRIDGEWATCH"],
  Bolsas: ["_BAG_SMALL", "_BAG_MEDIUM", "_BAG_LARGE", "_BAG"],
  Montarias: ["_MOUNT_HORSE", "_MOUNT_OX", "_MOUNT_SWIFTCLAW", "_MOUNT_STAG", "_MOUNT_RAM", "_MOUNT_MOOSE"],
  Consumível: [
    "_POTION_HEAL", "_POTION_ENERGY", "_POTION_POWER", "_POTION_FORCE",
    "_MEAL_STEAK", "_MEAL_OMELETTE", "_MEAL_STEW", "_MEAL_PIE", "_MEAL_BREAD", "_MEAL_CHEESE",
    "_DRINK_WATER", "_DRINK_BEER",
    "_SPICE_SUGAR", "_SPICE_SALT", "_SPICE_HERB",
  ],
  "Equipamento de Coleta": ["_ORE_COPPER", "_ORE_TIN", "_ORE_IRON", "_ORE_STEEL", "_ORE_TITANIUM", "_WOOD_BIRCH", "_WOOD_OAK", "_WOOD_ASHWOOD", "_WOOD_IRONWOOD", "_WOOD_EBONWOOD", "_LEATHER_THIN", "_LEATHER_THICK", "_CLOTH_LINEN", "_CLOTH_CLOTH", "_CLOTH_SILK"],
  Fabricação: ["_PLANKS", "_METAL", "_HIDE", "_FABRIC", "_NAILS", "_SCREWS", "_BOLTS", "_HINGES"],
  Artefatos: ["_RUNE_AIR", "_RUNE_FIRE", "_RUNE_FROST", "_RUNE_HOLY", "_RUNE_NATURE", "_RUNE_ARCANE", "_SOUL_", "_RELIC_"],
  Cultivo: ["_FISH_", "_HERB_"],
  Mobília: ["_MOBILITY_"],
  Vaidade: ["_CLOTHING_"],
  Outros: ["_BOOK_", "_SCROLL_", "_CRYSTAL_"],
};

const ITEM_ID_SOURCE_URL = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";
let ALL_ITEM_IDS_CACHE = null;
let ITEM_NAME_PT_BR_CACHE = null;
let CATEGORIES_CACHE = null;

// ─── Cache de preços com TTL ───
const PRICE_CACHE = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getPriceCacheKey(itemIds, locations, quality) {
  return `${itemIds.sort().join(",")}|${locations}|${quality}`;
}

function getCachedPrices(key) {
  const cached = PRICE_CACHE.get(key);
  if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) return cached.data;
  PRICE_CACHE.delete(key);
  return null;
}

function setCachedPrices(key, data) {
  PRICE_CACHE.set(key, { data, ts: Date.now() });
  // Limpar entradas antigas periodicamente (max 500 entradas)
  if (PRICE_CACHE.size > 500) {
    const now = Date.now();
    for (const [k, v] of PRICE_CACHE) {
      if (now - v.ts > PRICE_CACHE_TTL) PRICE_CACHE.delete(k);
    }
  }
}

const CIDADES_SEGURAS = [
  "Bridgewatch",
  "FortSterling",
  "Lymhurst",
  "Martlock",
  "Thetford",
  "Brecilien",
];

const TIERS = ["T4", "T5", "T6", "T7", "T8"];

async function carregarItensDoJogo() {
  if (ALL_ITEM_IDS_CACHE && ALL_ITEM_IDS_CACHE.length > 0) return ALL_ITEM_IDS_CACHE;
  try {
    console.log("[Items] Iniciando carregamento de itens do jogo...");
    const res = await fetch(ITEM_ID_SOURCE_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Falha ao buscar itens do jogo (${res.status})`);
    const data = await res.json();

    console.log(`[Items] JSON carregado: ${Array.isArray(data) ? data.length : "não é array"} registros`);

    // Carregar TODOS os items que têm UniqueName
    const ids = Array.isArray(data)
      ? [...new Set(data.map((item) => String(item.UniqueName || "")).filter((id) => id.length > 0))]
      : [];

    ALL_ITEM_IDS_CACHE = ids;

    // Construir cache de nomes localizados
    if (Array.isArray(data)) {
      ITEM_NAME_PT_BR_CACHE = data.reduce((acc, item) => {
        const key = String(item.UniqueName || "");
        const ptName = item.LocalizedNames?.["PT-BR"] || item.LocalizedNames?.["pt-BR"] || item.LocalizedNames?.["pt-br"];
        if (key) acc[key] = ptName || item.LocalizedNames?.["EN-US"] || key.replace(/_/g, " ");
        return acc;
      }, {});

      // Construir mapa de categorias dinamicamente
      console.log("[Items] Construindo mapa de categorias...");
      CATEGORIES_CACHE = construirMapaCategorias(data);
      console.log(`[Items] ✓ Mapa de categorias construído com ${Object.keys(CATEGORIES_CACHE || {}).length} categorias`);
    }

    console.log(`[Items] Carregados ${ids.length} itens do jogo com sucesso`);
    
    // Log de distribuição
    if (CATEGORIES_CACHE) {
      const dist = Object.entries(CATEGORIES_CACHE)
        .map(([cat, items]) => `${cat}: ${items.length}`)
        .sort((a, b) => parseInt(b.split(": ")[1]) - parseInt(a.split(": ")[1]))
        .slice(0, 15);
      console.log(`[Items] Top 15 categorias:`, dist);
    }
    return ids;
  } catch (err) {
    console.error("[Items] ❌ Erro ao carregar itens:", err.message || err);
    // Fallback: gerar lista a partir de todas as categorias
    const bases = Object.entries(CATEGORIAS)
      .filter(([cat]) => cat !== "Todos")
      .flatMap(([, itens]) => itens);
    const fallbackIds = [...new Set(bases)].flatMap((b) => {
      return TIERS.map((t) => `${t}${b}`);
    });
    ALL_ITEM_IDS_CACHE = fallbackIds;
    console.log(`[Items] Usando fallback: ${fallbackIds.length} itens gerados a partir de categorias estáticas`);
    return fallbackIds;
  }
}

// ─── Regras de classificação por família de arma ───
// Primeira correspondência vence — mais específico primeiro
const WEAPON_FAMILY_RULES = [
  // Cajados mágicos
  [/ARCANESTAFF/, "Cajado Arcano"],
  [/CURSEDSTAFF/, "Cajado Amaldiçoado"],
  [/FIRESTAFF/, "Cajado de Fogo"],
  [/FROSTSTAFF/, "Cajado de Gelo"],
  [/HOLYSTAFF/, "Cajado Sagrado"],
  [/NATURESTAFF/, "Cajado da Natureza"],
  [/SHAPESHIFTERSTAFF/, "Cajado Metamorfo"],
  // Armas físicas — ordem importa (CROSSBOW antes de BOW, etc.)
  [/CROSSBOW/, "Besta"],
  [/BOW/, "Arco"],
  [/CLAYMORE|DUALSWORD|BROADSWORD|CARVING|SCIMITAR|SWORD/, "Espada"],
  [/HATCHET|DUALAXE|GREATAXE|AXE/, "Machado"],
  [/DAGGERPAIR|CLAWPAIR|DAGGER/, "Adaga"],
  [/POLEHAMMER|HAMMER|MAUL/, "Martelo"],
  [/KNUCKLES/, "Luvas de Guerra"],
  [/FLAIL|MORNING|MACE/, "Maça"],
  [/QUARTERSTAFF|IRONCLADSTAFF|DOUBLEBLADEDSTAFF|TWINSCYTHE|SOULSCYTHE|BLACKMONK/, "Bordão"],
  [/HALBERD|GLAIVE|TRIDENT|PIKE|SPEAR/, "Lança"],
];

function classificarArmaFamilia(restName) {
  const upper = restName.toUpperCase();
  for (const [regex, familia] of WEAPON_FAMILY_RULES) {
    if (regex.test(upper)) return familia;
  }
  // Fallback: se contém STAFF e não foi capturado → Bordão
  if (upper.includes("STAFF")) return "Bordão";
  return null;
}

function addToCat(cats, name, itemId) {
  if (!cats[name]) cats[name] = [];
  cats[name].push(itemId);
}

function construirMapaCategorias(allItems) {
  const cats = { Todos: [] };

  if (!Array.isArray(allItems)) {
    console.warn("[Categories] allItems não é um array!", typeof allItems);
    return cats;
  }

  console.log(`[Categories] Iniciando parse de ${allItems.length} items...`);
  let itemsComUniqueName = 0;
  let itemsComCategoria = 0;

  for (const item of allItems) {
    const uniqueName = String(item.UniqueName || "");
    if (!uniqueName) continue;

    itemsComUniqueName++;
    cats.Todos.push(uniqueName);

    const base = uniqueName.split("@")[0];
    const parts = base.split("_");
    if (parts.length < 2) continue;

    itemsComCategoria++;

    // ── Itens sem tier (UNIQUE_, QUESTITEM_, SKIN_, etc.) ──
    if (!/^T\d$/.test(parts[0])) {
      if (uniqueName.startsWith("UNIQUE_MOUNT")) { addToCat(cats, "Montaria", uniqueName); continue; }
      if (uniqueName.startsWith("UNIQUE_FURNITUREITEM")) { addToCat(cats, "Mobília", uniqueName); continue; }
      if (uniqueName.startsWith("UNIQUE_")) { addToCat(cats, "Itens Únicos", uniqueName); continue; }
      if (uniqueName.startsWith("SKIN_") || uniqueName.startsWith("VANITY_")) { addToCat(cats, "Vaidade", uniqueName); continue; }
      addToCat(cats, "Outros", uniqueName);
      continue;
    }

    // ── Itens com tier: T#_SLOT_REST ──
    const isArtefact = parts[1] === "ARTEFACT";
    let slot, rest;

    if (isArtefact && parts.length >= 3) {
      slot = parts[2];
      rest = parts.slice(3).join("_");
    } else {
      slot = parts[1];
      rest = parts.slice(2).join("_");
    }

    // ── Artefatos (componentes de craft) ──
    if (isArtefact) {
      if (["MAIN", "2H"].includes(slot)) addToCat(cats, "Artefato - Armas", uniqueName);
      else if (["HEAD", "ARMOR", "SHOES"].includes(slot)) addToCat(cats, "Artefato - Armaduras", uniqueName);
      else if (slot === "OFF") addToCat(cats, "Artefato - Mão Secundária", uniqueName);
      else if (slot === "CAPEITEM" || slot === "CAPE") addToCat(cats, "Artefato - Capas", uniqueName);
      else addToCat(cats, "Artefato - Outros", uniqueName);
      continue;
    }

    // ── Equipamento de Coleta (checar antes de armadura) ──
    if (rest.includes("GATHERER")) {
      if (slot === "HEAD") addToCat(cats, "Equipamento de Coleta - Elmos", uniqueName);
      else if (slot === "ARMOR") addToCat(cats, "Equipamento de Coleta - Armaduras", uniqueName);
      else if (slot === "SHOES") addToCat(cats, "Equipamento de Coleta - Calçados", uniqueName);
      else if (slot === "BACKPACK") addToCat(cats, "Equipamento de Coleta - Mochilas", uniqueName);
      else addToCat(cats, "Equipamento de Coleta - Outros", uniqueName);
      continue;
    }
    if ((slot === "MAIN" || slot === "2H") && (rest.includes("TOOL") || rest.includes("TRACKING"))) {
      addToCat(cats, "Equipamento de Coleta - Ferramentas", uniqueName);
      continue;
    }

    // ── Armas ──
    if (slot === "MAIN" || slot === "2H") {
      const familia = classificarArmaFamilia(rest);
      addToCat(cats, `Armas - ${familia || "Outras"}`, uniqueName);
      continue;
    }

    // ── Armadura de Peitoral ──
    if (slot === "ARMOR") {
      if (rest.includes("CLOTH")) addToCat(cats, "Armadura de Peitoral - Pano", uniqueName);
      else if (rest.includes("LEATHER")) addToCat(cats, "Armadura de Peitoral - Couro", uniqueName);
      else if (rest.includes("PLATE")) addToCat(cats, "Armadura de Peitoral - Placa", uniqueName);
      else addToCat(cats, "Armadura de Peitoral - Outros", uniqueName);
      continue;
    }

    // ── Armadura de Capacete ──
    if (slot === "HEAD") {
      if (rest.includes("CLOTH")) addToCat(cats, "Armadura de Capacete - Pano", uniqueName);
      else if (rest.includes("LEATHER")) addToCat(cats, "Armadura de Capacete - Couro", uniqueName);
      else if (rest.includes("PLATE")) addToCat(cats, "Armadura de Capacete - Placa", uniqueName);
      else addToCat(cats, "Armadura de Capacete - Outros", uniqueName);
      continue;
    }

    // ── Armadura de Calçado ──
    if (slot === "SHOES") {
      if (rest.includes("CLOTH")) addToCat(cats, "Armadura de Calçado - Pano", uniqueName);
      else if (rest.includes("LEATHER")) addToCat(cats, "Armadura de Calçado - Couro", uniqueName);
      else if (rest.includes("PLATE")) addToCat(cats, "Armadura de Calçado - Placa", uniqueName);
      else addToCat(cats, "Armadura de Calçado - Outros", uniqueName);
      continue;
    }

    // ── Mão Secundária ──
    if (slot === "OFF") { addToCat(cats, "Mão Secundária", uniqueName); continue; }

    // ── Capas ──
    if (slot === "CAPEITEM" || slot === "CAPE") { addToCat(cats, "Capas", uniqueName); continue; }

    // ── Bolsas ──
    if (slot === "BAG") { addToCat(cats, "Bolsas", uniqueName); continue; }
    if (slot === "BACKPACK") { addToCat(cats, "Bolsas - Mochilas", uniqueName); continue; }

    // ── Montaria ──
    if (slot === "MOUNT") { addToCat(cats, "Montaria", uniqueName); continue; }

    // ── Consumível ──
    if (slot === "POTION") { addToCat(cats, "Consumível - Poções", uniqueName); continue; }
    if (slot === "MEAL") { addToCat(cats, "Consumível - Refeições", uniqueName); continue; }
    if (slot === "FISH") { addToCat(cats, "Consumível - Peixes", uniqueName); continue; }
    if (slot === "ALCOHOL") { addToCat(cats, "Consumível - Bebidas", uniqueName); continue; }

    // ── Fabricação (recursos) ──
    const fabricacao = ["ORE", "WOOD", "HIDE", "FIBER", "CLOTH", "LEATHER", "METALBAR", "PLANKS", "STONEBLOCK", "ROCK", "STONE"];
    if (fabricacao.includes(slot)) { addToCat(cats, `Fabricação - ${slot}`, uniqueName); continue; }

    // ── Cultivo ──
    const cultivo = ["FARM", "SEED", "BEAN", "HERB", "AGARIC", "COMFREY", "FOXGLOVE", "MULLEIN", "TEASEL", "BURDOCK", "YARROW", "CARROT", "POTATO", "CABBAGE", "WHEAT", "TURNIP", "PUMPKIN", "CORN"];
    if (cultivo.includes(slot)) { addToCat(cats, "Cultivo", uniqueName); continue; }

    // ── Mobília ──
    if (slot === "FURNITUREITEM") { addToCat(cats, "Mobília", uniqueName); continue; }

    // ── Vaidade ──
    if (slot === "SKIN" || slot === "VANITY" || slot === "CLOTHING") { addToCat(cats, "Vaidade", uniqueName); continue; }

    // ── Outros ──
    if (slot === "JOURNAL") { addToCat(cats, "Outros - Diários", uniqueName); continue; }
    if (slot === "LABOURER") { addToCat(cats, "Outros - Trabalhadores", uniqueName); continue; }
    addToCat(cats, `Outros - ${slot}`, uniqueName);
  }

  // Deduplicar
  for (const cat in cats) {
    cats[cat] = [...new Set(cats[cat])];
  }

  // Criar categorias de grupo (agregar subcategorias com " - ")
  const groupAgg = {};
  for (const cat of Object.keys(cats)) {
    if (cat === "Todos") continue;
    const dashParts = cat.split(" - ");
    if (dashParts.length === 2) {
      const group = dashParts[0];
      if (!groupAgg[group]) groupAgg[group] = [];
      groupAgg[group].push(...cats[cat]);
    }
  }
  for (const [group, items] of Object.entries(groupAgg)) {
    if (!cats[group]) {
      cats[group] = [...new Set(items)];
    }
  }

  // Ordenar categorias
  const CATEGORY_ORDER = [
    "Todos", "Armas", "Armadura de Peitoral", "Armadura de Capacete", "Armadura de Calçado",
    "Mão Secundária", "Capas", "Bolsas", "Montaria", "Consumível",
    "Equipamento de Coleta", "Fabricação", "Artefato", "Cultivo", "Mobília",
    "Vaidade", "Itens Únicos", "Outros",
  ];

  const orderIndex = (key) => {
    const mainPart = key.split(" - ")[0];
    const idx = CATEGORY_ORDER.indexOf(mainPart);
    return idx >= 0 ? idx : 999;
  };

  const sortedCats = {};
  Object.keys(cats)
    .sort((a, b) => {
      const oa = orderIndex(a);
      const ob = orderIndex(b);
      if (oa !== ob) return oa - ob;
      return a.localeCompare(b);
    })
    .forEach(key => { sortedCats[key] = cats[key]; });

  console.log(`[Categories] ✓ Parse completo: ${itemsComUniqueName} com UniqueName, ${itemsComCategoria} com categoria`);
  console.log(`[Categories] ✓ Total de categorias criadas: ${Object.keys(sortedCats).length}`);

  return sortedCats;
}

function nomeItemEmPortugues(itemId) {
  if (ITEM_NAME_PT_BR_CACHE && ITEM_NAME_PT_BR_CACHE[itemId]) {
    return ITEM_NAME_PT_BR_CACHE[itemId];
  }
  return itemId.replace(/^T[4-8]_/, "").replace(/_/g, " ");
}

function extrairInfoItem(itemId) {
  const tier = itemId.startsWith('T') ? itemId.slice(0, 2) : "?";
  let encanto = "0";
  if (itemId.includes('@')) {
    const parts = itemId.split('@');
    encanto = parts[parts.length - 1] || "0";
  }
  return { tier, encanto };
}

function obterPesoItem(itemId) {
  for (const [prefixo, peso] of Object.entries(ITEM_WEIGHTS)) {
    if (itemId.toUpperCase().includes(prefixo)) {
      return peso;
    }
  }
  return 1.0;
}

function obterTCMItem(itemId) {
  // Obtém o multiplicador crítico (TCM) do item
  for (const [prefixo, tcm] of Object.entries(ITEM_TCM)) {
    if (itemId.toUpperCase().includes(prefixo)) {
      return tcm;
    }
  }
  return 1; // Padrão para equipamento
}

function calcularCustoTeleporte(peso, cidadeOrigem, cidadeDestino) {
  // Fórmula: Custo = (Peso × PrataBase × TCM) × (1 - DescontoGlobal)
  const prataBase = CITY_DISTANCES[cidadeOrigem]?.[cidadeDestino] || 200;
  const custo = peso * prataBase;
  return Math.round(custo * (1 - GLOBAL_DISCOUNT));
}

function calcularCustoTeleporteComTCM(peso, tcm, cidadeOrigem, cidadeDestino) {
  // Fórmula: Custo = (Peso × PrataBase × TCM) × (1 - DescontoGlobal)
  const prataBase = CITY_DISTANCES[cidadeOrigem]?.[cidadeDestino] || 200;
  const custoBruto = peso * prataBase * tcm;
  const custoCalculado = custoBruto * (1 - GLOBAL_DISCOUNT);
  return Math.round(custoCalculado);
}

async function gerarListaItens(categoria) {
  let lista = [];

  // Primeiro carrega os itens (que constrói CATEGORIES_CACHE)
  await carregarItensDoJogo();

  console.log(`[gerarListaItens] Solicitado: ${categoria}`);
  console.log(`[gerarListaItens] CATEGORIES_CACHE disponível: ${!!CATEGORIES_CACHE}, keys: ${CATEGORIES_CACHE ? Object.keys(CATEGORIES_CACHE).length : 0}`);
  console.log(`[gerarListaItens] ALL_ITEM_IDS_CACHE disponível: ${ALL_ITEM_IDS_CACHE ? ALL_ITEM_IDS_CACHE.length + " items" : "null"}`);

  // PRIORIDADE: "Todos" deve retornar REALMENTE TUDO
  if (categoria === "Todos") {
    // Preferir CATEGORIES_CACHE["Todos"] pois é construído do json dinâmico
    if (CATEGORIES_CACHE && CATEGORIES_CACHE["Todos"] && CATEGORIES_CACHE["Todos"].length > 0) {
      lista = CATEGORIES_CACHE["Todos"];
      console.log(`[gerarListaItens] ✓ Usando CATEGORIES_CACHE["Todos"]: ${lista.length} itens`);
    } else {
      // Fallback para ALL_ITEM_IDS_CACHE
      lista = ALL_ITEM_IDS_CACHE || [];
      console.log(`[gerarListaItens] ⚠️ Usando ALL_ITEM_IDS_CACHE: ${lista.length} itens`);
    }
  } 
  // Categorias específicas
  else if (CATEGORIES_CACHE && CATEGORIES_CACHE[categoria] && CATEGORIES_CACHE[categoria].length > 0) {
    lista = CATEGORIES_CACHE[categoria];
    console.log(`[gerarListaItens] ✓ Usando CATEGORIES_CACHE["${categoria}"]: ${lista.length} itens`);
  } 
  // Fallback para categorias estáticas
  else {
    const bases = CATEGORIAS[categoria] || [];
    lista = bases.flatMap((b) => {
      const baseIds = TIERS.map((t) => `${t}${b}`);
      return baseIds;
    });
    console.log(`[gerarListaItens] ⚠️ Fallback estático para "${categoria}": ${lista.length} itens`);
  }

  const result = [...new Set(lista)];
  console.log(`[gerarListaItens] Retornando ${result.length} items únicos para categoria "${categoria}"`);
  return result;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchPricesMarket(itemIds, locations, quality = 0) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const allChunks = chunk(unique, 100);
  const merged = [];
  const concurrency = 5;
  const qualitiesParam = quality > 0 ? `&qualities=${quality}` : "";

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const cacheKey = getPriceCacheKey(part, loc, quality);
      const cached = getCachedPrices(cacheKey);
      if (cached) return cached;

      const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(",")}?locations=${encodeURIComponent(loc)}${qualitiesParam}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`Albion prices HTTP ${res.status}`);
      }
      const data = await res.json();
      setCachedPrices(cacheKey, data);
      return data;
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        merged.push(...r.value);
      }
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return merged;
}

// Buscar histórico de vendas (volume diário) em lote
async function fetchHistoryMarket(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const allChunks = chunk(unique, 50); // chunks menores para history
  const merged = [];
  const concurrency = 3;

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const url = `https://www.albion-online-data.com/api/v2/stats/history/${part.join(",")}?locations=${encodeURIComponent(loc)}&time-scale=24`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      return res.json();
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        merged.push(...r.value);
      }
    }

    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Agregar: para cada item+cidade, média diária dos últimos 7 dias
  const volumeMap = new Map(); // "itemId|city" -> avg daily volume
  for (const entry of merged) {
    if (!entry.data || !Array.isArray(entry.data)) continue;
    const key = `${entry.item_id}|${entry.location}`;
    let total = 0;
    let days = 0;
    for (const d of entry.data) {
      if (d.item_count > 0) {
        total += d.item_count;
        days++;
      }
    }
    const avg = days > 0 ? Math.round(total / Math.max(days, 1)) : 0;
    const prev = volumeMap.get(key) || 0;
    if (avg > prev) volumeMap.set(key, avg);
  }

  return volumeMap;
}

export async function buscarOportunidades({ 
  categoria, 
  maxIdadeHoras = 168,
  quality = 0,
  usarBuyOrder = false,
  taxaVenda = 6.5,
  maxItensProcessar = 999999, // Sem limite efetivo
  offset = 0,
  step = 500,
  tier = "Todos",
  enchantment = "Todos",
}) {
  let itens = await gerarListaItens(categoria);

  console.log(`[Market] Categoria: ${categoria}, Total itens carregados: ${itens?.length || 0}`);

  // Filtrar por grau (tier)
  if (tier && tier !== "Todos") {
    itens = itens.filter(id => id.startsWith(tier + "_"));
    console.log(`[Market] Filtro tier=${tier}: ${itens.length} itens restantes`);
  }

  // Filtrar por encantamento
  if (enchantment !== undefined && enchantment !== null && enchantment !== "Todos") {
    const enc = parseInt(enchantment);
    if (enc === 0) {
      itens = itens.filter(id => !id.includes("@"));
    } else if (!isNaN(enc)) {
      itens = itens.filter(id => id.includes(`@${enc}`));
    }
    console.log(`[Market] Filtro enchantment=${enchantment}: ${itens.length} itens restantes`);
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    console.log(`[Market] Erro: itens inválido ou vazio. Retornando []`);
    return [];
  }

  // ⚠️ IMPORTANTE: Para "Todos", SEMPRE processar TUDO sem paginação
  let itensProcessar;
  if (categoria === "Todos") {
    itensProcessar = itens; // Processar TODOS os items
    console.log(`[Market] ✓ Categoria "Todos": processando ${itensProcessar.length} items (SEM paginação)`);
  } else {
    // Para categorias específicas, usar offset/step para paginação
    itensProcessar = itens.slice(offset, Math.min(offset + step, itens.length));
    console.log(`[Market] Processando slice: offset=${offset}, step=${step}, itens neste batch=${itensProcessar.length}/${itens.length}`);
  }
  
  if (!itensProcessar.length) {
    console.log(`[Market] Slice vazio! Retornando []`);
    return [];
  }

  const cidadesStr = CIDADES_SEGURAS.join(",");
  const maxIdade = Number(maxIdadeHoras) || 168;
  const agora = Date.now();
  const qualityNum = Number(quality) || 0;
  const taxaVendaDecimal = (taxaVenda / 100);
  const taxaVendaNota = 1 - taxaVendaDecimal;

  // Aumentar concorrência para batches grandes
  const chunks = chunk(itensProcessar, 100);
  console.log(`[Market] Processa ${itensProcessar.length} items em ${chunks.length} chunks de 100`);
  
  const oportunidadesBrutas = [];
  
  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunkItems = chunks[chunkIdx];
    console.log(`[Market] Chunk ${chunkIdx + 1}/${chunks.length}: fetching ${chunkItems.length} items...`);
    
    const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);
    console.log(`[Market] Chunk ${chunkIdx + 1}: API retornou ${respostaPrecos?.length || 0} registros de preço`);

    const itemsComPreco = new Set(respostaPrecos.map(p => p.item_id));
    console.log(`[Market] Chunk ${chunkIdx + 1}: ${itemsComPreco.size}/${chunkItems.length} items têm preço`);

    const mapaPrecos = new Map();
    for (const p of respostaPrecos) {
      const dataStr = p.sell_price_min_date;
      if (!dataStr || String(dataStr).startsWith("0001")) continue;

      const dataApi = new Date(String(dataStr).replace(" ", "T")).getTime();
      const idadeHoras = (agora - dataApi) / 3600000;

      if (idadeHoras <= maxIdade && p.sell_price_min > 0) {
        const it = p.item_id;
        const cidade = p.city;
        const qual = p.quality || 1;
        const chave = `${it}|${cidade}|${qual}`;
        
        if (!mapaPrecos.has(chave)) {
          mapaPrecos.set(chave, {
            item: it,
            city: cidade,
            quality: qual,
            sellMin: p.sell_price_min,
            buyMax: p.buy_price_max || 0,
            dataStr: String(dataStr).replace("T", " ").slice(0, 16),
          });
        } else {
          const existente = mapaPrecos.get(chave);
          if (p.sell_price_min < existente.sellMin) {
            existente.sellMin = p.sell_price_min;
          }
          if (p.buy_price_max > existente.buyMax) {
            existente.buyMax = p.buy_price_max;
          }
        }
      }
    }
    
    // Converter de volta para formato por item+quality/cidade
    const mapaOrganiado = new Map();
    for (const [chave, dados] of mapaPrecos) {
      const groupKey = `${dados.item}|${dados.quality}`;
      if (!mapaOrganiado.has(groupKey)) mapaOrganiado.set(groupKey, { quality: dados.quality });
      
      mapaOrganiado.get(groupKey)[dados.city] = {
        compra: dados.sellMin,
        venda: dados.sellMin,
        buyMax: dados.buyMax,
        dataStrSell: dados.dataStr,
        dataStrBuy: dados.dataStr, // Em produção seria a data do buy_price_max, mas usamos a mesma por simplicidade
      };
    }

    for (const [groupKey, groupData] of mapaOrganiado) {
      const itemId = groupKey.split("|")[0];
      const qualItem = groupData.quality;
      const peso = obterPesoItem(itemId);
      const tcm = obterTCMItem(itemId);
      const { tier, encanto } = extrairInfoItem(itemId);
      const nomeBase = nomeItemEmPortugues(itemId);
      const estado = QUALITY_NAMES[qualItem] || "Normal";
      
      const cidadesArray = Object.entries(groupData).filter(([k]) => k !== "quality");
      
      // Validar que temos pelo menos 2 cidades com preços
      if (cidadesArray.length < 2) continue;
      
      for (let i = 0; i < cidadesArray.length; i++) {
        for (let j = 0; j < cidadesArray.length; j++) {
          if (i === j) continue;
          
          const [cidadeOri, infoOri] = cidadesArray[i];
          const [cidadeDest, infoDest] = cidadesArray[j];
          
          // ✅ Validação: ambas as cidades precisam ter preços válidos
          if (!infoOri || !infoDest) continue;
          if (!infoOri.compra || !infoOri.venda || !infoDest.compra || !infoDest.venda) continue;
          
          const precoCompra = infoOri.compra;
          const precoVenda = infoDest.venda;
          const buyOrderDestino = infoDest.buyMax || 0;
          
          // Validação adicional
          if (!precoCompra || !precoVenda || precoCompra <= 0 || precoVenda <= 0) continue;
          
          // Custo com fórmula precisa: Custo = (Peso × PrataBase × TCM) × (1 - DescontoGlobal)
          const custoTeleporte = calcularCustoTeleporteComTCM(peso, tcm, cidadeOri, cidadeDest);
          
          // Lucro = (Preço_Venda × Taxa_Venda%) - Preço_Compra - Custo_Teleporte
          const receita = precoVenda * taxaVendaNota;
          const custos = precoCompra + custoTeleporte;
          const lucroLiquido = receita - custos;

          if (lucroLiquido > 0) {
            const agoraMs = Date.now();
            const destinoDate = new Date(String(infoDest.dataStrSell).replace(" ", "T")).getTime();
            const origemDate = new Date(String(infoOri.dataStrSell).replace(" ", "T")).getTime();
            const desatualizado = 
              (!isNaN(destinoDate) && agoraMs - destinoDate > 12 * 3600000) ||
              (!isNaN(origemDate) && agoraMs - origemDate > 12 * 3600000);

            oportunidadesBrutas.push({
              id: itemId,
              nomeBase,
              tier,
              encanto,
              estado,
              origem: cidadeOri,
              destino: cidadeDest,
              compra: precoCompra,
              venda: precoVenda,
              buyOrderDestino,
              custoTeleporte,
              lucro: lucroLiquido,
              margem: precoCompra > 0 ? ((precoVenda / precoCompra - 1) * 100) : 0,
              atualizacaoOrig: infoOri.dataStrSell,
              atualizacaoDest: infoDest.dataStrSell,
              atualizacaoBuyOrderDest: infoDest.dataStrBuy,
              desatualizado,
            });
          }
        }
      }
    }
  }

  oportunidadesBrutas.sort((a, b) => b.lucro - a.lucro);
  console.log(`[Market] Total oportunidades encontradas: ${oportunidadesBrutas.length}`);
  console.log(`[Market] Items processados do batch ${itensProcessar.length}, itens com preço: ${[...new Set(oportunidadesBrutas.map(o => o.id))].length}`);
  
  // Deduplicar por item + qualidade + par de cidades
  const dedupSet = new Set();
  const oportunidadesUnicas = [];
  for (const op of oportunidadesBrutas) {
    const chave = `${op.id}|${op.estado}|${op.origem}|${op.destino}`;
    if (!dedupSet.has(chave)) {
      dedupSet.add(chave);
      oportunidadesUnicas.push(op);
    }
  }
  console.log(`[Market] Após deduplicar: ${oportunidadesUnicas.length} oportunidades únicas`);
  
  // Buscar volume de vendas diário para os itens com oportunidades
  const uniqueItemIds = [...new Set(oportunidadesUnicas.map(o => o.id))];
  console.log(`[Market] Buscando volume diário para ${uniqueItemIds.length} itens únicos...`);
  let volumeMap = new Map();
  try {
    volumeMap = await fetchHistoryMarket(uniqueItemIds, cidadesStr);
    console.log(`[Market] ✓ Volume obtido para ${volumeMap.size} combinações item+cidade`);
  } catch (e) {
    console.log(`[Market] ⚠️ Erro ao buscar volume (continuando sem): ${e.message}`);
  }

  // Anexar volume a cada oportunidade
  for (const op of oportunidadesUnicas) {
    const volOrig = volumeMap.get(`${op.id}|${op.origem}`) || 0;
    const volDest = volumeMap.get(`${op.id}|${op.destino}`) || 0;
    op.volumeDiario = Math.max(volOrig, volDest);
  }

  // Retornar TODOS os itens encontrados neste batch (sem limite de 100)
  // O frontend deduplica e ordena por lucro
  console.log(`[Market] Retornando ${oportunidadesUnicas.length} oportunidades deste batch`);
  return oportunidadesUnicas;
}

// ─── Extrai oportunidades de um chunk de preços (lógica reutilizável) ───
function extrairOportunidadesDePrecos(respostaPrecos, maxIdade, agora, qualityNum, taxaVendaNota) {
  const mapaPrecos = new Map();
  for (const p of respostaPrecos) {
    const dataStr = p.sell_price_min_date;
    if (!dataStr || String(dataStr).startsWith("0001")) continue;

    const dataApi = new Date(String(dataStr).replace(" ", "T")).getTime();
    const idadeHoras = (agora - dataApi) / 3600000;

    if (idadeHoras <= maxIdade && p.sell_price_min > 0) {
      const it = p.item_id;
      const cidade = p.city;
      const qual = p.quality || 1;
      const chave = `${it}|${cidade}|${qual}`;

      if (!mapaPrecos.has(chave)) {
        mapaPrecos.set(chave, {
          item: it, city: cidade, quality: qual,
          sellMin: p.sell_price_min, buyMax: p.buy_price_max || 0,
          dataStr: String(dataStr).replace("T", " ").slice(0, 16),
        });
      } else {
        const existente = mapaPrecos.get(chave);
        if (p.sell_price_min < existente.sellMin) existente.sellMin = p.sell_price_min;
        if (p.buy_price_max > existente.buyMax) existente.buyMax = p.buy_price_max;
      }
    }
  }

  const mapaOrganizado = new Map();
  for (const [, dados] of mapaPrecos) {
    const groupKey = `${dados.item}|${dados.quality}`;
    if (!mapaOrganizado.has(groupKey)) mapaOrganizado.set(groupKey, { quality: dados.quality });
    mapaOrganizado.get(groupKey)[dados.city] = {
      compra: dados.sellMin, venda: dados.sellMin,
      buyMax: dados.buyMax, dataStrSell: dados.dataStr, dataStrBuy: dados.dataStr,
    };
  }

  const oportunidades = [];
  for (const [groupKey, groupData] of mapaOrganizado) {
    const itemId = groupKey.split("|")[0];
    const qualItem = groupData.quality;
    const peso = obterPesoItem(itemId);
    const tcm = obterTCMItem(itemId);
    const { tier, encanto } = extrairInfoItem(itemId);
    const nomeBase = nomeItemEmPortugues(itemId);
    const estado = QUALITY_NAMES[qualItem] || "Normal";

    const cidadesArray = Object.entries(groupData).filter(([k]) => k !== "quality");
    if (cidadesArray.length < 2) continue;

    for (let i = 0; i < cidadesArray.length; i++) {
      for (let j = 0; j < cidadesArray.length; j++) {
        if (i === j) continue;
        const [cidadeOri, infoOri] = cidadesArray[i];
        const [cidadeDest, infoDest] = cidadesArray[j];
        if (!infoOri || !infoDest) continue;
        if (!infoOri.compra || !infoOri.venda || !infoDest.compra || !infoDest.venda) continue;

        const precoCompra = infoOri.compra;
        const precoVenda = infoDest.venda;
        const buyOrderDestino = infoDest.buyMax || 0;
        if (!precoCompra || !precoVenda || precoCompra <= 0 || precoVenda <= 0) continue;

        const custoTeleporte = calcularCustoTeleporteComTCM(peso, tcm, cidadeOri, cidadeDest);
        const receita = precoVenda * taxaVendaNota;
        const custos = precoCompra + custoTeleporte;
        const lucroLiquido = receita - custos;

        if (lucroLiquido > 0) {
          const agoraMs = Date.now();
          const destinoDate = new Date(String(infoDest.dataStrSell).replace(" ", "T")).getTime();
          const origemDate = new Date(String(infoOri.dataStrSell).replace(" ", "T")).getTime();
          const desatualizado =
            (!isNaN(destinoDate) && agoraMs - destinoDate > 12 * 3600000) ||
            (!isNaN(origemDate) && agoraMs - origemDate > 12 * 3600000);

          oportunidades.push({
            id: itemId, nomeBase, tier, encanto, estado,
            origem: cidadeOri, destino: cidadeDest,
            compra: precoCompra, venda: precoVenda, buyOrderDestino,
            custoTeleporte, lucro: lucroLiquido,
            margem: precoCompra > 0 ? ((precoVenda / precoCompra - 1) * 100) : 0,
            atualizacaoOrig: infoOri.dataStrSell, atualizacaoDest: infoDest.dataStrSell,
            atualizacaoBuyOrderDest: infoDest.dataStrBuy, desatualizado,
          });
        }
      }
    }
  }
  return oportunidades;
}

// ─── Streaming: envia oportunidades por chunk via callback ───
export async function buscarOportunidadesStream({
  categoria, maxIdadeHoras = 168, quality = 0,
  taxaVenda = 6.5, tier = "Todos", enchantment = "Todos",
}, onChunk) {
  let itens = await gerarListaItens(categoria);

  if (tier && tier !== "Todos") {
    itens = itens.filter(id => id.startsWith(tier + "_"));
  }
  if (enchantment !== undefined && enchantment !== null && enchantment !== "Todos") {
    const enc = parseInt(enchantment);
    if (enc === 0) itens = itens.filter(id => !id.includes("@"));
    else if (!isNaN(enc)) itens = itens.filter(id => id.includes(`@${enc}`));
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    onChunk({ type: "done", total: 0, processados: 0 });
    return;
  }

  const cidadesStr = CIDADES_SEGURAS.join(",");
  const maxIdade = Number(maxIdadeHoras) || 168;
  const agora = Date.now();
  const qualityNum = Number(quality) || 0;
  const taxaVendaNota = 1 - (taxaVenda / 100);

  const chunks = chunk(itens, 100);
  const totalItens = itens.length;
  let processados = 0;
  let totalOportunidades = 0;
  const concurrency = 5;

  console.log(`[Stream] Iniciando scan: ${totalItens} itens em ${chunks.length} chunks`);
  onChunk({ type: "start", totalItens, totalChunks: chunks.length });

  // Processar chunks em paralelo (batches de 5)
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (chunkItems) => {
        const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);
        return extrairOportunidadesDePrecos(respostaPrecos, maxIdade, agora, qualityNum, taxaVendaNota);
      })
    );

    for (const result of batchResults) {
      processados += 100; // aproximado por chunk
      if (result.status === "fulfilled" && result.value.length > 0) {
        totalOportunidades += result.value.length;
        onChunk({
          type: "chunk",
          oportunidades: result.value,
          processados: Math.min(processados, totalItens),
          totalItens,
        });
      }
    }

    // Breve pausa entre batches paralelos
    if (i + concurrency < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`[Stream] Scan completo: ${totalOportunidades} oportunidades`);
  onChunk({ type: "done", total: totalOportunidades, processados: totalItens });
}

// ─── Busca volume separadamente (lazy) ───
export async function buscarVolumeParaItens(itemIds) {
  const cidadesStr = CIDADES_SEGURAS.join(",");
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];

  if (uniqueIds.length === 0) return {};

  console.log(`[Volume] Buscando volume para ${uniqueIds.length} itens...`);
  let volumeMap = new Map();
  try {
    volumeMap = await fetchHistoryMarket(uniqueIds, cidadesStr);
    console.log(`[Volume] ✓ Volume obtido para ${volumeMap.size} combinações`);
  } catch (e) {
    console.log(`[Volume] ⚠️ Erro: ${e.message}`);
  }

  // Converter Map para objeto serializável
  const result = {};
  for (const [key, val] of volumeMap) {
    result[key] = val;
  }
  return result;
}

export async function obterCategoriasDinamicas() {
  // Garantir que os itens estão carregados (e categorias construídas)
  await carregarItensDoJogo();
  
  console.log(`[Categories] Obtendo categorias... CATEGORIES_CACHE: ${CATEGORIES_CACHE ? "existe" : "null"}`);
  console.log(`[Categories] Keys disponíveis: ${CATEGORIES_CACHE ? Object.keys(CATEGORIES_CACHE).length : 0}`);
  console.log(`[Categories] ALL_ITEM_IDS_CACHE: ${ALL_ITEM_IDS_CACHE ? ALL_ITEM_IDS_CACHE.length + " items" : "null"}`);

  // Retornar categorias dinâmicas ou fallback
  if (CATEGORIES_CACHE && Object.keys(CATEGORIES_CACHE).length > 0) {
    const cats = Object.keys(CATEGORIES_CACHE).sort();
    console.log(`[Categories] ✓ Retornando ${cats.length} categorias dinâmicas`);
    return cats;
  }
  
  console.log(`[Categories] ⚠️ Usando fallback para categorias estáticas`);
  // Fallback: retornar categorias estáticas
  return Object.keys(CATEGORIAS);
}
