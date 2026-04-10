import {
  CATEGORIAS,
  CIDADES_SEGURAS,
  QUALITY_NAMES,
  nomeItemEmPortugues,
  extrairInfoItem,
  calcularCustoTeleporte,
} from './marketConstants.js';
import { gerarListaItens, obterCategoriasDinamicas } from './marketItems.js';
import { chunk, fetchPricesMarket, fetchHistoryMarket } from './marketPrices.js';

// Re-export para manter compatibilidade com index.js
export { CATEGORIAS, obterCategoriasDinamicas };

const ITEMS_PER_CHUNK = 100;

// ─── Extrai oportunidades de um chunk de preços ───
function extrairOportunidadesDePrecos(respostaPrecos, maxIdade, agora, qualityNum, taxaVendaNota) {
  const mapaPrecos = new Map();
  for (const p of respostaPrecos) {
    const dataStr = p.sell_price_min_date;
    if (!dataStr || String(dataStr).startsWith('0001')) continue;

    const dataApi = new Date(String(dataStr).replace(' ', 'T')).getTime();
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
          dataStr: String(dataStr).replace('T', ' ').slice(0, 16),
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
      compra: dados.sellMin,
      venda: dados.sellMin,
      buyMax: dados.buyMax,
      dataStrSell: dados.dataStr,
      dataStrBuy: dados.dataStr,
    };
  }

  const oportunidades = [];
  for (const [groupKey, groupData] of mapaOrganizado) {
    const itemId = groupKey.split('|')[0];
    const qualItem = groupData.quality;
    const { tier, encanto } = extrairInfoItem(itemId);
    const nomeBase = nomeItemEmPortugues(itemId);
    const estado = QUALITY_NAMES[qualItem] || 'Normal';

    const cidadesArray = Object.entries(groupData).filter(([k]) => k !== 'quality');
    if (cidadesArray.length < 2) continue;

    // Filtrar outliers: descartar cidades cujo sell price > 3× a mediana
    const sellPrices = cidadesArray
      .map(([, info]) => info.compra)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    if (sellPrices.length < 2) continue;
    const mid = Math.floor(sellPrices.length / 2);
    const mediana =
      sellPrices.length % 2 === 0
        ? (sellPrices[mid - 1] + sellPrices[mid]) / 2
        : sellPrices[mid];
    const limiteOutlier = mediana * 3;
    const cidadesFiltradas = cidadesArray.filter(([, info]) => info.compra <= limiteOutlier);
    if (cidadesFiltradas.length < 2) continue;

    for (let i = 0; i < cidadesFiltradas.length; i++) {
      for (let j = 0; j < cidadesFiltradas.length; j++) {
        if (i === j) continue;
        const [cidadeOri, infoOri] = cidadesFiltradas[i];
        const [cidadeDest, infoDest] = cidadesFiltradas[j];
        if (!infoOri || !infoDest) continue;
        if (!infoOri.compra || !infoOri.venda || !infoDest.compra || !infoDest.venda) continue;

        const precoCompra = infoOri.compra;
        const precoVenda = infoDest.venda;
        const buyOrderDestino = infoDest.buyMax || 0;
        if (precoCompra <= 0 || precoVenda <= 0) continue;

        const custoTeleporte = calcularCustoTeleporte(itemId, cidadeOri, cidadeDest);
        const receita = precoVenda * taxaVendaNota;
        const custos = precoCompra + custoTeleporte;
        const lucroLiquido = receita - custos;

        if (lucroLiquido > 0) {
          const vendaInstantanea =
            buyOrderDestino > 0 && buyOrderDestino > precoCompra + custoTeleporte;

          oportunidades.push({
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
            margem: precoCompra > 0 ? (precoVenda / precoCompra - 1) * 100 : 0,
            atualizacaoOrig: infoOri.dataStrSell,
            atualizacaoDest: infoDest.dataStrSell,
            atualizacaoBuyOrderDest: infoDest.dataStrBuy,
            vendaInstantanea,
          });
        }
      }
    }
  }
  return oportunidades;
}

// ─── Busca principal de oportunidades ───
export async function buscarOportunidades({
  categoria,
  maxIdadeHoras = 168,
  quality = 0,
  taxaVenda = 6.5,
  offset = 0,
  step = 500,
  tier = 'Todos',
  enchantment = 'Todos',
}) {
  let itens = await gerarListaItens(categoria);

  if (tier && tier !== 'Todos') {
    itens = itens.filter((id) => id.startsWith(tier + '_'));
  }

  if (enchantment !== undefined && enchantment !== null && enchantment !== 'Todos') {
    const enc = parseInt(enchantment);
    if (enc === 0) itens = itens.filter((id) => !id.includes('@'));
    else if (!isNaN(enc)) itens = itens.filter((id) => id.includes(`@${enc}`));
  }

  if (!Array.isArray(itens) || itens.length === 0) return [];

  let itensProcessar;
  if (categoria === 'Todos') {
    itensProcessar = itens;
  } else {
    itensProcessar = itens.slice(offset, Math.min(offset + step, itens.length));
  }

  if (!itensProcessar.length) return [];

  const cidadesStr = CIDADES_SEGURAS.join(',');
  const maxIdade = Number(maxIdadeHoras) || 168;
  const agora = Date.now();
  const qualityNum = Number(quality) || 0;
  const taxaVendaNota = 1 - taxaVenda / 100;

  const chunks = chunk(itensProcessar, ITEMS_PER_CHUNK);

  const oportunidadesBrutas = [];

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunkItems = chunks[chunkIdx];

    const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);

    const ops = extrairOportunidadesDePrecos(
      respostaPrecos,
      maxIdade,
      agora,
      qualityNum,
      taxaVendaNota,
    );
    oportunidadesBrutas.push(...ops);
  }

  oportunidadesBrutas.sort((a, b) => b.lucro - a.lucro);

  const dedupSet = new Set();
  const oportunidadesUnicas = [];
  for (const op of oportunidadesBrutas) {
    const chave = `${op.id}|${op.origem}|${op.destino}`;
    if (!dedupSet.has(chave)) {
      dedupSet.add(chave);
      oportunidadesUnicas.push(op);
    }
  }

  const uniqueItemIds = [...new Set(oportunidadesUnicas.map((o) => o.id))];
  let volumeMap = new Map();
  try {
    volumeMap = await fetchHistoryMarket(uniqueItemIds, cidadesStr);
  } catch {
    // Continua sem volume
  }

  for (const op of oportunidadesUnicas) {
    const volOrig = volumeMap.get(`${op.id}|${op.origem}`) || 0;
    const volDest = volumeMap.get(`${op.id}|${op.destino}`) || 0;
    op.volumeDiario = Math.max(volOrig, volDest);
  }

  return oportunidadesUnicas;
}

// ─── Streaming: envia oportunidades por chunk via callback ───
export async function buscarOportunidadesStream(
  {
    categoria,
    maxIdadeHoras = 168,
    quality = 0,
    taxaVenda = 6.5,
    tier = 'Todos',
    enchantment = 'Todos',
  },
  onChunk,
) {
  let itens = await gerarListaItens(categoria);

  if (tier && tier !== 'Todos') itens = itens.filter((id) => id.startsWith(tier + '_'));
  if (enchantment !== undefined && enchantment !== null && enchantment !== 'Todos') {
    const enc = parseInt(enchantment);
    if (enc === 0) itens = itens.filter((id) => !id.includes('@'));
    else if (!isNaN(enc)) itens = itens.filter((id) => id.includes(`@${enc}`));
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    onChunk({ type: 'done', total: 0, processados: 0 });
    return;
  }

  const cidadesStr = CIDADES_SEGURAS.join(',');
  const maxIdade = Number(maxIdadeHoras) || 168;
  const agora = Date.now();
  const qualityNum = Number(quality) || 0;
  const taxaVendaNota = 1 - taxaVenda / 100;

  const chunks = chunk(itens, ITEMS_PER_CHUNK);
  const totalItens = itens.length;
  let processados = 0;
  let totalOportunidades = 0;
  const concurrency = 5;

  onChunk({ type: 'start', totalItens, totalChunks: chunks.length });

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (chunkItems) => {
        const respostaPrecos = await fetchPricesMarket(chunkItems, cidadesStr, qualityNum);
        return extrairOportunidadesDePrecos(
          respostaPrecos,
          maxIdade,
          agora,
          qualityNum,
          taxaVendaNota,
        );
      }),
    );

    for (const result of batchResults) {
      processados += 100;
      if (result.status === 'fulfilled' && result.value.length > 0) {
        totalOportunidades += result.value.length;
        onChunk({
          type: 'chunk',
          oportunidades: result.value,
          processados: Math.min(processados, totalItens),
          totalItens,
        });
      }
    }

    if (i + concurrency < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  onChunk({ type: 'done', total: totalOportunidades, processados: totalItens });
}

// ─── Busca volume separadamente (lazy) ───
export async function buscarVolumeParaItens(itemIds) {
  const cidadesStr = CIDADES_SEGURAS.join(',');
  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  let volumeMap = new Map();
  try {
    volumeMap = await fetchHistoryMarket(uniqueIds, cidadesStr);
  } catch {
    // Continua sem volume
  }

  const result = {};
  for (const [key, val] of volumeMap) result[key] = val;
  return result;
}
