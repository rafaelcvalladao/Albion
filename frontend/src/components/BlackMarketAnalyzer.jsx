import { useEffect, useState, useRef } from 'react';
import { blackMarketStream } from '../api.js';
import { profitClass } from '../utils/profit.js';

const ITEMS_PER_PAGE = 20;
const MAX_IDADE_HORAS = 24;

function tierStyle(tier) {
  const colors = { T4: '#9f6d34', T5: '#3a84c8', T6: '#9f3fba', T7: '#d46f2e', T8: '#c41d7f' };
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
  return `${Math.floor(hrs / 24)}d atrás`;
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

export default function BlackMarketAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [itemsProcessados, setItemsProcessados] = useState(0);
  const [totalItens, setTotalItens] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState('lucro');
  const [sortAsc, setSortAsc] = useState(false);
  const [volMinimo, setVolMinimo] = useState(0.75);
  const [volMinimoInput, setVolMinimoInput] = useState('0.75');
  const [filtroCidade, setFiltroCidade] = useState('Todos');
  const [modoCaerleon, setModoCaerleon] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const streamRef = useRef(null);
  const scanIdRef = useRef(0);

  useEffect(() => {
    return () => { streamRef.current?.abort(); };
  }, []);

  const buscar = () => {
    streamRef.current?.abort();
    streamRef.current = null;
    const currentScanId = ++scanIdRef.current;

    setRows([]);
    setScanning(true);
    setLoading(true);
    setErr(null);
    setItemsProcessados(0);
    setTotalItens(0);
    setCurrentPage(1);
    setSortCol('lucro');
    setSortAsc(false);

    const modoAtual = modoCaerleon;

    const dedupSet = new Set();
    const acumulador = [];

    const stream = blackMarketStream(
      { maxIdadeHoras: MAX_IDADE_HORAS, taxaVenda: '3' },
      {
        onChunk: (oportunidades) => {
          if (scanIdRef.current !== currentScanId) return;
          for (const op of oportunidades) {
            if (modoAtual && op.origem !== 'Caerleon') continue;
            const chave = `${op.id}|${op.estado}`;
            if (!dedupSet.has(chave)) {
              dedupSet.add(chave);
              acumulador.push(op);
            }
          }
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

  return (
    <div className="panel">
      <h2>Black Market — Arbitragem para o Mercado Negro</h2>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '1rem',
        background: '#16161f',
        borderRadius: 8,
        marginBottom: '1rem',
        border: '1px solid #2a2a38',
      }}>
        <div style={{ fontSize: '0.82rem', color: '#666' }}>
          Dados ≤ {MAX_IDADE_HORAS}h &nbsp;·&nbsp; Taxa 3%
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#aaa', whiteSpace: 'nowrap' }}>
          Vol. mín./dia
          <input
            type="number"
            min="0"
            step="0.25"
            value={volMinimoInput}
            onChange={(e) => setVolMinimoInput(e.target.value)}
            onBlur={() => {
              const v = parseFloat(volMinimoInput);
              if (!isNaN(v) && v >= 0) {
                setVolMinimo(v);
                setCurrentPage(1);
              } else {
                setVolMinimoInput(String(volMinimo));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
            }}
            style={{
              width: 60,
              padding: '0.2rem 0.4rem',
              background: '#1e1e2e',
              border: '1px solid #3a3a52',
              borderRadius: 4,
              color: '#eee',
              fontSize: '0.82rem',
              textAlign: 'right',
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#aaa', whiteSpace: 'nowrap' }}>
          Cidade
          <select
            value={filtroCidade}
            onChange={(e) => { setFiltroCidade(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '0.2rem 0.4rem',
              background: '#1e1e2e',
              border: '1px solid #3a3a52',
              borderRadius: 4,
              color: '#eee',
              fontSize: '0.82rem',
            }}
          >
            <option value="Todos">Todas</option>
            {[...new Set(rows.map((op) => op.origem))].sort().map((cidade) => (
              <option key={cidade} value={cidade}>{cidade}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.82rem', color: modoCaerleon ? '#c8a02a' : '#888' }}>
          <input
            type="checkbox"
            checked={modoCaerleon}
            onChange={(e) => { setModoCaerleon(e.target.checked); setCurrentPage(1); }}
            style={{ accentColor: '#c8a02a', width: 14, height: 14 }}
          />
          Caerleon (avg)
        </label>
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

      {err && <p className="error">{err}</p>}

      {/* Tabela paginada */}
      {(() => {
        const TAX = 0.97;

        const getPrecoEfetivo = (op) =>
          modoCaerleon && op.precoMedioBM > 0 ? op.precoMedioBM : op.buyOrderBM;

        const getLucroEfetivo = (op) => {
          if (modoCaerleon && op.precoMedioBM > 0) {
            return op.precoMedioBM * TAX - op.compra;
          }
          return Number(op.lucro) || 0;
        };

        const validRows = rows.filter((op) => {
          if ((Number(op.volumeDiario) || 0) < volMinimo) return false;
          if (filtroCidade !== 'Todos' && op.origem !== filtroCidade) return false;
          if (modoCaerleon && (!op.precoMedioBM || op.precoMedioBM <= 0)) return false;
          if (modoCaerleon && getLucroEfetivo(op) <= 0) return false;
          return true;
        });

        const handleSort = (col) => {
          if (sortCol === col) setSortAsc(!sortAsc);
          else { setSortCol(col); setSortAsc(false); }
          setCurrentPage(1);
        };
        const sortIndicator = (col) => (sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '');

        const sortedRows = [...validRows].sort((a, b) => {
          let va, vb;
          if (sortCol === 'lucro') {
            va = getLucroEfetivo(a);
            vb = getLucroEfetivo(b);
          } else if (sortCol === 'margem') {
            va = a.compra > 0 ? getPrecoEfetivo(a) / a.compra : 0;
            vb = b.compra > 0 ? getPrecoEfetivo(b) / b.compra : 0;
          } else if (sortCol === 'volume') {
            va = Number(a.volumeDiario) || 0;
            vb = Number(b.volumeDiario) || 0;
          } else if (sortCol === 'desvio') {
            va = a.desvio ?? 999;
            vb = b.desvio ?? 999;
          } else if (sortCol === 'buyOrderBM') {
            va = getPrecoEfetivo(a);
            vb = getPrecoEfetivo(b);
          } else if (sortCol === 'coeficiente') {
            const calcCoef = (op) => {
              const vol = op.volumeDiario || 0;
              const peso = op.peso || 1;
              return vol > 0 ? (getLucroEfetivo(op) * vol) / peso : -1;
            };
            va = calcCoef(a);
            vb = calcCoef(b);
          } else {
            va = getLucroEfetivo(a);
            vb = getLucroEfetivo(b);
          }
          const diff = sortAsc ? va - vb : vb - va;
          return diff !== 0 ? diff : getLucroEfetivo(b) - getLucroEfetivo(a);
        });

        const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE);
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageRows = sortedRows.slice(startIdx, startIdx + ITEMS_PER_PAGE);

        if (sortedRows.length === 0 && !loading && !scanning) {
          return (
            <p className="market-empty">Carregue uma pesquisa para ver oportunidades.</p>
          );
        }

        return (
          <>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th style={{ textAlign: 'center' }}>Item</th>
                    <th>Compra (cidade)</th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('buyOrderBM')}
                    >
                      {modoCaerleon ? 'Preço Médio BM' : 'Buy Order BM'}{sortIndicator('buyOrderBM')}
                    </th>
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
                      title="Desvio do buy order em relação ao preço médio histórico no BM"
                    >
                      Desvio{sortIndicator('desvio')}
                    </th>
                    <th
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort('coeficiente')}
                      title="(Lucro × Vol/dia) ÷ Peso — maior = melhor para transportar"
                    >
                      Coef.{sortIndicator('coeficiente')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((op, idx) => {
                    const precoEf = getPrecoEfetivo(op);
                    const lucroEf = getLucroEfetivo(op);
                    const margem = op.compra > 0 ? ((precoEf / op.compra - 1) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={`${op.id}-${op.estado}`}>
                        <td style={{ textAlign: 'right' }}>{startIdx + idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                              src={`https://render.albiononline.com/v1/item/${op.id}.png?quality=1`}
                              alt={op.nomeBase}
                              style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid #666' }}
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/32?text=?'; }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong>{op.nomeBase}</strong>
                                <button
                                  type="button"
                                  title="Copiar nome"
                                  onClick={() => {
                                    navigator.clipboard.writeText(op.nomeBase).then(() => {
                                      setCopiedId(`${op.id}|${op.estado}`);
                                      setTimeout(() => setCopiedId(null), 1500);
                                    });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    color: copiedId === `${op.id}|${op.estado}` ? '#4caf50' : '#555',
                                    fontSize: '0.8rem',
                                    lineHeight: 1,
                                    transition: 'color 0.2s',
                                  }}
                                >
                                  {copiedId === `${op.id}|${op.estado}` ? '✓' : '⎘'}
                                </button>
                              </div>
                              <div style={{ marginTop: '0.1rem', fontSize: '0.80rem', color: '#aaa' }}>
                                <span style={{ color: tierStyle(op.tier), fontWeight: 700 }}>[{op.tier}]</span>
                                <span style={{ marginLeft: '0.4rem' }}>
                                  {op.encanto !== '0' ? `.${op.encanto}` : ''} {op.estado}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{op.compra?.toLocaleString('pt-PT')}</div>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ opacity: 0.7 }}>{op.origem}</span>
                            {' · '}
                            <span style={timeAgoStyle(op.atualizacaoOrig)}>{timeAgo(op.atualizacaoOrig)}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: modoCaerleon ? '#7eb8d4' : '#c8a02a' }}>
                            {precoEf?.toLocaleString('pt-PT')}
                          </div>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ opacity: 0.7 }}>Black Market</span>
                            {!modoCaerleon && (
                              <>{' · '}<span style={timeAgoStyle(op.atualizacaoBM)}>{timeAgo(op.atualizacaoBM)}</span></>
                            )}
                          </div>
                        </td>
                        <td className={profitClass(lucroEf)} style={{ fontWeight: 700 }}>
                          {lucroEf.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: 'right' }}>{margem}%</td>
                        <td style={{
                          textAlign: 'right',
                          color: (op.volumeDiario || 0) === 0 ? '#666' : (op.volumeDiario || 0) >= 10 ? '#4caf50' : '#ff9800',
                        }}>
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
                                {op.precoMedioBM > 0 && (
                                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                    {op.precoMedioBM.toLocaleString('pt-PT')}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(() => {
                            const vol = op.volumeDiario || 0;
                            const peso = op.peso || 1;
                            if (vol <= 0) return <span style={{ color: '#666' }}>-</span>;
                            const coef = (getLucroEfetivo(op) * vol) / peso;
                            return (
                              <>
                                <div style={{ fontWeight: 700, color: '#7eb8d4' }}>
                                  {coef.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                  {peso} kg
                                </div>
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                padding: '1rem',
                borderTop: '1px solid #444',
              }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.5rem 0.75rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  ← Anterior
                </button>
                <span style={{ margin: '0 1rem' }}>Página {currentPage} de {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.5rem 0.75rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Próximo →
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
