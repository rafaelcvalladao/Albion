import { useEffect, useState, useRef } from 'react';
import { marketOpportunitiesStream } from '../api.js';
import { profitClass } from '../utils/profit.js';

const ITEMS_PER_PAGE = 20;

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

function timeAgoStyle(label) {
  if (!label) return { color: '#666' };
  const parts = String(label).split(' ');
  if (parts.length < 2) return { color: '#666' };
  const [datePart, timePart] = parts;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d) return { color: '#666' };
  const hrs = (Date.now() - new Date(Date.UTC(y, m - 1, d, hh, mm)).getTime()) / 3600000;
  if (hrs > 6) return { color: '#f44336' };
  if (hrs > 2) return { color: '#ff9800' };
  return { color: '#4caf50' };
}

function desvioInfo(desvio) {
  if (desvio === null || desvio === undefined) return { label: 'sem hist.', color: '#666' };
  const pct = (desvio >= 0 ? '+' : '') + desvio.toFixed(1) + '%';
  if (desvio > 60) return { label: pct, color: '#f44336' };
  if (desvio > 20) return { label: pct, color: '#ff9800' };
  return { label: pct, color: '#4caf50' };
}

export default function MarketAnalyzer() {
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
  const [maxIdadeHoras, setMaxIdadeHoras] = useState('48');
  const [volMinimo, setVolMinimo] = useState('5');
  const [maxDesvio, setMaxDesvio] = useState('50');
  const [modoCaerleon, setModoCaerleon] = useState(false);
  const streamRef = useRef(null);
  const scanIdRef = useRef(0);

  useEffect(() => {
    return () => { streamRef.current?.abort(); };
  }, []);

  const buscar = () => {
    // Invalidar scan anterior
    streamRef.current?.abort();
    streamRef.current = null;
    const currentScanId = ++scanIdRef.current;

    // Limpar tabela imediatamente
    setRows([]);
    setScanning(true);
    setLoading(true);
    setErr(null);
    setItemsProcessados(0);
    setTotalItens(0);
    setCurrentPage(1);
    setSortCol('lucro');
    setSortAsc(false);
    setFilterInstant(false);
    setModoCaerleon(false);

    // Acumulador de oportunidades (dedup incremental)
    const dedupSet = new Set();
    const acumulador = [];

    const stream = marketOpportunitiesStream(
      {
        categoria: 'Todos',
        maxIdadeHoras,
        taxaVenda: '3',
      },
      {
        onChunk: (oportunidades) => {
          // Ignorar chunks de scans anteriores
          if (scanIdRef.current !== currentScanId) return;

          for (const op of oportunidades) {
            const chave = `${op.id}|${op.origem}|${op.destino}`;
            if (!dedupSet.has(chave)) {
              dedupSet.add(chave);
              acumulador.push(op);
            }
          }
          // Atualizar a UI sem re-ordenar a cada chunk (ordenação fica no render)
          setRows([...acumulador]);
        },
        onProgress: ({ processados, totalItens: total }) => {
          setItemsProcessados(processados);
          setTotalItens(total);
        },
        onDone: () => {
          if (scanIdRef.current !== currentScanId) return;
          setScanning(false);
          setLoading(false);
        },
        onError: (msg) => {
          if (scanIdRef.current !== currentScanId) return;
          setErr(msg);
          setScanning(false);
          setLoading(false);
        },
      },
    );

    streamRef.current = stream;
  };

  const cancelar = () => {
    scanIdRef.current++;
    streamRef.current?.abort();
    streamRef.current = null;
    setScanning(false);
    setLoading(false);
  };

  const inputStyle = {
    background: '#1e1e2a',
    border: '1px solid #3a3a4a',
    borderRadius: 6,
    color: '#fff',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  };

  const labelTextStyle = {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  };

  return (
    <div className="panel">
      <h2>Arbitragem entre cidades seguras</h2>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'flex-end',
        padding: '1rem',
        background: '#16161f',
        borderRadius: 8,
        marginBottom: '1rem',
        border: '1px solid #2a2a38',
      }}>

        {/* Pesquisar item — mais largo */}
        <label style={{ ...labelStyle, flexGrow: 1, minWidth: 160 }}>
          <span style={labelTextStyle}>Pesquisar item</span>
          <input
            type="text"
            value={searchItem}
            onChange={(e) => { setSearchItem(e.target.value); setCurrentPage(1); }}
            placeholder="runa, claymore..."
            style={inputStyle}
          />
        </label>

        <label style={{ ...labelStyle, width: 130 }}>
          <span style={labelTextStyle}>Máx. prata</span>
          <input
            type="number"
            value={maxPrata}
            onChange={(e) => setMaxPrata(e.target.value)}
            placeholder="100000000"
            style={inputStyle}
          />
        </label>

        <label style={{ ...labelStyle, width: 100 }}>
          <span style={labelTextStyle}>Dados</span>
          <select
            value={maxIdadeHoras}
            onChange={(e) => setMaxIdadeHoras(e.target.value)}
            style={inputStyle}
          >
            <option value="2">≤ 2h</option>
            <option value="6">≤ 6h</option>
            <option value="24">≤ 24h</option>
            <option value="48">≤ 48h</option>
            <option value="168">≤ 7 dias</option>
          </select>
        </label>

        <label style={{ ...labelStyle, width: 90 }}>
          <span style={labelTextStyle}>Vol. mín./dia</span>
          <input
            type="number"
            value={volMinimo}
            min="0"
            onChange={(e) => { setVolMinimo(e.target.value); setCurrentPage(1); }}
            style={inputStyle}
          />
        </label>

        <label style={{ ...labelStyle, width: 100 }}>
          <span style={labelTextStyle}>Desvio máx. %</span>
          <input
            type="number"
            value={maxDesvio}
            min="0"
            onChange={(e) => { setMaxDesvio(e.target.value); setCurrentPage(1); }}
            style={inputStyle}
          />
        </label>

        {/* Modo Caerleon */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem', color: modoCaerleon ? '#c8a02a' : '#888', alignSelf: 'flex-end', paddingBottom: '0.55rem' }}>
          <input
            type="checkbox"
            checked={modoCaerleon}
            onChange={(e) => { setModoCaerleon(e.target.checked); setCurrentPage(1); }}
            style={{ accentColor: '#c8a02a', width: 15, height: 15 }}
          />
          Caerleon → cidades (avg)
        </label>

        {/* Ações */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={buscar}
            disabled={loading || scanning}
            style={{ whiteSpace: 'nowrap' }}
          >
            {scanning ? 'Escaneando…' : 'Buscar'}
          </button>

          {scanning && (
            <button type="button" className="btn" onClick={cancelar} style={{ background: '#c0392b', whiteSpace: 'nowrap' }}>
              Cancelar
            </button>
          )}

          {!scanning && (searchItem || maxPrata || filterInstant || modoCaerleon || sortCol !== 'lucro' || volMinimo !== '5' || maxDesvio !== '50') && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setSearchItem('');
                setMaxPrata('');
                setFilterInstant(false);
                setModoCaerleon(false);
                setVolMinimo('5');
                setMaxDesvio('50');
                setSortCol('lucro');
                setSortAsc(false);
                setCurrentPage(1);
              }}
              style={{ background: '#2a2a38', whiteSpace: 'nowrap' }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {(scanning || rows.length > 0) && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
          {scanning ? (
            <>
              <span style={{ color: '#ccc' }}>Escaneando</span>
              {totalItens > 0 && (
                <>
                  {' '}— {itemsProcessados}/{totalItens} itens
                  <span style={{ marginLeft: '0.5rem', color: '#4caf50', fontWeight: 600 }}>
                    {Math.round((itemsProcessados / totalItens) * 100)}%
                  </span>
                </>
              )}
              {rows.length > 0 && (
                <span style={{ marginLeft: '0.75rem', color: '#aaa' }}>
                  · {rows.length} oportunidades
                </span>
              )}
            </>
          ) : (
            <span>{rows.length} oportunidades encontradas</span>
          )}
        </div>
      )}

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
          {validRows.length}{' '}
          oportunidades{' '}
          {maxPrata ? `com prata \u2264 ${parseInt(maxPrata).toLocaleString('pt-PT')}` : ''}{' '}
          {searchItem.trim() ? `filtrado por "${searchItem.trim()}"` : ''} ✔
        </div>
      )}

      {err && <p className="error">{err}</p>}

      {/* Calcular paginação */}
      {(() => {
        const TAX = 0.97;

        const getVendaEfetiva = (op) =>
          modoCaerleon && op.precoMedioDest > 0 ? op.precoMedioDest : op.venda;

        const getLucroEfetivo = (op) => {
          if (modoCaerleon && op.precoMedioDest > 0) {
            return op.precoMedioDest * TAX - (op.compra + (op.custoTeleporte || 0));
          }
          return Number(op.lucro) || 0;
        };

        const searchLower = searchItem.trim().toLowerCase();
        const validRows = rows.filter((op) => {
          if (modoCaerleon) {
            if (op.origem !== 'Caerleon') return false;
            if (!op.precoMedioDest || op.precoMedioDest <= 0) return false;
            if (getLucroEfetivo(op) <= 0) return false;
          }
          const vendaEf = getVendaEfetiva(op);
          const margem = op.compra > 0 ? (vendaEf / op.compra - 1) * 100 : 0;
          const maxPrataNum = maxPrata ? parseInt(maxPrata, 10) : null;
          const prataValida = maxPrataNum === null || op.compra <= maxPrataNum;
          if (searchLower) {
            const name = (op.nomeBase || op.id || '').toLowerCase();
            if (!name.includes(searchLower)) return false;
          }
          if ((Number(op.volumeDiario) || 0) < (Number(volMinimo) || 0)) return false;
          const maxDesvioNum = maxDesvio !== '' ? parseFloat(maxDesvio) : null;
          if (maxDesvioNum !== null && op.precoMedioDest > 0 && (op.desvio ?? 0) > maxDesvioNum) return false;
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
            va = getLucroEfetivo(a);
            vb = getLucroEfetivo(b);
          } else if (sortCol === 'volume') {
            va = Number(a.volumeDiario) || 0;
            vb = Number(b.volumeDiario) || 0;
          } else if (sortCol === 'desvio') {
            va = a.desvio ?? 999;
            vb = b.desvio ?? 999;
          } else {
            const vaVenda = getVendaEfetiva(a);
            const vbVenda = getVendaEfetiva(b);
            va = a.compra > 0 ? vaVenda / a.compra : 0;
            vb = b.compra > 0 ? vbVenda / b.compra : 0;
          }
          const diff = sortAsc ? va - vb : vb - va;
          if (diff !== 0) return diff;
          return getLucroEfetivo(b) - getLucroEfetivo(a);
        });

        const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageRows = sortedRows.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        return (
          <>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th style={{ textAlign: 'center' }}>Item</th>
                    <th>Compra Sell Order</th>
                    <th style={{ textAlign: 'right' }}>Teleporte</th>
                    <th>{modoCaerleon ? 'Preço Médio Hist.' : 'Venda Sell Order'}</th>
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
                      onClick={() => handleSort('desvio')}
                      title="Desvio do preço de venda em relação ao preço médio histórico no destino"
                    >
                      Desvio{sortIndicator('desvio')}
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
                    const vendaEf = getVendaEfetiva(op);
                    const margem =
                      op.compra > 0 ? ((vendaEf / op.compra - 1) * 100).toFixed(1) : '0.0';
                    const lucroEf = getLucroEfetivo(op);
                    return (
                      <tr key={`${op.id}-${op.estado}-${op.origem}-${op.destino}`}>
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
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ opacity: 0.7 }}>{op.origem}</span>
                            {' · '}
                            <span style={timeAgoStyle(op.atualizacaoOrig)}>{timeAgo(op.atualizacaoOrig)}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', color: op.custoTeleporte > 0 ? '#ff9800' : '#555', fontWeight: 600 }}>
                          {op.custoTeleporte > 0 ? op.custoTeleporte.toLocaleString('pt-PT') : '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: modoCaerleon ? '#7eb8d4' : undefined }}>
                            {vendaEf?.toLocaleString('pt-PT')}
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ opacity: 0.7 }}>{op.destino}</span>
                            {!modoCaerleon && (
                              <>{' · '}<span style={timeAgoStyle(op.atualizacaoDest)}>{timeAgo(op.atualizacaoDest)}</span></>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {op.buyOrderDestino?.toLocaleString('pt-PT') || '-'}
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ opacity: 0.7 }}>{op.destino}</span>
                            {' · '}
                            <span style={timeAgoStyle(op.atualizacaoBuyOrderDest)}>{timeAgo(op.atualizacaoBuyOrderDest)}</span>
                          </div>
                        </td>
                        <td className={profitClass(lucroEf)} style={{ fontWeight: 700 }}>
                          {lucroEf.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
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
                            ? Number(op.volumeDiario) % 1 === 0
                              ? op.volumeDiario.toLocaleString('pt-PT')
                              : Number(op.volumeDiario).toLocaleString('pt-PT', { maximumFractionDigits: 1 })
                            : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {(() => {
                            const { label, color } = desvioInfo(op.desvio);
                            return (
                              <>
                                <div style={{ fontWeight: 700, color }}>{label}</div>
                                {op.precoMedioDest > 0 && (
                                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                    {op.precoMedioDest.toLocaleString('pt-PT')}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {op.vendaInstantanea
                            ? filterInstant
                              ? (() => {
                                  const lucroInstant =
                                    op.buyOrderDestino - (op.compra + (op.custoTeleporte || 0));
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
