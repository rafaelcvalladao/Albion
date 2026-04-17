import { useCallback, useEffect, useMemo, useState } from 'react';
import { profitClass, famaClass } from '../utils/profit.js';

const ITEM_ICON_URL = (id) => `https://render.albiononline.com/v1/item/${id}.png?quality=1`;

// ─── Helpers genéricos ───

function parseTierItem(item) {
  const [tier, level] = String(item).split('.');
  return { tier: tier || 'T4', level: level || '0' };
}

function tAntOf(tier) {
  const tNum = parseInt(String(tier).slice(1), 10);
  return Number.isNaN(tNum) ? 'T4' : tNum > 4 ? `T${tNum - 1}` : 'T3';
}

function formatTimeAgo(isoDate) {
  if (!isoDate) return '—';
  try {
    const nowUTC = new Date();
    const nowUTC3 = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
    const then = new Date(isoDate);
    if (Number.isNaN(then.getTime())) return '—';
    const diffSec = Math.floor((nowUTC3 - then) / 1000);
    if (diffSec < 0) return '—';
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d`;
  } catch {
    return '—';
  }
}

// ─── Build ID padrão e especial (stone) ───

function stdBuildId(suffix) {
  return (tier, level) => (level === '0' ? `${tier}${suffix}` : `${tier}${suffix}_LEVEL${level}`);
}

// ─── Configurações por recurso ───

const CONFIGS = {
  wood: {
    specLabels: ['Bétula (T4)', 'Cedro (T5)', 'Carvalho (T6)', 'Ferro (T7)', 'Abrunheiro (T8)'],
    refiningCity: 'Fort Sterling',
    storageKey: 'albion-wood-config-v1',
    cityKey: 'fortSterling',
    cityDisplay: 'Fort Sterling',
    cities: [
      { key: 'fortSterling', display: 'Fort Sterling' },
      { key: 'lymhurst', display: 'Lymhurst' },
    ],
    rawAlt: 'tronco',
    refinedAlt: 'tábua',
    rawPlaceholder: 'wood',
    refinedPlaceholder: 'plank',
    buildRawId: stdBuildId('_WOOD'),
    buildRefinedId: stdBuildId('_PLANKS'),
  },
  fiber: {
    specLabels: ['Fibra (T4)', 'Fibra (T5)', 'Fibra (T6)', 'Fibra (T7)', 'Fibra (T8)'],
    refiningCity: 'Lymhurst',
    storageKey: 'albion-fiber-config-v1',
    cityKey: 'lymhurst',
    cityDisplay: 'Lymhurst',
    rawAlt: 'fibra',
    refinedAlt: 'tecido',
    rawPlaceholder: 'fiber',
    refinedPlaceholder: 'cloth',
    buildRawId: stdBuildId('_FIBER'),
    buildRefinedId: stdBuildId('_CLOTH'),
  },
  leather: {
    specLabels: ['Couro (T4)', 'Couro (T5)', 'Couro (T6)', 'Couro (T7)', 'Couro (T8)'],
    refiningCity: 'Martlock',
    storageKey: 'albion-leather-config-v1',
    cityKey: 'martlock',
    cityDisplay: 'Martlock',
    rawAlt: 'couro',
    refinedAlt: 'couro',
    rawPlaceholder: 'leather',
    refinedPlaceholder: 'leather',
    buildRawId: stdBuildId('_HIDE'),
    buildRefinedId: stdBuildId('_LEATHER'),
  },
  metal: {
    specLabels: ['Minério (T4)', 'Minério (T5)', 'Minério (T6)', 'Minério (T7)', 'Minério (T8)'],
    refiningCity: 'Thetford',
    storageKey: 'albion-metal-config-v1',
    cityKey: 'thetford',
    cityDisplay: 'Thetford',
    rawAlt: 'minério',
    refinedAlt: 'minério',
    rawPlaceholder: 'metal',
    refinedPlaceholder: 'metal',
    buildRawId: stdBuildId('_ORE'),
    buildRefinedId: stdBuildId('_METALBAR'),
  },
  stone: {
    specLabels: ['Pedra (T4)', 'Pedra (T5)', 'Pedra (T6)', 'Pedra (T7)', 'Pedra (T8)'],
    refiningCity: 'Bridgewatch',
    storageKey: 'albion-stone-config-v1',
    cityKey: 'bridgewatch',
    cityDisplay: 'Bridgewatch',
    rawAlt: 'pedra',
    refinedAlt: 'pedra',
    rawPlaceholder: 'stone',
    refinedPlaceholder: 'stone',
    buildRawId: (tier, level) =>
      level === '0' ? `${tier}_ORE` : `${tier}_ORE_LEVEL${level}@${level}`,
    buildRefinedId: (tier, level) =>
      level === '0' ? `${tier}_STONEBLOCK` : `${tier}_STONEBLOCK@${level}`,
  },
};

const SPEC_TIER_KEYS = ['t4', 't5', 't6', 't7', 't8'];

function loadConfig(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    taxaNpc: '800',
    spec: { t4: '0', t5: '0', t6: '0', t7: '0', t8: '0' },
    tier: 'T6',
    buyOrder: false,
    foco: false,
  };
}

// ─── Sub-componentes compartilhados ───

function FinalProductIcon({ item, buildRefinedId, refinedAlt, refinedPlaceholder }) {
  const { tier, level } = parseTierItem(item);
  const id = buildRefinedId(tier, level);
  return (
    <div className="strategy-final-product-icon">
      <img
        src={ITEM_ICON_URL(id)}
        alt={`${tier} ${refinedAlt}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = `https://via.placeholder.com/56?text=${refinedPlaceholder}`;
        }}
      />
    </div>
  );
}

function StrategyTable({
  title,
  kind,
  rows,
  compact,
  buildRefinedId,
  refinedAlt,
  refinedPlaceholder,
  lucroMode,
  foco,
}) {
  const [sortColumn, setSortColumn] = useState(kind === 'foco' ? 'lucro' : null);
  const [sortAsc, setSortAsc] = useState(kind === 'foco' ? false : true);

  if (!rows?.length) return null;

  const headClass =
    kind === 'foco'
      ? 'strategy-section-title strategy-section-title--foco'
      : kind === 'fama'
        ? 'strategy-section-title strategy-section-title--fama'
        : 'strategy-section-title';

  const colHeaderLabel = kind !== 'foco' ? 'Fama por Prata' : foco ? 'Lucro/Foco' : 'Lucro';

  function getLucro(r) {
    if (kind !== 'foco') return r.lucro;
    const focoU = r.focoUnidades || 1;
    if (foco) {
      if (lucroMode === 'opt') return (r.lucroOpt ?? r.lucro) / focoU;
      if (lucroMode === 'ot') return (r.lucroOT ?? r.lucro) / focoU;
      return r.lucro / focoU;
    }
    if (lucroMode === 'opt') return r.lucroOpt ?? r.lucro;
    if (lucroMode === 'ot') return r.lucroOT ?? r.lucro;
    return r.lucro;
  }
  function getVol(r) {
    if (kind !== 'foco') return r.volume;
    if (lucroMode === 'opt') return r.volumeOpt ?? r.volume;
    if (lucroMode === 'ot') return r.volumeOT ?? r.volume;
    return r.volume;
  }

  const handleHeaderClick = (column) => {
    if (sortColumn === column) setSortAsc(!sortAsc);
    else {
      setSortColumn(column);
      setSortAsc(false);
    }
  };

  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    let valA, valB;
    if (sortColumn === 'lucro' || sortColumn === 'fama') {
      valA = kind === 'foco' ? getLucro(a) : a.famaPerPrata;
      valB = kind === 'foco' ? getLucro(b) : b.famaPerPrata;
    } else if (sortColumn === 'volume') {
      valA = getVol(a) ?? 0;
      valB = getVol(b) ?? 0;
    } else {
      valA = a.item;
      valB = b.item;
    }
    if (typeof valA === 'string')
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    return sortAsc ? valA - valB : valB - valA;
  }), [rows, sortColumn, sortAsc, kind, lucroMode, foco]);

  const ind = (col) => (sortColumn !== col ? '' : sortAsc ? ' ↑' : ' ↓');

  return (
    <div className={`strategy-block${compact ? ' strategy-block--compact' : ''}`}>
      <div className={headClass} role="heading" aria-level={3}>
        {title}
      </div>
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('item')}>
                Item{ind('item')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('lucro')}>
                {colHeaderLabel}
                {ind('lucro')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleHeaderClick('volume')}>
                Vol. 24h{ind('volume')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.item}>
                <td>
                  <div className="strategy-item-cell">
                    <FinalProductIcon
                      item={r.item}
                      buildRefinedId={buildRefinedId}
                      refinedAlt={refinedAlt}
                      refinedPlaceholder={refinedPlaceholder}
                    />
                  </div>
                </td>
                <td
                  className={kind === 'fama' ? famaClass(getLucro(r)) : profitClass(getLucro(r))}
                  style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                >
                  {kind === 'foco'
                    ? foco
                      ? (getLucro(r) > -8e8 ? getLucro(r).toFixed(2) : '—')
                      : (getLucro(r) > -8e8 ? Math.round(getLucro(r)).toLocaleString('pt-PT') : '—')
                    : (r.famaPerPrata?.toFixed(4).toLocaleString('pt-PT') ?? '—')}
                </td>
                <td className="tabular-nums strategy-table-vol">
                  {getVol(r)?.toLocaleString('pt-PT') ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TieredFamaTables({ rows, buildRefinedId, refinedAlt, refinedPlaceholder, foco }) {
  const [sortBy, setSortBy] = useState('famaPerPrata');
  const [sortAsc, setSortAsc] = useState(false);
  if (!rows?.length) return null;

  const getFamaPerPrata = (r) => foco ? (r.famaPerPrataComFoco ?? 0) : (r.famaPerPrata ?? 0);
  const getLucroFama = (r) => foco ? r.lucroComFoco : r.lucro;

  const grouped = ['T4', 'T5', 'T6', 'T7', 'T8']
    .map((tier) => {
      const tierRows = rows.filter((r) => r.item.startsWith(tier));
      const sorted = [...tierRows].sort((a, b) => {
        const aVal = sortBy === 'famaPerPrata' ? getFamaPerPrata(a) : (a.volume ?? 0);
        const bVal = sortBy === 'famaPerPrata' ? getFamaPerPrata(b) : (b.volume ?? 0);
        return sortAsc ? aVal - bVal : bVal - aVal;
      });
      return { tier, items: sorted };
    })
    .filter((g) => g.items.length > 0);

  if (!grouped.length) return null;

  const handleSort = (col) => {
    if (sortBy === col) setSortAsc((c) => !c);
    else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const ind = (col) => (sortBy !== col ? '' : sortAsc ? ' ↑' : ' ↓');

  return (
    <div>
      <div className="strategy-section-title strategy-section-title--fama">
        Local: Fama (Todos os enchantments)
      </div>
      <div className="tiered-fama-grid">
        {grouped.map(({ tier, items }) => (
          <div key={tier} className="strategy-block strategy-block--compact">
            <div className="strategy-section-title strategy-section-title--fama">{tier}</div>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('famaPerPrata')}>
                      Fama/Prata{ind('famaPerPrata')}
                    </th>
                    <th style={{ cursor: 'pointer' }} onClick={() => handleSort('volume')}>
                      Vol. 24h{ind('volume')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.item}>
                      <td>
                        <FinalProductIcon
                          item={r.item}
                          buildRefinedId={buildRefinedId}
                          refinedAlt={refinedAlt}
                          refinedPlaceholder={refinedPlaceholder}
                        />
                      </td>
                      <td
                        className={famaClass(getLucroFama(r))}
                        style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}
                      >
                        {getFamaPerPrata(r)?.toFixed(4).toLocaleString('pt-PT') ?? '—'}
                      </td>
                      <td
                        className="tabular-nums strategy-table-vol"
                        style={{ textAlign: 'center' }}
                      >
                        {r.volume?.toLocaleString('pt-PT') ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal genérico ───

export default function ResourceMaster({ resource, calculateFn, strategyFn }) {
  const rc = CONFIGS[resource];
  const specKeys = SPEC_TIER_KEYS.map((k, i) => ({ key: k, label: rc.specLabels[i] }));

  const [cfg, setCfg] = useState(() => loadConfig(rc.storageKey));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showFarmFama, setShowFarmFama] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [lucroMode, setLucroMode] = useState('local');

  useEffect(() => {
    localStorage.setItem(rc.storageKey, JSON.stringify(cfg));
  }, [cfg, rc.storageKey]);

  const setSpec = (key, value) => {
    setCfg((c) => ({ ...c, spec: { ...c.spec, [key]: value } }));
  };

  const runCalculate = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await calculateFn({
        tier: cfg.tier,
        taxaNpc: cfg.taxaNpc,
        spec: cfg.spec,
        buyOrder: cfg.buyOrder,
        foco: cfg.foco,
      });
      setResult(data);
    } catch (e) {
      setErr(e.message || String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [cfg, calculateFn]);

  const runStrategy = useCallback(async () => {
    setStrategyLoading(true);
    try {
      const data = await strategyFn({
        taxaNpc: cfg.taxaNpc,
        spec: cfg.spec,
        buyOrder: cfg.buyOrder,
        foco: cfg.foco,
      });
      setStrategy(data);
    } catch (e) {
      setStrategy({ error: e.message || String(e) });
    } finally {
      setStrategyLoading(false);
    }
  }, [cfg, strategyFn]);

  const refreshAll = useCallback(async () => {
    await Promise.all([runCalculate(), runStrategy()]);
  }, [runCalculate, runStrategy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    calculateFn({
      tier: cfg.tier,
      taxaNpc: cfg.taxaNpc,
      spec: cfg.spec,
      buyOrder: cfg.buyOrder,
      foco: cfg.foco,
    })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e.message || String(e));
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.tier, cfg.buyOrder, cfg.foco]);

  useEffect(() => {
    let cancelled = false;
    setStrategyLoading(true);
    strategyFn({
      taxaNpc: cfg.taxaNpc,
      spec: cfg.spec,
      buyOrder: cfg.buyOrder,
      foco: cfg.foco,
    })
      .then((data) => {
        if (!cancelled) setStrategy(data);
      })
      .catch((e) => {
        if (!cancelled) setStrategy({ error: e.message || String(e) });
      })
      .finally(() => {
        if (!cancelled) setStrategyLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.buyOrder, cfg.foco]);

  return (
    <div className="wood-layout">
      <aside className="panel panel--sidebar wood-sidebar">
        <h2>Configurações</h2>
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '4px',
            border: '1px solid #4CAF50',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: '#2E7D32' }}>
            🏴 Refino em: <strong>{rc.refiningCity}</strong>
          </p>
        </div>
        <div className="form-grid">
          <label>
            Tier
            <select value={cfg.tier} onChange={(e) => setCfg({ ...cfg, tier: e.target.value })}>
              {['T4', 'T5', 'T6', 'T7', 'T8'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setShowConfig(true)}>
            Editar taxa e specs
          </button>
          <div className="checkbox-grid">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={cfg.buyOrder}
                onChange={(e) => setCfg({ ...cfg, buyOrder: e.target.checked })}
              />
              Comprar via buy order
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={cfg.foco}
                onChange={(e) => setCfg({ ...cfg, foco: e.target.checked })}
              />
              Usar foco
            </label>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={refreshAll}
            disabled={loading || strategyLoading}
          >
            {loading || strategyLoading ? 'A carregar…' : 'Refresh preços'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowFarmFama(true)}>
            Farm Fama
          </button>
        </div>
      </aside>

      <div className="wood-results-row">
        <section className="panel wood-results-main">
          <h2>Resultados</h2>
          {err && <p className="error">{err}</p>}
          {result && (
            <>
              <div className="summary-strip">
                <span className="summary-strip__label">Ordem</span>
                <span className="summary-strip__value">{result.strategy}</span>
                <span className="summary-strip__label">RRR</span>
                <span className="summary-strip__value">{result.rrrPercent?.toFixed(1)}%</span>
              </div>
              {result.rows?.map((row) => {
                const q = row.qtTronco ?? 0;
                const { tier, level } = parseTierItem(row.nivel);
                const tierNum = parseInt(tier.slice(1), 10);
                const antLevel = tierNum === 4 ? '0' : level;

                return (
                  <article key={row.nivel} className="result-card">
                    <h3 className="result-card__title">
                      <span className="result-card__tier">{row.nivel}</span>
                    </h3>
                    <div className="table-wrap">
                      <table className="result-table">
                        <thead>
                          <tr>
                            <th>Cidade</th>
                            <th>
                              <div className="th-with-icon">
                                <img
                                  src={ITEM_ICON_URL(rc.buildRawId(tier, level))}
                                  alt={`${row.nivel} ${rc.rawAlt}`}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://via.placeholder.com/84?text=${rc.rawPlaceholder}`;
                                  }}
                                />
                                <span className="th-with-icon__qty">x{q}</span>
                              </div>
                            </th>
                            <th>
                              <div className="th-with-icon">
                                <img
                                  src={ITEM_ICON_URL(rc.buildRefinedId(tAntOf(tier), antLevel))}
                                  alt={`${tAntOf(tier)} ${rc.refinedAlt} ant.`}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://via.placeholder.com/84?text=${rc.refinedPlaceholder}`;
                                  }}
                                />
                                <span className="th-with-icon__qty">x1</span>
                              </div>
                            </th>
                            <th>
                              <div className="th-with-icon">
                                <img
                                  src={ITEM_ICON_URL(rc.buildRefinedId(tier, level))}
                                  alt={`${row.nivel} ${rc.refinedAlt}`}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://via.placeholder.com/84?text=${rc.refinedPlaceholder}`;
                                  }}
                                />
                              </div>
                            </th>
                            <th>Lucro</th>
                            <th>Vol. 24h</th>
                            <th>Fama</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rc.cities || [{ key: rc.cityKey, display: rc.cityDisplay }]).map(
                            (city) => {
                              const cd = row[city.key];
                              return (
                                <tr key={city.key}>
                                  <td>{city.display}</td>
                                  <td
                                    className="tabular-nums"
                                    style={{ textAlign: 'center' }}
                                  >
                                    <div>
                                      {cd?.tronco?.toLocaleString('pt-PT') ?? '—'}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#999' }}>
                                      {formatTimeAgo(cd?.troncoDate)}
                                    </div>
                                  </td>
                                  <td
                                    className="tabular-nums"
                                    style={{ textAlign: 'center' }}
                                  >
                                    <div>
                                      {cd?.tabuaAnt?.toLocaleString('pt-PT') ?? '—'}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#999' }}>
                                      {formatTimeAgo(cd?.tabuaAntDate)}
                                    </div>
                                  </td>
                                  <td
                                    className="tabular-nums"
                                    style={{ textAlign: 'center' }}
                                  >
                                    <div>
                                      {cd?.tabua?.toLocaleString('pt-PT') ?? '—'}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#999' }}>
                                      {formatTimeAgo(cd?.tauaDate)}
                                    </div>
                                  </td>
                                  <td className={profitClass(cd?.lucro)}>
                                    {Number.isFinite(cd?.lucro)
                                      ? cd.lucro.toLocaleString('pt-PT', {
                                          maximumFractionDigits: 0,
                                        })
                                      : '—'}
                                  </td>
                                  <td className="tabular-nums" style={{ textAlign: 'center' }}>
                                    {cd?.volume24h != null
                                      ? cd.volume24h.toLocaleString('pt-PT')
                                      : '—'}
                                  </td>
                                  <td className="tabular-nums result-table__fama">
                                    {row.famaRefino != null
                                      ? row.famaRefino.toLocaleString('pt-PT')
                                      : '—'}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                          {row.melhorPreco && (
                            <tr style={{ borderTop: '1px solid rgba(0,255,255,0.15)' }}>
                              <td style={{ fontSize: '0.85em', opacity: 0.8 }}>Melhor preço</td>
                              {[row.melhorPreco.tronco, row.melhorPreco.tabuaAnt, row.melhorPreco.produto].map(
                                (mp, i) => (
                                  <td
                                    key={i}
                                    className="tabular-nums"
                                    style={{ textAlign: 'center', fontSize: '0.85em' }}
                                  >
                                    {mp ? (
                                      <>
                                        <div>{mp.preco.toLocaleString('pt-PT')}</div>
                                        <div style={{ fontSize: '0.85em', color: '#999' }}>
                                          {mp.cidade} · {formatTimeAgo(mp.data)}
                                        </div>
                                      </>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                ),
                              )}
                              <td className={profitClass(row.melhorPreco.lucro)}>
                                {Number.isFinite(row.melhorPreco.lucro) && row.melhorPreco.lucro > -8e8
                                  ? row.melhorPreco.lucro.toLocaleString('pt-PT', { maximumFractionDigits: 0 })
                                  : '—'}
                              </td>
                              <td className="tabular-nums" style={{ textAlign: 'center', fontSize: '0.85em' }}>
                                {row.melhorPreco.volumeProduto != null
                                  ? row.melhorPreco.volumeProduto.toLocaleString('pt-PT')
                                  : '—'}
                              </td>
                              <td />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="otimizado-line">
                      <span className="otimizado-line__label">
                        Otimizado{' '}
                        {(rc.cities || [{ display: rc.cityDisplay }])
                          .map((c) => c.display.split(' ').map((w) => w[0]).join(''))
                          .join('-')}
                      </span>
                      <span className={profitClass(row.otimizado)}>
                        {Number.isFinite(row.otimizado)
                          ? `${row.otimizado.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} prata`
                          : '—'}
                      </span>
                    </p>
                    {row.foco && (
                      <p className="foco-line">
                        Foco: <span className="tabular-nums">{row.foco.unidades?.toFixed(1)}</span>{' '}
                        un ·{' '}
                        <span className={profitClass(row.foco.prataPorFoco)}>
                          {row.foco.prataPorFoco?.toFixed(2)} prata/foco
                        </span>
                      </p>
                    )}
                  </article>
                );
              })}
            </>
          )}
        </section>

        <aside className="panel wood-strategy-panel" aria-label="Indicações">
          <div className="strategy-panel__head">
            <h2>Indicações</h2>
          </div>
          <p className="strategy-hint">
            Top 8 com volume (todas as tiers). Atualiza ao mudar buy order / foco ou com Refresh.
          </p>
          <div style={{ margin: '0.5rem 0' }}>
            <select
              value={lucroMode}
              onChange={(e) => setLucroMode(e.target.value)}
              className="strategy-select"
            >
              <option value="local">
                Lucro {rc.cityDisplay.split(' ').map((w) => w[0]).join('')}
              </option>
              {rc.cities && rc.cities.length > 1 && (
                <option value="opt">
                  Lucro{' '}
                  {rc.cities.map((c) => c.display.split(' ').map((w) => w[0]).join('')).join('-')}
                </option>
              )}
              <option value="ot">Lucro OT</option>
            </select>
          </div>
          {strategyLoading && <p className="mono strategy-hint">A carregar…</p>}
          {strategy?.error && <p className="error">{strategy.error}</p>}
          {strategy && !strategy.error && (
            <StrategyTable
              title="Top Lucro"
              kind="foco"
              rows={strategy.fsLocalFoco}
              compact
              buildRefinedId={rc.buildRefinedId}
              refinedAlt={rc.refinedAlt}
              refinedPlaceholder={rc.refinedPlaceholder}
              lucroMode={lucroMode}
              foco={cfg.foco}
            />
          )}
        </aside>
      </div>

      {showConfig && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowConfig(false)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="config-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h3 id="config-title">Taxa NPC e Spec</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowConfig(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <div className="form-grid">
              <label>
                Taxa do NPC (Prata)
                <input
                  type="text"
                  value={cfg.taxaNpc}
                  onChange={(e) => setCfg({ ...cfg, taxaNpc: e.target.value })}
                />
              </label>
              {specKeys.map(({ key, label }) => (
                <label key={key}>
                  {label}
                  <input
                    type="text"
                    value={cfg.spec[key] ?? ''}
                    onChange={(e) => setSpec(key, e.target.value)}
                  />
                </label>
              ))}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowConfig(false);
                    refreshAll();
                  }}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfig(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFarmFama && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowFarmFama(false)}>
          <div
            className="modal modal--full-width"
            role="dialog"
            aria-labelledby="farm-fama-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h3 id="farm-fama-title">Farm Fama (Todos os enchantments)</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowFarmFama(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            {strategyLoading ? (
              <p>A carregar…</p>
            ) : strategy?.error ? (
              <p className="error">{strategy.error}</p>
            ) : (
              <TieredFamaTables
                rows={strategy?.fsLocalFamaAll || strategy?.fsLocalFama}
                buildRefinedId={rc.buildRefinedId}
                refinedAlt={rc.refinedAlt}
                refinedPlaceholder={rc.refinedPlaceholder}
                foco={cfg.foco}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
