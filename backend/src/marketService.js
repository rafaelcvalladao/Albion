import { fetchHistory, fetchPrices } from "./albionClient.js";

export const CATEGORIAS = {
  Armas: [
    "_MAIN_BLOODLETTER",
    "_2H_BOW",
    "_2H_CARVINGSWORD",
    "_MAIN_CURSEDSTAFF",
    "_2H_HALBERD",
    "_2H_DUALAXE_KEEPER",
    "_2H_MACE",
  ],
  Armaduras: ["_BODY_CLERICROBE", "_BODY_ASSASSINJACKET", "_BODY_SOLDIERARMOR", "_BODY_MAGE"],
  Elmos: ["_HEAD_HUNTER", "_HEAD_CLERICHOOD", "_HEAD_SOLDIERHELMET", "_HEAD_MAGE"],
  Botas: ["_SHOES_SOLDIERBOOTS", "_SHOES_ASSASSINSHOES", "_SHOES_CLERICSHOES"],
  Capas: [
    "_CAPE",
    "_CAPEITEM_FW_LYMHURST",
    "_CAPEITEM_FW_FORTSTERLING",
    "_CAPEITEM_FW_MARTLOCK",
    "_CAPEITEM_FW_THETFORD",
    "_CAPEITEM_FW_BRIDGEWATCH",
  ],
  Montarias: ["_MOUNT_HORSE", "_MOUNT_OX", "_MOUNT_SWIFTCLAW", "_MOUNT_STAG"],
  Consumíveis: [
    "_POTION_HEAL",
    "_POTION_ENERGY",
    "_MEAL_STEAK",
    "_MEAL_OMELETTE",
    "_MEAL_STEW",
    "_MEAL_PIE",
  ],
  Artefatos: ["_RUNE", "_SOUL", "_RELIC"],
  "Etc (Bolsas)": ["_BAG"],
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

function gerarListaItens(categoria) {
  const bases = CATEGORIAS[categoria] || [];
  const lista = [];
  for (const t of TIERS) {
    for (const b of bases) {
      lista.push(`${t}${b}`);
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
 * Preços em várias cidades com qualities=1 (query extra na URL Albion).
 */
async function fetchPricesMarket(itemIds, locations) {
  const unique = [...new Set(itemIds.filter(Boolean))];
  const loc = Array.isArray(locations) ? locations.join(",") : locations;
  const merged = [];
  for (const part of chunk(unique, 100)) {
    const url = `https://www.albion-online-data.com/api/v2/stats/prices/${part.join(
      ","
    )}?locations=${encodeURIComponent(loc)}&qualities=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Albion prices HTTP ${res.status}`);
    merged.push(...(await res.json()));
  }
  return merged;
}

export async function buscarOportunidades({ categoria, maxIdadeHoras = 6 }) {
  const itens = gerarListaItens(categoria);
  const cidadesStr = CIDADES_SEGURAS.join(",");
  const maxIdade = Number(maxIdadeHoras) || 6;
  const agora = Date.now();

  const chunks = chunk(itens, 100);
  const oportunidadesBrutas = [];

  for (const chunkItems of chunks) {
    const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr);

    const mapaPrecos = new Map();
    for (const p of respostaPrecos) {
      const dataStr = p.sell_price_min_date;
      if (!dataStr || String(dataStr).startsWith("0001")) continue;

      const dataApi = new Date(String(dataStr).replace(" ", "T")).getTime();
      const idadeHoras = (agora - dataApi) / 3600000;

      if (idadeHoras <= maxIdade && p.sell_price_min > 0) {
        const it = p.item_id;
        if (!mapaPrecos.has(it)) mapaPrecos.set(it, []);
        mapaPrecos.get(it).push({
          cidade: p.city,
          preco: p.sell_price_min,
          idade: idadeHoras,
          dataStr: String(dataStr).replace("T", " ").slice(0, 16),
        });
      }
    }

    for (const [itemId, ofertas] of mapaPrecos) {
      for (const ori of ofertas) {
        for (const dest of ofertas) {
          if (ori.cidade === dest.cidade) continue;

          const lucroLiquido = dest.preco * 0.935 - ori.preco;

          if (lucroLiquido > 0) {
            oportunidadesBrutas.push({
              id: itemId,
              origem: ori.cidade,
              destino: dest.cidade,
              compra: ori.preco,
              venda: dest.preco,
              lucro: lucroLiquido,
              atualizacaoDest: dest.dataStr,
            });
          }
        }
      }
    }
  }

  oportunidadesBrutas.sort((a, b) => b.lucro - a.lucro);
  const top = oportunidadesBrutas.slice(0, 30);

  const resultadosFinais = [];
  for (const op of top) {
    const mediaVendas = await obterMediaVendas7d(op.id, op.destino);
    if (mediaVendas > 0) {
      resultadosFinais.push({
        ...op,
        media7d: mediaVendas,
      });
      if (resultadosFinais.length >= 15) break;
    }
  }

  return resultadosFinais.slice(0, 15);
}
