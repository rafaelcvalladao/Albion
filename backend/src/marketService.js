import { fetchHistory, fetchPrices } from "./albionClient.js";

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

const QUALITY_NAMES = { 1: "Normal", 2: "Bom", 3: "Excepcional", 4: "Excelente" };

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

    // Parse: T#_CATEGORIA_SUBCATEGORIA_...@QUALIDADE
    // Remover qualidade (@#)
    const baseId = uniqueName.split("@")[0];
    const parts = baseId.split("_");

    if (parts.length < 2) continue;

    itemsComCategoria++;

    // Extrair categoria base (segundo elemento após tier)
    const categoria = parts[1]; // 2H, MAIN, HEAD, ARMOR, SHOES, ARTEFACT, etc

    // Mapear para categoria amigável ou usar o próprio
    let mainCat = categoria; // Usar categoria do UniqueName como padrão

    // Agrupamentos lógicos (opcional, mas melhora UX)
    const armasCategorias = ["2H", "MAIN", "RANGED"];
    const armaduracategorias = ["HEAD", "ARMOR", "SHOES", "GLOVES", "CAPE"];
    const escudoCategorias = ["OFF", "SHIELD"];
    const consumívelCategorias = ["POTION", "MEAL", "DRINK", "SPICE"];
    const materialCategorias = ["ORE", "WOOD", "LEATHER", "CLOTH", "METALBAR", "HIDE", "FABRIC"];
    const artefatoCategorias = ["RUNE", "SOUL", "RELIC", "ARTEFACT", "ARTIFACT"];

    // Usar categoria específica OU criar agrupamento
    if (armasCategorias.includes(categoria)) mainCat = "Armas - " + categoria;
    else if (armaduracategorias.includes(categoria)) mainCat = "Armaduras - " + categoria;
    else if (escudoCategorias.includes(categoria)) mainCat = "Escudos - " + categoria;
    else if (consumívelCategorias.includes(categoria)) mainCat = "Consumível - " + categoria;
    else if (materialCategorias.includes(categoria)) mainCat = "Materiais - " + categoria;
    else if (artefatoCategorias.includes(categoria)) mainCat = "Artefatos - " + categoria;
    else if (categoria === "MOUNT") mainCat = "Montarias";
    else if (categoria === "BAG") mainCat = "Bolsas";
    else if (["BOOK", "SCROLL"].includes(categoria)) mainCat = "Documentos";
    else if (uniqueName.includes("UNIQUE")) mainCat = "Itens Únicos";
    else mainCat = "Outros - " + categoria; // Fallback

    if (!cats[mainCat]) cats[mainCat] = [];
    cats[mainCat].push(uniqueName);
  }

  // Deduplicar todos
  for (const cat in cats) {
    cats[cat] = [...new Set(cats[cat])];
  }

  // Ordenar categorias alfabeticamente
  const sortedCats = {};
  Object.keys(cats).sort().forEach(key => {
    sortedCats[key] = cats[key];
  });

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

  console.log(`[gerarListaItens] Solicitado: ${categoria}, CATEGORIES_CACHE existe: ${!!CATEGORIES_CACHE}`);

  // Usar categorias dinâmicas
  if (CATEGORIES_CACHE && CATEGORIES_CACHE[categoria]) {
    lista = CATEGORIES_CACHE[categoria];
    console.log(`[gerarListaItens] ✓ Usando categoria dinâmica "${categoria}": ${lista.length} itens`);
  } else if (categoria === "Todos") {
    // Se não tiver categoria específica, retorna todos
    const todos = ALL_ITEM_IDS_CACHE || [];
    lista = todos;
    console.log(`[gerarListaItens] ✓ Usando TODOS: ${lista.length} itens`);
  } else {
    // Fallback para categorias estáticas se não encontrar dinâmica
    const bases = CATEGORIAS[categoria] || [];
    lista = bases.flatMap((b) => {
      const baseIds = TIERS.map((t) => `${t}${b}`);
      return baseIds;
    });
    console.log(`[gerarListaItens] ⚠️ Fallback estático para "${categoria}": ${lista.length} itens`);
  }

  return [...new Set(lista)];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function obterMediaVendas7d(itemId, cidade) {
  try {
    const resposta = await fetchHistory([itemId], cidade, 24);
    if (!resposta?.length || !resposta[0]?.data?.length) return 0;

    const dadosHistorico = resposta[0].data;
    const limite7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let totalVendido = 0;
    let diasContados = 0;

    for (const registro of dadosHistorico) {
      const dataRegistro = new Date(registro.timestamp).getTime();
      if (dataRegistro >= limite7d) {
        totalVendido += registro.item_count || 0;
        diasContados += 1;
      }
    }

    if (diasContados === 0) return 0;
    return Math.floor(totalVendido / 7);
  } catch {
    return 0;
  }
}

/**
 * Preços em várias cidades com qualities configurável (query extra na URL Albion).
 */
async function fetchPricesMarket(itemIds, locations, quality = 1) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const allChunks = chunk(unique, 100);
  const merged = [];
  const concurrency = 3;

  for (let i = 0; i < allChunks.length; i += concurrency) {
    const batch = allChunks.slice(i, i + concurrency);
    const calls = batch.map(async (part) => {
      const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(",")}?locations=${encodeURIComponent(loc)}&qualities=${quality}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`Albion prices HTTP ${res.status}`);
      }
      return res.json();
    });

    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        merged.push(...r.value);
      }
    }

    // Respeita limites de rate, evita burst de requisições
    if (i + concurrency < allChunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  return merged;
}

export async function buscarOportunidades({ 
  categoria, 
  maxIdadeHoras = 6,
  quality = 1,
  usarBuyOrder = false,
  taxaVenda = 6.5,
  maxItensProcessar = 999999, // Sem limite efetivo
  offset = 0,
  step = 500,
}) {
  let itens = await gerarListaItens(categoria);

  console.log(`[Market] Categoria: ${categoria}, Total itens carregados: ${itens?.length || 0}`);

  if (!Array.isArray(itens) || itens.length === 0) {
    console.log(`[Market] Erro: itens inválido ou vazio. Retornando []`);
    return [];
  }

  // Processa TODOS os itens (sem limitar)
  const itensProcessar = itens.slice(offset, Math.min(offset + step, itens.length));
  console.log(`[Market] Processando slice: offset=${offset}, step=${step}, itens neste batch=${itensProcessar.length}/${itens.length}`);
  
  if (!itensProcessar.length) {
    console.log(`[Market] Slice vazio! Retornando []`);
    return [];
  }

  const cidadesStr = CIDADES_SEGURAS.join(",");
  const maxIdade = Number(maxIdadeHoras) || 24; // Aumentado para 24h por padrão
  const agora = Date.now();
  const qualityNum = Number(quality) || 1;
  const taxaVendaDecimal = (taxaVenda / 100);
  const taxaVendaNota = 1 - taxaVendaDecimal;

  const chunks = chunk(itensProcessar, 100);
  const oportunidadesBrutas = [];
  for (const chunkItems of chunks) {
    console.log(`[Market] Buscando preços para chunk de ${chunkItems.length} itens...`);
    const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);
    console.log(`[Market] API retornou ${respostaPrecos?.length || 0} registros de preço`);

    // Contar items com preço vs sem
    const itemsComPreco = new Set(respostaPrecos.map(p => p.item_id));
    console.log(`[Market] ${itemsComPreco.size}/${chunkItems.length} items do chunk têm preço`);

    const mapaPrecos = new Map();
    for (const p of respostaPrecos) {
      const dataStr = p.sell_price_min_date;
      if (!dataStr || String(dataStr).startsWith("0001")) continue;

      const dataApi = new Date(String(dataStr).replace(" ", "T")).getTime();
      const idadeHoras = (agora - dataApi) / 3600000;

      if (idadeHoras <= maxIdade && p.sell_price_min > 0) {
        const it = p.item_id;
        const cidade = p.city;
        const chave = `${it}|${cidade}`;
        
        if (!mapaPrecos.has(chave)) {
          mapaPrecos.set(chave, {
            item: it,
            city: cidade,
            sellMin: p.sell_price_min,
            buyMax: p.buy_price_max || 0,
            dataStr: String(dataStr).replace("T", " ").slice(0, 16),
          });
        } else {
          // Se já existe um registro, manter o com MENOR sell_price_min
          const existente = mapaPrecos.get(chave);
          if (p.sell_price_min < existente.sellMin) {
            existente.sellMin = p.sell_price_min;
          }
          // Para buy_price_max, manter o com MAIOR valor
          if (p.buy_price_max > existente.buyMax) {
            existente.buyMax = p.buy_price_max;
          }
        }
      }
    }
    
    // Converter de volta para formato por item/cidade
    const mapaOrganiado = new Map();
    for (const [chave, dados] of mapaPrecos) {
      const it = dados.item;
      if (!mapaOrganiado.has(it)) mapaOrganiado.set(it, {});
      
      mapaOrganiado.get(it)[dados.city] = {
        compra: dados.sellMin,
        venda: dados.sellMin,
        buyMax: dados.buyMax,
        dataStrSell: dados.dataStr,
        dataStrBuy: dados.dataStr, // Em produção seria a data do buy_price_max, mas usamos a mesma por simplicidade
      };
    }

    for (const [itemId, cidades] of mapaOrganiado) {
      const peso = obterPesoItem(itemId);
      const tcm = obterTCMItem(itemId);
      const { tier, encanto } = extrairInfoItem(itemId);
      const nomeBase = nomeItemEmPortugues(itemId);
      const estado = QUALITY_NAMES[qualityNum] || "?";
      
      const cidadesArray = Object.entries(cidades);
      
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
  
  // Deduplicar por combinação (tier + encanto + qualidade + origem + destino)
  // IMPORTANTE: Comparamos preços de itens com as MESMAS características!
  // - Tier: T4, T5, ... T8
  // - Encanto: .0 (ou sem), .1, .2, .3, .4
  // - Qualidade: Normal, Bom, Excepcional, Excelente, Obra-prima
  // Itens sem encanto têm encanto="0", itens sem esses atributos usam valor padrão
  const dedupSet = new Set();
  const oportunidadesUnicas = [];
  for (const op of oportunidadesBrutas) {
    const chave = `${op.tier}|${op.encanto}|${op.estado}|${op.origem}|${op.destino}`;
    if (!dedupSet.has(chave)) {
      dedupSet.add(chave);
      oportunidadesUnicas.push(op);
    }
  }
  console.log(`[Market] Após deduplicar: ${oportunidadesUnicas.length} oportunidades únicas`);
  
  // Retornar TODOS os itens encontrados neste batch (sem limite de 100)
  // O frontend deduplica e ordena por lucro
  console.log(`[Market] Retornando ${oportunidadesUnicas.length} oportunidades deste batch`);
  return oportunidadesUnicas;
}

export async function obterCategoriasDinamicas() {
  // Garantir que os itens estão carregados (e categorias construídas)
  await carregarItensDoJogo();
  
  console.log(`[Categories] Obtendo categorias... CATEGORIES_CACHE: ${CATEGORIES_CACHE ? "existe" : "null"}`);
  console.log(`[Categories] Keys disponíveis: ${CATEGORIES_CACHE ? Object.keys(CATEGORIES_CACHE).length : 0}`);

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
