import { fetchHistory, fetchPrices } from "./albionClient.js";

// Mapa de pesos dos itens (em kg) para calcular custo de teleporte
const ITEM_WEIGHTS = {
  "_MAIN_": 1.5, "_2H_": 2.0, "_RANGED_": 1.5,
  "_BODY_": 2.5, "_HEAD_": 1.0, "_SHOES_": 0.5, "_CAPE": 0.3, "_GLOVES_": 0.5,
  "_OFF_": 1.5, "_SHIELD_": 2.0,
  "_MOUNT_": 7.0,
  "_POTION_": 0.1, "_MEAL_": 0.2, "_DRINK_": 0.1, "_SPICE_": 0.05, "_HERB_": 0.05,
  "_RUNE": 0.3, "_SOUL": 0.3, "_RELIC": 0.3, "_BAG": 1.0, "_AMULET_": 0.2, "_RING_": 0.1,
  "_ORE_": 0.05, "_WOOD_": 0.05, "_LEATHER_": 0.05, "_CLOTH_": 0.02, "_PLANKS": 0.1,
};

const TELEPORT_RATE_PER_KG = 0.0075;

const QUALITY_NAMES = { 1: "Normal", 2: "Bom", 3: "Excepcional", 4: "Excelente" };

export const CATEGORIAS = {
  Todos: [],
  Armas: [
    "_MAIN_BLOODLETTER", "_MAIN_DAGGER", "_MAIN_SWORD", "_MAIN_MACE", "_MAIN_AXE", "_MAIN_HAMMER",
    "_MAIN_SPEAR", "_MAIN_STAFF", "_MAIN_CURSEDSTAFF", "_MAIN_NATURESTAFF", "_MAIN_FIRESTAFF", "_MAIN_FROSTSTAFF", "_MAIN_HOLYSTAFF",
    "_2H_BOW", "_2H_CROSSBOW", "_2H_CARVINGSWORD", "_2H_GREATAXE", "_2H_MAUL", "_2H_HALBERD", "_2H_PIKE", "_2H_DUALAXE_KEEPER", "_2H_DUALAXE", "_2H_MACE",
    "_RANGED_BOW", "_RANGED_CROSSBOW",
  ],
  Armaduras: [
    "_BODY_CLERICROBE", "_BODY_ASSASSINJACKET", "_BODY_SOLDIERARMOR", "_BODY_MAGE", "_BODY_CLOTHROBES", "_BODY_LEATHERARMOR", "_BODY_PLATEARMOR",
    "_BODY_CLOTH", "_BODY_LEATHER", "_BODY_PLATE",
  ],
  Elmos: [
    "_HEAD_HUNTER", "_HEAD_CLERICHOOD", "_HEAD_SOLDIERHELMET", "_HEAD_MAGE",
    "_HEAD_CLOTH", "_HEAD_LEATHER", "_HEAD_PLATE",
  ],
  Botas: [
    "_SHOES_SOLDIERBOOTS", "_SHOES_ASSASSINSHOES", "_SHOES_CLERICSHOES",
    "_SHOES_CLOTH", "_SHOES_LEATHER", "_SHOES_PLATE",
  ],
  Capas: [
    "_CAPE", "_CAPEITEM_FW_LYMHURST", "_CAPEITEM_FW_FORTSTERLING", "_CAPEITEM_FW_MARTLOCK", 
    "_CAPEITEM_FW_THETFORD", "_CAPEITEM_FW_BRIDGEWATCH",
  ],
  Escudos: [
    "_SHIELD_TOWER", "_SHIELD_KITE", "_SHIELD_ROUND", "_OFF_DAGGER", "_OFF_SHIELD",
  ],
  Luvas: [
    "_GLOVES_CLOTH", "_GLOVES_LEATHER", "_GLOVES_PLATE",
  ],
  Montarias: [
    "_MOUNT_HORSE", "_MOUNT_OX", "_MOUNT_SWIFTCLAW", "_MOUNT_STAG", "_MOUNT_RAM", "_MOUNT_MOOSE",
  ],
  Consumíveis: [
    "_POTION_HEAL", "_POTION_ENERGY", "_POTION_POWER", "_POTION_FORCE",
    "_MEAL_STEAK", "_MEAL_OMELETTE", "_MEAL_STEW", "_MEAL_PIE", "_MEAL_BREAD", "_MEAL_CHEESE",
    "_DRINK_WATER", "_DRINK_BEER",
    "_SPICE_SUGAR", "_SPICE_SALT", "_SPICE_HERB",
  ],
  Artefatos: [
    "_RUNE_AIR", "_RUNE_FIRE", "_RUNE_FROST", "_RUNE_HOLY", "_RUNE_NATURE", "_RUNE_ARCANE",
    "_SOUL_", "_RELIC_",
    "_AMULET_", "_RING_",
  ],
  Bolsas: [
    "_BAG_SMALL", "_BAG_MEDIUM", "_BAG_LARGE", "_BAG",
  ],
  Materiais: [
    "_ORE_COPPER", "_ORE_TIN", "_ORE_IRON", "_ORE_STEEL", "_ORE_TITANIUM",
    "_WOOD_BIRCH", "_WOOD_OAK", "_WOOD_ASHWOOD", "_WOOD_IRONWOOD", "_WOOD_EBONWOOD",
    "_LEATHER_THIN", "_LEATHER_THICK",
    "_CLOTH_LINEN", "_CLOTH_CLOTH", "_CLOTH_SILK",
    "_PLANKS", "_METAL", "_HIDE", "_FABRIC",
  ],
  Ferragens: [
    "_NAILS", "_SCREWS", "_BOLTS", "_HINGES",
  ],
  Outros: [
    "_BOOK_", "_SCROLL_", "_CRYSTAL_",
  ]
};

const CIDADES_SEGURAS = [
  "Bridgewatch",
  "FortSterling",
  "Lymhurst",
  "Martlock",
  "Thetford",
  "Brecilien",
];

const TIERS = ["T4", "T5", "T6", "T7", "T8"];

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

function gerarListaItens(categoria) {
  let bases = CATEGORIAS[categoria] || [];
  
  if (categoria === "Todos") {
    bases = [];
    for (const [cat, itens] of Object.entries(CATEGORIAS)) {
      if (cat !== "Todos") {
        bases.push(...itens);
      }
    }
    bases = [...new Set(bases)];
  }
  
  const lista = [];
  for (const t of TIERS) {
    for (const b of bases) {
      lista.push(`${t}${b}`);
      // Também adicionar versões com encantamentos (@1, @2, @3, @4)
      for (const enc of ["@1", "@2", "@3", "@4"]) {
        lista.push(`${t}${b}${enc}`);
      }
    }
  }
  return lista;
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
  const merged = [];
  for (const part of chunk(unique, 100)) {
    const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(
      ","
    )}?locations=${encodeURIComponent(loc)}&qualities=${quality}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
    merged.push(...(await res.json()));
  }
  return merged;
}

export async function buscarOportunidades({ 
  categoria, 
  maxIdadeHoras = 6,
  quality = 1,
  usarBuyOrder = false,
  taxaVenda = 6.5,
  teleportRate = TELEPORT_RATE_PER_KG
}) {
  const itens = gerarListaItens(categoria);
  const cidadesStr = CIDADES_SEGURAS.join(",");
  const maxIdade = Number(maxIdadeHoras) || 6;
  const agora = Date.now();
  const qualityNum = Number(quality) || 1;
  const taxaVendaDecimal = (taxaVenda / 100);
  const taxaVendaNota = 1 - taxaVendaDecimal;

  const chunks = chunk(itens, 100);
  const oportunidadesBrutas = [];

  for (const chunkItems of chunks) {
    const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);

    const mapaPrecos = new Map();
    for (const p of respostaPrecos) {
      const dataStr = p.sell_price_min_date;
      if (!dataStr || String(dataStr).startsWith("0001")) continue;

      const dataApi = new Date(String(dataStr).replace(" ", "T")).getTime();
      const idadeHoras = (agora - dataApi) / 3600000;

      if (idadeHoras <= maxIdade && p.sell_price_min > 0) {
        const it = p.item_id;
        if (!mapaPrecos.has(it)) mapaPrecos.set(it, {});
        
        const precoCompra = usarBuyOrder && p.buy_price_max > 0 ? p.buy_price_max : p.sell_price_min;
        const precoVenda = p.sell_price_min; // Sempre o menor da sell order
        
        mapaPrecos.get(it)[p.city] = {
          precoCompra,
          precoVenda,
          dataStr: String(dataStr).replace("T", " ").slice(0, 16),
        };
      }
    }

    for (const [itemId, cidades] of mapaPrecos) {
      const peso = obterPesoItem(itemId);
      const custoTeleporte = peso * teleportRate;
      const { tier, encanto } = extrairInfoItem(itemId);
      const nomeBase = itemId.slice(2).replace(/@\d+/, "").replace(/_/g, " ").trim();
      const estado = QUALITY_NAMES[qualityNum] || "?";
      
      const cidadesArray = Object.entries(cidades);
      
      for (let i = 0; i < cidadesArray.length; i++) {
        for (let j = 0; j < cidadesArray.length; j++) {
          if (i === j) continue;
          
          const [cidadeOri, infoOri] = cidadesArray[i];
          const [cidadeDest, infoDest] = cidadesArray[j];
          
          const precoCompra = infoOri.precoCompra;
          const precoVenda = infoDest.precoVenda;
          
          // Lucro = (Preço_Venda × Taxa_Venda%) - Preço_Compra - Custo_Teleporte
          const receita = precoVenda * taxaVendaNota;
          const custos = precoCompra + custoTeleporte;
          const lucroLiquido = receita - custos;

          if (lucroLiquido > 0) {
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
              custoTeleporte,
              lucro: lucroLiquido,
              atualizacaoDest: infoDest.dataStr,
            });
          }
        }
      }
    }
  }

  oportunidadesBrutas.sort((a, b) => b.lucro - a.lucro);
  const top = oportunidadesBrutas.slice(0, 50);

  const resultadosFinais = [];
  for (const op of top) {
    const mediaVendas = await obterMediaVendas7d(op.id, op.destino);
    if (mediaVendas > 0) {
      resultadosFinais.push({
        ...op,
        media7d: mediaVendas,
      });
      if (resultadosFinais.length >= 20) break;
    }
  }

  return resultadosFinais.slice(0, 20);
}
