import { useEffect, useMemo, useState } from 'react';
import { hubStrategy } from '../api.js';
import { profitClass } from '../utils/profit.js';

const ITEM_ICON_URL = (id) => `https://render.albiononline.com/v1/item/${id}.png?quality=1`;

const RESOURCE_INFO = {
  wood:    { label: 'Madeira', suffix: '_PLANKS',     color: '#C8961C', bg: 'rgba(200,150,28,0.15)' },
  fiber:   { label: 'Fibra',   suffix: '_CLOTH',      color: '#4CAF50', bg: 'rgba(76,175,80,0.15)'  },
  leather: { label: 'Couro',   suffix: '_LEATHER',    color: '#E65100', bg: 'rgba(230,81,0,0.15)'   },
  metal:   { label: 'Minério', suffix: '_METALBAR',   color: '#78909C', bg: 'rgba(96,125,139,0.15)' },
  stone:   { label: 'Pedra',   suffix: '_STONEBLOCK', color: '#A1887F', bg: 'rgba(121,85,72,0.15)'  },
};

function buildId(resource, item) {
  const [tier, level = '0'] = String(item).split('.');
  const { suffix } = RESOURCE_INFO[resource];
  return level === '0' ? `${tier}${suffix}` : `${tier}${suffix}_LEVEL${level}`;
}

function ResourceBadge({ resource }) {
  const info = RESOURCE_INFO[resource];
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.45rem',
      borderRadius: '3px',
      fontSize: '0.72rem',
      fontWeight: 700,
      color: info.color,
      backgroundColor: info.bg,
      border: `1px solid ${info.color}55`,
      whiteSpace: 'nowrap',
    }}>
      {info.label}
    </span>
  );
}

function formatPeak(p) {
  if (!p) return '—';
  return `${String(p.start).padStart(2, '0')}h–${String(p.end).padStart(2, '0')}h`;
}

function HubTable({ title, rows, getValue, getPercent, valueLabel, valueFormat, accent }) {
  const [sortCol, setSortCol] = useState('value');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedRows = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => {
      let va, vb;
      if (sortCol === 'value') {
        va = getValue(a) ?? -Infinity;
        vb = getValue(b) ?? -Infinity;
      } else if (sortCol === 'pct') {
        va = getPercent(a) ?? -Infinity;
        vb = getPercent(b) ?? -Infinity;
      } else {
        va = a.volume ?? 0;
        vb = b.volume ?? 0;
      }
      return sortAsc ? va - vb : vb - va;
    });
  }, [rows, sortCol, sortAsc, getValue, getPercent]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc((v) => !v);
    else { setSortCol(col); setSortAsc(false); }
  }

  const ind = (col) => sortCol !== col ? '' : sortAsc ? ' ↑' : ' ↓';

  if (!rows?.length) return null;
  return (
    <div className="strategy-block">
      <div
        className="strategy-section-title"
        style={{ borderLeft: `3px solid ${accent}`, paddingLeft: '0.5rem', color: accent }}
        role="heading"
        aria-level={3}
      >
        {title}
      </div>
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Recurso</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('value')}>
                {valueLabel}{ind('value')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('pct')}>
                %{ind('pct')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('vol')}>
                Vol. 24h{ind('vol')}
              </th>
              <th>Pico (UTC-3)</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, i) => {
              const val = getValue(r);
              const pct = getPercent(r);
              const imgId = buildId(r.resource, r.item);
              return (
                <tr key={`${r.resource}-${r.item}-${i}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <img
                        src={ITEM_ICON_URL(imgId)}
                        alt={r.item}
                        style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="tabular-nums" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {r.item}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ResourceBadge resource={r.resource} />
                  </td>
                  <td
                    className={profitClass(val)}
                    style={{ fontWeight: 700, textAlign: 'center', fontSize: '1rem' }}
                  >
                    {valueFormat(val)}
                  </td>
                  <td
                    className={pct != null ? profitClass(pct) : ''}
                    style={{ fontWeight: 700, textAlign: 'center', fontSize: '0.95rem' }}
                  >
                    {pct != null ? `${pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="tabular-nums strategy-table-vol">
                    {r.volume != null ? r.volume.toLocaleString('pt-PT') : '—'}
                  </td>
                  <td className="tabular-nums" style={{ textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {formatPeak(r.peakHoursLocal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RefinementHub() {
  const [buyOrder, setBuyOrder] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function fetchData(opts) {
    setLoading(true);
    setError(null);
    try {
      const result = await hubStrategy(opts);
      setData(result);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData({ buyOrder: false, dailyBonus: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    fetchData({ buyOrder, dailyBonus });
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="panel" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <h2 style={{ margin: '0 0 0.25rem' }}>Hub de Refino</h2>
        <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#888' }}>
          Top 15 materiais para refinar entre todos os recursos — sem especialização, cidade com bônus de produção.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={buyOrder}
              onChange={(e) => setBuyOrder(e.target.checked)}
            />
            Comprar via buy order
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={dailyBonus === 10}
              onChange={() => setDailyBonus(dailyBonus === 10 ? 0 : 10)}
            />
            Bônus diário 10%
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={dailyBonus === 20}
              onChange={() => setDailyBonus(dailyBonus === 20 ? 0 : 20)}
            />
            Bônus diário 20%
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'A carregar…' : 'Refresh'}
          </button>
        </div>
        {error && (
          <p className="error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{error}</p>
        )}
      </div>

      {loading && (
        <p className="mono strategy-hint" style={{ textAlign: 'center', padding: '2rem' }}>
          Buscando dados de todos os recursos…
        </p>
      )}

      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1rem' }}>
          <HubTable
            title="Sem Foco — Top Lucro Local"
            rows={data.topSemFoco}
            getValue={(r) => r.lucro}
            getPercent={(r) => (r.custoLocal > 0 && r.lucro > -8e8) ? (r.lucro / r.custoLocal) * 100 : null}
            valueLabel="Lucro"
            valueFormat={(v) => v > -8e8 ? Math.round(v).toLocaleString('pt-PT') : '—'}
            accent="#4CAF50"
          />
          <HubTable
            title="Com Foco — Top Lucro / Foco"
            rows={data.topComFoco}
            getValue={(r) => r.focoUnidades > 0 ? r.lucroComFoco / r.focoUnidades : -9e8}
            getPercent={(r) => (r.custoComFoco > 0 && r.lucroComFoco > -8e8) ? (r.lucroComFoco / r.custoComFoco) * 100 : null}
            valueLabel="Lucro/Foco"
            valueFormat={(v) => v > -8e8 ? v.toFixed(2) : '—'}
            accent="#2196F3"
          />
        </div>
      )}

      {!data && !loading && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem', fontSize: '0.95rem' }}>
          Carregando…
        </p>
      )}
    </div>
  );
}
