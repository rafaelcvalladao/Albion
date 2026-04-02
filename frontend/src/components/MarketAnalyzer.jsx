import { useEffect, useState, useRef, useCallback } from 'react';
import { marketCategories, marketOpportunitiesStream, marketVolume } from '../api.js';
import { profitClass } from '../utils/profit.js';
import NestedCategorySelector from './NestedCategorySelector.jsx';

function tierStyle(tier) {
  const colors = {
    T4: '#9f6d34',
    T5: '#3a84c8',
    T6: '#9f3fba',
    T7: '#d46f2e',
    T8: '#c41d7f',
  };
  return colors[tier] || '#999';
}

function timeAgo(label) {
  if (!label) return '-';
  const parts = String(label).split(' ');
  if (parts.length < 2) return label;
  const [datePart, timePart] = parts;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return 'agora';
  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export default function MarketAnalyzer() {
  const [categories, setCategories] = useState([]);
  const [categoria, setCategoria] = useState('Todos');
  const [tier, setTier] = useState('Todos');
  const [enchantment, setEnchantment] = useState('Todos');
  const [quality, setQuality] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [itemsProcessados, setItemsProcessados] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPrata, setMaxPrata] = useState('');
  const [sortCol, setSortCol] = useState('lucro');
  const [filterInstant, setFilterInstant] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [loadingVolume, setLoadingVolume] = useState(false);
  const itemsPerPage = 20;
  const streamRef = useRef(null);

  useEffect(() => {
    console.log('[MarketAnalyzer] 🚀 Iniciando carregamento de categorias...');
    marketCategories()
      .then((d) => {
        console.log('[MarketAnalyzer] ✓ Resposta recebida:', d);
        const cats = d.categories || [];
        console.log(`[MarketAnalyzer] ✓ Categorias carregadas: ${cats.length} categorias`);
        console.log(`[MarketAnalyzer] Primeiras 5: ${cats.slice(0, 5).join(', ')}`);
        setCategories(cats);
        if (cats.length && !cats.includes(categoria)) {
          setCategoria(cats[0]);
        }
      })
      .catch((err) => {
        console.error('[MarketAnalyzer] ❌ Erro ao carregar categorias:', err);
        console.error('[MarketAnalyzer] Usando categorias estáticas como fallback');
        setCategories([
          'Todos',
          'Armas',
          'Armaduras',
          'Elmos',
          'Botas',
          'Capas',
          'Escudos',
          'Luvas',
          'Montarias',
          'Consumíveis',
          'Artefatos',
          'Bolsas',
          'Materiais',
          'Ferragens',
          'Outros',
        ]);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once on mount

  // Cleanup: abortar stream ao desmontar
  useEffect(() => {
    return () => {
      streamRef.current?.abort();
    };
  }, []);

  // Lazy volume loading: buscar volume depois que o scan termina
  const carregarVolume = useCallback(async (currentRows) => {
    const uniqueIds = [...new Set(currentRows.map((r) => r.id))];
    if (uniqueIds.length === 0) return;

    setLoadingVolume(true);
    try {
      // Buscar em batches de 200 para não sobrecarregar
      const batchSize = 200;
      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        const data = await marketVolume(batch);
        const volumes = data.volumes || {};

        setRows((prev) =>
          prev.map((op) => {
            const vol = volumes[`${op.id}|${op.destino}`] || 0;
            return vol > 0 ? { ...op, volumeDiario: vol } : op;
          }),
        );
      }
    } catch (e) {
      console.warn('[Volume] Erro ao buscar volume:', e);
    } finally {
      setLoadingVolume(false);
    }
  }, []);

  const buscar = () => {
    // Abortar scan anterior se existir
    streamRef.current?.abort();

    setScanning(true);
    setLoading(true);
    setErr(null);
    setRows([]);
    setItemsProcessados(0);
    setTotalItens(0);
    setCurrentPage(1);

    // Acumulador de oportunidades (dedup incremental)
    const dedupSet = new Set();
    const acumulador = [];

    const stream = marketOpportunitiesStream(
      {
        categoria,
        tier: tier !== 'Todos' ? tier : undefined,
        enchantment: enchantment !== 'Todos' ? enchantment : undefined,
        quality: quality !== 'Todos' ? quality : '0',
      },
      {
        onChunk: (oportunidades) => {
          for (const op of oportunidades) {
            const chave = `${op.id}|${op.estado}|${op.origem}|${op.destino}`;
            if (!dedupSet.has(chave)) {
              dedupSet.add(chave);
              acumulador.push(op);
            }
          }
          // Ordenar e atualizar a UI imediatamente
          acumulador.sort((a, b) => (Number(b.lucro) || 0) - (Number(a.lucro) || 0));
          setRows([...acumulador]);
        },
        onProgress: ({ processados, totalItens: total }) => {
          setItemsProcessados(processados);
          setTotalItens(total);
        },
        onDone: () => {
          setScanning(false);
          setLoading(false);
          console.log(`[Market] Stream concluído: ${acumulador.length} oportunidades`);
          // Lazy: buscar volume em background
          carregarVolume(acumulador);
        },
        onError: (msg) => {
          setErr(msg);
          setScanning(false);
          setLoading(false);
        },
      },
    );

    streamRef.current = stream;
  };

  const cancelar = () => {
    streamRef.current?.abort();
    streamRef.current = null;
    setScanning(false);
    setLoading(false);
  };

  return (
    <div className="panel">
      <h2>Arbitragem entre cidades seguras</h2>
      <p className="strategy-hint">
        Compara preços entre cidades seguras; lucro líquido estimado com todas as taxas incluídas.
      </p>

      {/* Toolbar */}
      <div className="market-toolbar">
        <div className="categories-wrapper">
          <label className="category-label-text">Categoria</label>
          <NestedCategorySelector
            categories={categories}
            selectedCategory={categoria}
            onCategoryChange={setCategoria}
          />
        </div>

        <div className="filter-wrapper">
          <label className="category-label-text">Grau</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="filter-select">
            <option value="Todos">Todos</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
            <option value="T4">T4</option>
            <option value="T5">T5</option>
            <option value="T6">T6</option>
            <option value="T7">T7</option>
            <option value="T8">T8</option>
          </select>
        </div>

        <div className="filter-wrapper">
          <label className="category-label-text">Encantamento</label>
          <select
            value={enchantment}
            onChange={(e) => setEnchantment(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Todos</option>
            <option value="0">.0</option>
            <option value="1">.1</option>
            <option value="2">.2</option>
            <option value="3">.3</option>
            <option value="4">.4</option>
          </select>
        </div>

        <div className="filter-wrapper">
          <label className="category-label-text">Qualidade</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Todos</option>
            <option value="1">Normal</option>
            <option value="2">Bom</option>
            <option value="3">Excepcional</option>
            <option value="4">Excelente</option>
            <option value="5">Obra-prima</option>
          </select>
        </div>

        <div className="max-prata-wrapper">
          <label className="category-label-text">Máx. Prata Disponível</label>
          <input
            type="number"
            value={maxPrata}
            onChange={(e) => setMaxPrata(e.target.value)}
            placeholder="Ex: 100000000"
            className="max-prata-input"
          />
        </div>

        <div className="search-item-wrapper">
          <label className="category-label-text">Pesquisar Item</label>
          <input
            type="text"
            value={searchItem}
            onChange={(e) => {
              setSearchItem(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Ex: runa, claymore..."
            className="max-prata-input"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={buscar}
          disabled={loading || scanning}
        >
          {scanning ? 'Escaneando…' : 'Buscar oportunidades'}
        </button>
        {scanning && (
          <button
            type="button"
            className="btn"
            onClick={cancelar}
            style={{ marginLeft: '0.5rem', backgroundColor: '#c0392b' }}
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="market-progress" style={{ marginBottom: '0.75rem' }}>
        {scanning ? (
          <span>
            Escaneando... ({itemsProcessados}
            {totalItens > 0 ? `/${totalItens}` : ''} itens processados, {rows.length} oportunidades
            encontradas)
            {totalItens > 0 && (
              <span style={{ marginLeft: '0.5rem', color: '#4caf50' }}>
                [{Math.round((itemsProcessados / totalItens) * 100)}%]
              </span>
            )}
          </span>
        ) : (
          <span>
            Último escaneamento:{' '}
            {rows.length > 0 ? `Concluído (${rows.length} oportunidades)` : 'Aguardando'}
            {loadingVolume && (
              <span style={{ marginLeft: '0.5rem', color: '#ff9800' }}>
                {' '}
                — carregando volumes...
              </span>
            )}
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#1a3a52',
            borderRadius: '4px',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            color: '#aaa',
          }}
        >
          <strong style={{ color: '#fff' }}>Dica:</strong> Exibindo{' '}
          {
            rows.filter((op) => {
              const margem = op.compra > 0 ? (op.venda / op.compra - 1) * 100 : 0;
              const maxPrataNum = maxPrata ? parseInt(maxPrata, 10) : null;
              const sl = searchItem.trim().toLowerCase();
              if (sl && !(op.nomeBase || op.id || '').toLowerCase().includes(sl)) return false;
              return margem <= 300 && (maxPrataNum === null || op.compra <= maxPrataNum);
            }).length
          }{' '}
          oportunidades{' '}
          {maxPrata ? `com prata \u2264 ${parseInt(maxPrata).toLocaleString('pt-PT')}` : ''}{' '}
          {searchItem.trim() ? `filtrado por "${searchItem.trim()}"` : ''} ✔
        </div>
      )}

      {err && <p className="error">{err}</p>}

      {/* Calcular paginação */}
      {(() => {
        const searchLower = searchItem.trim().toLowerCase();
        const validRows = rows.filter((op) => {
          const margem = op.compra > 0 ? (op.venda / op.compra - 1) * 100 : 0;
          const maxPrataNum = maxPrata ? parseInt(maxPrata, 10) : null;
          const prataValida = maxPrataNum === null || op.compra <= maxPrataNum;
          if (searchLower) {
            const name = (op.nomeBase || op.id || '').toLowerCase();
            if (!name.includes(searchLower)) return false;
          }
          return margem <= 300 && prataValida;
        });

        const handleSort = (col) => {
          if (sortCol === col) {
            setSortAsc(!sortAsc);
          } else {
            setSortCol(col);
            setSortAsc(false);
          }
          setCurrentPage(1);
        };
        const sortIndicator = (col) => (sortCol === col ? (sortAsc ? ' \u2191' : ' \u2193') : '');

        const handleInstantToggle = () => {
          const next = !filterInstant;
          setFilterInstant(next);
          setSortCol(next ? 'instant' : 'lucro');
          setSortAsc(false);
          setCurrentPage(1);
        };

        const filteredRows = filterInstant
          ? validRows.filter((op) => op.vendaInstantanea)
          : validRows;

        const sortedRows = [...filteredRows].sort((a, b) => {
          let va, vb;
          if (sortCol === 'instant') {
            va = (Number(a.buyOrderDestino) || 0) - ((Number(a.compra) || 0) + (Number(a.custoTeleporte) || 0));
            vb = (Number(b.buyOrderDestino) || 0) - ((Number(b.compra) || 0) + (Number(b.custoTeleporte) || 0));
          } else if (sortCol === 'lucro') {
            va = Number(a.lucro) || 0;
            vb = Number(b.lucro) || 0;
          } else if (sortCol === 'volume') {
            va = Number(a.volumeDiario) || 0;
            vb = Number(b.volumeDiario) || 0;
          } else {
            va = a.compra > 0 ? a.venda / a.compra : 0;
            vb = b.compra > 0 ? b.venda / b.compra : 0;
          }
          const diff = sortAsc ? va - vb : vb - va;
          if (diff !== 0) return diff;
          return (Number(b.lucro) || 0) - (Number(a.lucro) || 0);
        });

        const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const pageRows = sortedRows.slice(startIdx, startIdx + itemsPerPage);

        return (
          <>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th style={{ textAlign: 'center' }}>Item</th>
                    <th>Compra Sell Order</th>
                    <th>Venda Sell Order</th>
                    <th>Venda Buy Order</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('lucro')}
                    >
                      Lucro{sortIndicator('lucro')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('margem')}
                    >
                      %{sortIndicator('margem')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('volume')}
                    >
                      Vol/dia{sortIndicator('volume')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Buy order no destino > sell order na origem"
                      onClick={handleInstantToggle}
                    >
                      Instant {filterInstant ? '✅' : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((op, idx) => {
                    const margem =
                      op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={`${op.id}-${op.origem}-${op.destino}`}>
                        <td style={{ textAlign: 'right' }}>{startIdx + idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                              src={`https://render.albiononline.com/v1/item/${op.id}.png?quality=1`}
                              alt={op.nomeBase}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '4px',
                                border: '1px solid #666',
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/32?text=?';
                              }}
                            />
                            <div>
                              <strong>{op.nomeBase}</strong>
                              <div
                                style={{
                                  marginTop: '0.1rem',
                                  fontSize: '0.80rem',
                                  color: '#aaa',
                                  textAlign: 'left',
                                }}
                              >
                                <span style={{ color: tierStyle(op.tier), fontWeight: 700 }}>
                                  [{op.tier}]
                                </span>
                                <span style={{ marginLeft: '0.4rem' }}>
                                  {op.encanto !== '0' ? `.${op.encanto}` : ''} {op.estado}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {op.compra?.toLocaleString('pt-PT')}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {op.origem} · {timeAgo(op.atualizacaoOrig)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{op.venda?.toLocaleString('pt-PT')}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {op.destino} · {timeAgo(op.atualizacaoDest)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {op.buyOrderDestino?.toLocaleString('pt-PT') || '-'}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {op.destino} · {timeAgo(op.atualizacaoBuyOrderDest)}
                          </div>
                        </td>
                        <td className={profitClass(op.lucro)} style={{ fontWeight: 700 }}>
                          {op.lucro?.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>{margem}%</td>
                        <td
                          style={{
                            textAlign: 'right',
                            color:
                              (op.volumeDiario || 0) === 0
                                ? '#666'
                                : (op.volumeDiario || 0) >= 10
                                  ? '#4caf50'
                                  : '#ff9800',
                          }}
                        >
                          {(op.volumeDiario || 0) > 0
                            ? op.volumeDiario.toLocaleString('pt-PT')
                            : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {op.vendaInstantanea
                            ? filterInstant
                              ? (() => {
                                  const lucroInstant =
                                    op.buyOrderDestino - (op.compra + op.custoTeleporte);
                                  return (
                                    <span className={profitClass(lucroInstant)} style={{ fontWeight: 700 }}>
                                      {lucroInstant.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                                    </span>
                                  );
                                })()
                              : '✅'
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  padding: '1rem',
                  borderTop: '1px solid #444',
                }}
              >
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Anterior
                </button>

                <span style={{ margin: '0 1rem' }}>
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                  }}
                >
                  Próximo →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {!loading && rows.length === 0 && !err && (
        <p className="market-empty">Carregue uma pesquisa para ver oportunidades.</p>
      )}
    </div>
  );
}
