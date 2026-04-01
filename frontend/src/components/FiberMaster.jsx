import { useCallback, useEffect, useState } from "react";
import { calculateFiber, scheduleFiber } from "../api.js";
import { profitClass, famaClass } from "../utils/profit.js";

const SPEC_KEYS = [
  { key: "t4", label: "Fibra (T4)" },
  { key: "t5", label: "Fibra (T5)" },
  { key: "t6", label: "Fibra (T6)" },
  { key: "t7", label: "Fibra (T7)" },
  { key: "t8", label: "Fibra (T8)" },
];

const STORAGE = "albion-fiber-config-v1";

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    taxaNpc: "800",
    spec: { t4: "0", t5: "0", t6: "0", t7: "0", t8: "0" },
    tier: "T6",
    buyOrder: false,
    foco: false,
    bonusFortSterling: true,
    showLymhurst: false,
  };
}

function parseTierItem(item) {
  const [tier, level] = String(item).split(".");
  return {
    tier: tier || "T4",
    level: level || "0",
  };
}

function tAntOf(tier) {
  const tNum = parseInt(String(tier).slice(1), 10);
  return Number.isNaN(tNum) ? "T4" : tNum > 4 ? `T${tNum - 1}` : "T3";
}

function buildFiberId(tier, level) {
  if (level === "0") return `${tier}_FIBER`;
  return `${tier}_FIBER_LEVEL${level}`;
}

function buildClothId(tier, level) {
  if (level === "0") return `${tier}_CLOTH`;
  return `${tier}_CLOTH_LEVEL${level}`;
}

function itemIconUrl(itemId) {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=1`;
}

export default function FiberMaster() {
  const [cfg, setCfg] = useState(loadConfig);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showFarmFama, setShowFarmFama] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(cfg));
  }, [cfg]);

  const formatTimeAgo = (isoDate) => {
    if (!isoDate) return "—";
    try {
      const nowUTC = new Date();
      const nowUTC3 = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      const then = new Date(isoDate);
      if (Number.isNaN(then.getTime())) return "—";
      const diffSec = Math.floor((nowUTC3 - then) / 1000);
      if (diffSec < 0) return "—";
      if (diffSec < 60) return `${diffSec}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d`;
    } catch {
      return "—";
    }
  };

  const setSpec = (key, value) => {
    setCfg((c) => ({ ...c, spec: { ...c.spec, [key]: value } }));
  };

  const runCalculate = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await calculateFiber({
        tier: cfg.tier,
        taxaNpc: cfg.taxaNpc,
        spec: cfg.spec,
        buyOrder: cfg.buyOrder,
        foco: cfg.foco,
        bonusFortSterling: cfg.bonusFortSterling,
      });
      setResult(data);
    } catch (e) {
      setErr(e.message || String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  const refreshAll = useCallback(async () => {
    await runCalculate();
  }, [runCalculate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    calculateFiber({
      tier: cfg.tier,
      taxaNpc: cfg.taxaNpc,
      spec: cfg.spec,
      buyOrder: cfg.buyOrder,
      foco: cfg.foco,
      bonusFortSterling: cfg.bonusFortSterling,
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
  }, [cfg.tier, cfg.buyOrder, cfg.foco, cfg.bonusFortSterling]);

  const showLy = cfg.showLymhurst ?? false;

  return (
    <div className="wood-layout">
      <aside className="panel panel--sidebar wood-sidebar">
        <h2>Configurações</h2>
        <div className="form-grid">
          <label>
            Tier
            <select value={cfg.tier} onChange={(e) => setCfg({ ...cfg, tier: e.target.value })}>
              {["T4", "T5", "T6", "T7", "T8"].map((t) => (
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
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={cfg.bonusFortSterling}
                onChange={(e) => setCfg({ ...cfg, bonusFortSterling: e.target.checked })}
              />
              Bónus Fort Sterling
            </label>
          </div>
          <button type="button" className="btn btn-primary" onClick={refreshAll} disabled={loading}>
            {loading ? "A carregar…" : "Refresh preços"}
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
                return (
                <article key={row.nivel} className="result-card">
                  <h3 className="result-card__title">
                    <span className="result-card__tier">{row.nivel}</span>
                    <span className="result-card__vol">
                      Vol. FS 24h:{" "}
                      <strong className="result-card__vol-num">
                        {row.volumeFs24h?.toLocaleString("pt-PT")} un
                      </strong>
                    </span>
                  </h3>
                  <div className="table-wrap">
                    <table className="result-table">
                      <thead>
                        <tr>
                          <th>Cidade</th>
                          <th>
                            <div className="th-with-icon">
                              <img src={itemIconUrl(buildFiberId(parseTierItem(row.nivel).tier, parseTierItem(row.nivel).level))} alt={`${row.nivel} fibra`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=fiber"; }} />
                              <span className="th-with-icon__qty">x{q}</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-with-icon">
                              {(() => {
                                const tier = parseTierItem(row.nivel).tier;
                                const level = parseTierItem(row.nivel).level;
                                const tierNum = parseInt(tier.slice(1), 10);
                                const antLevel = tierNum === 4 ? "0" : level;
                                return (
                                  <img src={itemIconUrl(buildClothId(tAntOf(tier), antLevel))} alt={`${tAntOf(tier)} tecido ant.`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=cloth"; }} />
                                );
                              })()}
                              <span className="th-with-icon__qty">x1</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-with-icon">
                              <img src={itemIconUrl(buildClothId(parseTierItem(row.nivel).tier, parseTierItem(row.nivel).level))} alt={`${row.nivel} tecido`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=cloth"; }} />
                            </div>
                          </th>
                          <th>Lucro</th>
                          <th>Fama</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Fort Sterling</td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.fortSterling.tronco?.toLocaleString("pt-PT") ?? "—"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.fortSterling.troncoDate)}</div>
                          </td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.fortSterling.tabuaAnt?.toLocaleString("pt-PT") ?? "—"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.fortSterling.tabuaAntDate)}</div>
                          </td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.fortSterling.tabua?.toLocaleString("pt-PT") ?? "—"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.fortSterling.tauaDate)}</div>
                          </td>
                          <td className={profitClass(row.fortSterling.lucro)}>
                            {Number.isFinite(row.fortSterling.lucro)
                              ? row.fortSterling.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', fontWeight: 'bold' }}>
                          <td colSpan={3}>Otimizado (Melhor compra/venda)</td>
                          <td className="tabular-nums"></td>
                          <td className={profitClass(row.otimizado)}>
                            {Number.isFinite(row.otimizado)
                              ? row.otimizado.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
            Top 15 com volume (todas as tiers). Atualiza ao mudar buy order / bónus ou com Refresh.
          </p>
        </aside>
      </div>

      {showConfig && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowConfig(false)}>
          <div className="modal" role="dialog" aria-labelledby="config-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3 id="config-title">Taxa NPC, Tier e Spec</h3>
              <button type="button" className="modal-close" onClick={() => setShowConfig(false)} aria-label="Fechar">
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
              <label>
                Tier
                <select value={cfg.tier} onChange={(e) => setCfg({ ...cfg, tier: e.target.value })}>
                  {["T4", "T5", "T6", "T7", "T8"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {SPEC_KEYS.map(({ key, label }) => (
                <label key={key}>
                  {label}
                  <input
                    type="text"
                    value={cfg.spec[key] ?? ""}
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfig(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFarmFama && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowFarmFama(false)}>
          <div className="modal modal--full-width" role="dialog" aria-labelledby="farm-fama-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3 id="farm-fama-title">Farm Fama (Todos os enchantments)</h3>
              <button type="button" className="modal-close" onClick={() => setShowFarmFama(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <p style={{ opacity: 0.7 }}>Funcionalidade em desenvolvimento…</p>
          </div>
        </div>
      )}
    </div>
  );
}
