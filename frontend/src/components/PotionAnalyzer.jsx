import { useState } from 'react';
import { potionAnalyze } from '../api.js';
import { profitClass } from '../utils/profit.js';

const TIER_COLORS = {
  T2: '#607d8b', T3: '#78909c', T4: '#9f6d34',
  T5: '#3a84c8', T6: '#9f3fba', T7: '#d46f2e', T8: '#c41d7f',
};

const CITY_SHORT = {
  Bridgewatch: 'BW', 'Fort Sterling': 'FS', Lymhurst: 'LH',
  Martlock: 'MT', Thetford: 'TF', Brecilien: 'BR ⭐', Caerleon: 'CL',
};

function fmt(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR');
}

function timeAgo(dateStr) {
  if (!dateStr) return { label: '—', color: '#555' };
  const d = new Date(dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return { label: '?', color: '#555' };
  const hrs = (Date.now() - d.getTime()) / 3_600_000;
  if (hrs < 1) return { label: `${Math.round(hrs * 60)}min`, color: '#4caf50' };
  if (hrs < 2) return { label: `${Math.round(hrs)}h`, color: '#4caf50' };
  if (hrs < 6) return { label: `${Math.round(hrs)}h`, color: '#ff9800' };
  if (hrs < 24) return { label: `${Math.round(hrs)}h`, color: '#f44336' };
  return { label: `${Math.floor(hrs / 24)}d`, color: '#f44336' };
}

function volColor(v) {
  if (!v || v === 0) return '#555';
  if (v >= 20) return '#4caf50';
  if (v >= 5) return '#ff9800';
  return '#f44336';
}

function SortHeader({ label, col, sortCol, sortAsc, onSort }) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label}{' '}
      <span style={{ color: active ? 'var(--accent)' : '#555', fontSize: '0.7em' }}>
        {active ? (sortAsc ? '▲' : '▼') : '⇅'}
      </span>
    </th>
  );
}

function applySort(rows, col, asc) {
  return [...rows].sort((a, b) => {
    const av = a[col] ?? -Infinity;
    const bv = b[col] ?? -Infinity;
    const diff = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return asc ? diff : -diff;
  });
}

export default function PotionAnalyzer() {
  const [foco, setFoco] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);
  const [taxaVenda, setTaxaVenda] = useState(6.5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState('samecidade');
  const [sortCol, setSortCol] = useState('profit');
  const [sortAsc, setSortAsc] = useState(false);
  const [soLucrativo, setSoLucrativo] = useState(true);
  const [filtroCidade, setFiltroCidade] = useState('Todas');
  const [filtroPotion, setFiltroPotion] = useState('Todas');

  const handleAnalyze = async () => {
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const result = await potionAnalyze({ foco, dailyBonus, taxaVenda });
      setData(result);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(v => !v);
    else { setSortCol(col); setSortAsc(false); }
  };

  const cities = data
    ? [...new Set(data.sameCidade.map(r => r.city))].sort()
    : [];

  const potionNames = data
    ? [...new Set(data.sameCidade.map(r => r.potionName))].sort()
    : [];

  // ─── Filtros para Mesma Cidade ───
  const filteredSame = data
    ? applySort(
        data.sameCidade.filter(r => {
          if (soLucrativo && r.profit <= 0) return false;
          if (filtroCidade !== 'Todas' && r.city !== filtroCidade) return false;
          if (filtroPotion !== 'Todas' && r.potionName !== filtroPotion) return false;
          return true;
        }),
        sortCol, sortAsc,
      )
    : [];

  // ─── Filtros para Brecilien ───
  const filteredBrec = data
    ? applySort(
        data.brecilien.filter(r => {
          if (soLucrativo && r.profit <= 0) return false;
          if (filtroPotion !== 'Todas' && r.potionName !== filtroPotion) return false;
          return true;
        }),
        sortCol, sortAsc,
      )
    : [];

  const lucSame = data ? data.sameCidade.filter(r => r.profit > 0).length : 0;
  const lucBrec = data ? data.brecilien.filter(r => r.profit > 0).length : 0;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ─── Painel de configuração ─── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, marginRight: '0.25rem' }}>
          Poções
        </span>

        {/* Foco */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Foco</span>
          <input
            type="checkbox"
            checked={foco}
            onChange={e => setFoco(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
          />
        </label>

        {/* Daily Bonus */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Bônus Diário</span>
          <select
            value={dailyBonus}
            onChange={e => setDailyBonus(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.85rem',
            }}
          >
            <option value={0}>0%</option>
            <option value={10}>10%</option>
            <option value={20}>20%</option>
          </select>
        </label>

        {/* Taxa de Venda */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Taxa Venda</span>
          <input
            type="number"
            min="0"
            max="15"
            step="0.5"
            value={taxaVenda}
            onChange={e => setTaxaVenda(Number(e.target.value))}
            style={{
              width: '60px', background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: '6px', padding: '0.2rem 0.4rem', fontSize: '0.85rem',
              textAlign: 'right',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>%</span>
        </label>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            background: loading ? 'rgba(56,189,248,0.3)' : 'var(--accent)',
            color: '#000', border: 'none', borderRadius: '7px',
            padding: '0.45rem 1.1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {loading ? 'Buscando...' : 'Analisar'}
        </button>
      </div>

      {/* ─── Erro ─── */}
      {err && (
        <div style={{
          background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
          borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#f44336',
        }}>
          {err}
        </div>
      )}

      {/* ─── Resultados ─── */}
      {data && (
        <>
          {/* Tabs de view */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setView('samecidade')}
              style={{
                background: view === 'samecidade' ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                color: view === 'samecidade' ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '7px',
                padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              Mesma Cidade
              {lucSame > 0 && (
                <span style={{
                  marginLeft: '0.5rem', background: 'rgba(76,175,80,0.3)',
                  color: '#4caf50', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.75em',
                }}>
                  {lucSame}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('brecilien')}
              style={{
                background: view === 'brecilien' ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                color: view === 'brecilien' ? '#000' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '7px',
                padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              }}
            >
              Via Brecilien ⭐
              {lucBrec > 0 && (
                <span style={{
                  marginLeft: '0.5rem', background: 'rgba(76,175,80,0.3)',
                  color: '#4caf50', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.75em',
                }}>
                  {lucBrec}
                </span>
              )}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Filtro poção */}
              <select
                value={filtroPotion}
                onChange={e => setFiltroPotion(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                  color: 'var(--text)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.82rem',
                }}
              >
                <option value="Todas">Todas as poções</option>
                {potionNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              {/* Filtro cidade (só na view samecidade) */}
              {view === 'samecidade' && (
                <select
                  value={filtroCidade}
                  onChange={e => setFiltroCidade(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
                    color: 'var(--text)', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.82rem',
                  }}
                >
                  <option value="Todas">Todas as cidades</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {/* Toggle só lucrativo */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={soLucrativo}
                  onChange={e => setSoLucrativo(e.target.checked)}
                  style={{ accentColor: '#4caf50', width: '14px', height: '14px' }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Só lucrativo</span>
              </label>
            </div>
          </div>

          {/* ─── Tabela Mesma Cidade ─── */}
          {view === 'samecidade' && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                {filteredSame.length} resultado(s) — compra ingredientes e vende poções na mesma cidade.
                RRR no Brecilien usa o bônus de 15% de produção.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
                  background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden',
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      <SortHeader label="Poção" col="potionName" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Tier" col="tier" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Cidade" col="city" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Custo Ingred." col="ingTotal" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Receita" col="revenue" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Lucro/Batch" col="profit" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Lucro/Unid." col="profitPerUnit" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Margem" col="margin" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Vol./dia" col="volumeDiario" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Atualizado" col="dataPreco" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSame.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Nenhum resultado encontrado.
                        </td>
                      </tr>
                    )}
                    {filteredSame.map((r, i) => (
                      <tr
                        key={`${r.output}-${r.city}-${i}`}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.potionName}</td>
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            background: TIER_COLORS[r.tier] || '#555',
                            color: '#fff', borderRadius: '4px', padding: '0.1rem 0.45rem',
                            fontSize: '0.78rem', fontWeight: 700,
                          }}>
                            {r.tier}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            color: r.city === 'Brecilien' ? '#ffd700' : 'var(--text)',
                            fontWeight: r.city === 'Brecilien' ? 700 : 400,
                          }}>
                            {CITY_SHORT[r.city] || r.city}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {fmt(r.ingTotal)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {fmt(r.revenue)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700 }}
                          className={profitClass(r.profit)}>
                          {r.profit >= 0 ? '+' : ''}{fmt(r.profit)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}
                          className={profitClass(r.profitPerUnit)}>
                          {r.profitPerUnit >= 0 ? '+' : ''}{fmt(r.profitPerUnit)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}
                          className={profitClass(r.margin)}>
                          {r.margin >= 0 ? '+' : ''}{r.margin}%
                        </td>
                        {(() => { const ta = timeAgo(r.dataPreco); return (
                          <>
                            <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontWeight: 600 }}
                              title={r.dataPreco || 'Sem data'}>
                              <span style={{ color: volColor(r.volumeDiario) }}>
                                {r.volumeDiario ?? 0}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}
                              title={r.dataPreco || 'Sem data'}>
                              <span style={{ color: ta.color }}>{ta.label}</span>
                            </td>
                          </>
                        ); })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ─── Tabela Via Brecilien ─── */}
          {view === 'brecilien' && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                {filteredBrec.length} resultado(s) — compra ingredientes nas cidades mais baratas,
                crafta em Brecilien (+15% bônus de produção) e vende na cidade com melhor preço líquido.
                O custo de teleporte dos ingredientes até Brecilien e das poções até a cidade de venda já está descontado.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
                  background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden',
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      <SortHeader label="Poção" col="potionName" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Tier" col="tier" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Vender em" col="sellCity" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Custo Ingred." col="ingTotal" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Teleporte" col="totalTeleport" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Receita" col="revenue" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Lucro/Batch" col="profit" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Lucro/Unid." col="profitPerUnit" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Margem" col="margin" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Vol./dia" col="volumeDiario" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <SortHeader label="Atualizado" col="dataPreco" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                      <th style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Ingredientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrec.length === 0 && (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          Nenhum resultado encontrado.
                        </td>
                      </tr>
                    )}
                    {filteredBrec.map((r, i) => (
                      <tr
                        key={`${r.output}-brec-${i}`}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        }}
                      >
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{r.potionName}</td>
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            background: TIER_COLORS[r.tier] || '#555',
                            color: '#fff', borderRadius: '4px', padding: '0.1rem 0.45rem',
                            fontSize: '0.78rem', fontWeight: 700,
                          }}>
                            {r.tier}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: '#ffd700', fontWeight: 700 }}>
                          {CITY_SHORT[r.sellCity] || r.sellCity}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {fmt(r.ingTotal)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontSize: '0.8rem' }}
                          title={`Ingredientes→BR: ${fmt(r.teleportIng)} | Poções→destino: ${fmt(r.teleportPocao)}`}>
                          <span style={{ color: r.totalTeleport > 0 ? '#ff9800' : 'var(--text-secondary)' }}>
                            -{fmt(r.totalTeleport)}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {fmt(r.revenue)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700 }}
                          className={profitClass(r.profit)}>
                          {r.profit >= 0 ? '+' : ''}{fmt(r.profit)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}
                          className={profitClass(r.profitPerUnit)}>
                          {r.profitPerUnit >= 0 ? '+' : ''}{fmt(r.profitPerUnit)}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}
                          className={profitClass(r.margin)}>
                          {r.margin >= 0 ? '+' : ''}{r.margin}%
                        </td>
                        {(() => { const ta = timeAgo(r.dataPreco); return (
                          <>
                            <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontWeight: 600 }}
                              title={`Volume na cidade de venda (${r.sellCity})\n${r.dataPreco || 'Sem data'}`}>
                              <span style={{ color: volColor(r.volumeDiario) }}>
                                {r.volumeDiario ?? 0}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}
                              title={`Preço mais antigo entre ingredientes e poção:\n${r.dataPreco || 'Sem data'}`}>
                              <span style={{ color: ta.color }}>{ta.label}</span>
                            </td>
                          </>
                        ); })()}
                        <td style={{ padding: '0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {r.ingredientes.map(ing => (
                            <div key={ing.id} style={{ whiteSpace: 'nowrap' }}>
                              {ing.id.replace(/^T\d_/, '')} ×{ing.qty}{' '}
                              <span style={{ color: '#64b5f6' }}>@ {CITY_SHORT[ing.city] || ing.city}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
