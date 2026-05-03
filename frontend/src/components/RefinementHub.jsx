import { useEffect, useMemo, useRef, useState } from 'react';
import { strategyWood, strategyFiber, strategyLeather, strategyMetal } from '../api.js';
import { profitClass } from '../utils/profit.js';

const ITEM_ICON_URL = (id) => `https://render.albiononline.com/v1/item/${id}.png?quality=1`;

const RESOURCE_INFO = {
  wood:    { label: 'Madeira', suffix: '_PLANKS',   color: '#C8961C', bg: 'rgba(200,150,28,0.15)' },
  fiber:   { label: 'Fibra',   suffix: '_CLOTH',    color: '#4CAF50', bg: 'rgba(76,175,80,0.15)'  },
  leather: { label: 'Couro',   suffix: '_LEATHER',  color: '#E65100', bg: 'rgba(230,81,0,0.15)'   },
  metal:   { label: 'Minério', suffix: '_METALBAR', color: '#78909C', bg: 'rgba(96,125,139,0.15)' },
};

const FOCO_BASE = { T4: 41, T5: 103, T6: 257, T7: 643, T8: 1607 };
const MULT_ENCHANT = [1, 1.5, 2.5, 5, 10];

const STORAGE_KEYS = {
  wood:    'albion-wood-config-v1',
  fiber:   'albion-fiber-config-v1',
  leather: 'albion-leather-config-v1',
  metal:   'albion-metal-config-v1',
};

const STRATEGY_FNS = { wood: strategyWood, fiber: strategyFiber, leather: strategyLeather, metal: strategyMetal };
const DEFAULT_SPEC = { t4: '0', t5: '0', t6: '0', t7: '0', t8: '0' };
const ALL_RESOURCES = ['wood', 'fiber', 'leather', 'metal'];

function loadAllSpecs() {
  const specs = {};
  for (const [resource, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      const cfg = raw ? JSON.parse(raw) : null;
      specs[resource] = cfg?.spec ?? DEFAULT_SPEC;
    } catch {
      specs[resource] = DEFAULT_SPEC;
    }
  }
  return specs;
}

function mergeTopLists(resourceData) {
  const all = [];
  for (const [resource, result] of Object.entries(resourceData)) {
    if (!result?.fsLocalFocoAll) continue;
    for (const item of result.fsLocalFocoAll) {
      all.push({ ...item, resource, resourceLabel: RESOURCE_INFO[resource].label });
    }
  }

  const topSemFoco = [...all]
    .filter(i => i.lucro > -8e8)
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 15);

  const maxReducaoGeral = 5 * 100 * 30;
  const maxReducaoTier = 100 * 250;
  const allMaxSpec = all.map(i => {
    const [tier, levelStr = '0'] = i.item.split('.');
    const idxN = parseInt(levelStr, 10);
    const focoUnidades = (FOCO_BASE[tier] ?? 250) * (MULT_ENCHANT[idxN] ?? 1) * 0.5 ** ((maxReducaoGeral + maxReducaoTier) / 10000);
    return { ...i, focoUnidades };
  });

  const topComFoco = [...allMaxSpec]
    .filter(i => i.lucroComFoco > -8e8 && i.focoUnidades > 0)
    .sort((a, b) => (b.lucroComFoco / b.focoUnidades) - (a.lucroComFoco / a.focoUnidades))
    .slice(0, 15);

  return { topSemFoco, topComFoco };
}

function buildId(resource, item) {
  const [tier, level = '0'] = String(item).split('.');
  const { suffix } = RESOURCE_INFO[resource];
  return level === '0' ? `${tier}${suffix}` : `${tier}${suffix}_LEVEL${level}@${level}`;
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
                  <td style={{ textAlign: 'center' }}>
                    <img
                      src={ITEM_ICON_URL(imgId)}
                      alt={r.item}
                      style={{ width: 64, height: 64, objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
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
  const [resourceData, setResourceData] = useState({});
  const [loadingSet, setLoadingSet] = useState(new Set());
  const [errors, setErrors] = useState({});
  const fetchIdRef = useRef(0);

  const data = useMemo(() => mergeTopLists(resourceData), [resourceData]);
  const isLoading = loadingSet.size > 0;
  const loadedCount = ALL_RESOURCES.filter(r => resourceData[r]).length;

  function fetchData({ buyOrder: bo, dailyBonus: db }) {
    const fetchId = ++fetchIdRef.current;
    const specs = loadAllSpecs();

    setResourceData({});
    setLoadingSet(new Set(ALL_RESOURCES));
    setErrors({});

    for (const resource of ALL_RESOURCES) {
      STRATEGY_FNS[resource]({
        taxaNpc: '800',
        taxaVenda: '6.5',
        spec: specs[resource] ?? {},
        buyOrder: bo,
        dailyBonus: db,
        foco: false,
      })
        .then(result => {
          if (fetchIdRef.current !== fetchId) return;
          setResourceData(prev => ({ ...prev, [resource]: result }));
          setLoadingSet(prev => { const s = new Set(prev); s.delete(resource); return s; });
        })
        .catch(err => {
          if (fetchIdRef.current !== fetchId) return;
          setErrors(prev => ({ ...prev, [resource]: err.message || String(err) }));
          setLoadingSet(prev => { const s = new Set(prev); s.delete(resource); return s; });
        });
    }
  }

  useEffect(() => {
    fetchData({ buyOrder: false, dailyBonus: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    fetchData({ buyOrder, dailyBonus });
  }

  const errorList = Object.entries(errors);

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="panel" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <h2 style={{ margin: '0 0 0.25rem' }}>Hub de Refino</h2>
        <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: '#888' }}>
          Top 15 materiais para refinar entre todos os recursos — usa as especializações salvas em cada aba de refino.
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
            disabled={isLoading}
          >
            {isLoading ? `Carregando ${loadedCount}/4…` : 'Refresh'}
          </button>
        </div>
        {errorList.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            {errorList.map(([resource, msg]) => (
              <p key={resource} className="error" style={{ margin: '0.25rem 0' }}>
                {RESOURCE_INFO[resource].label}: {msg}
              </p>
            ))}
          </div>
        )}
      </div>

      {loadedCount === 0 && isLoading && (
        <p className="mono strategy-hint" style={{ textAlign: 'center', padding: '2rem' }}>
          Buscando dados de todos os recursos…
        </p>
      )}

      {loadedCount > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1rem' }}>
          <HubTable
            title={`Sem Foco — Top Lucro Local${isLoading ? ` (${loadedCount}/4)` : ''}`}
            rows={data.topSemFoco}
            getValue={(r) => r.lucro}
            getPercent={(r) => (r.custoLocal > 0 && r.lucro > -8e8) ? (r.lucro / r.custoLocal) * 100 : null}
            valueLabel="Lucro"
            valueFormat={(v) => v > -8e8 ? Math.round(v).toLocaleString('pt-PT') : '—'}
            accent="#4CAF50"
          />
          <HubTable
            title={`Com Foco — Top Lucro / Foco${isLoading ? ` (${loadedCount}/4)` : ''}`}
            rows={data.topComFoco}
            getValue={(r) => r.focoUnidades > 0 ? r.lucroComFoco / r.focoUnidades : -9e8}
            getPercent={(r) => (r.custoComFoco > 0 && r.lucroComFoco > -8e8) ? (r.lucroComFoco / r.custoComFoco) * 100 : null}
            valueLabel="Lucro/Foco"
            valueFormat={(v) => v > -8e8 ? v.toFixed(2) : '—'}
            accent="#2196F3"
          />
        </div>
      )}

      {loadedCount === 0 && !isLoading && errorList.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '3rem', fontSize: '0.95rem' }}>
          Carregando…
        </p>
      )}
    </div>
  );
}
