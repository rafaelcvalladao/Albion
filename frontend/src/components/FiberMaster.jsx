import { useCallback, useEffect, useState } from "react";
import { calculateFiber, scheduleFiber, strategyFiber } from "../api.js";
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

function itemIconUrl(itemId) {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=1`;
}

function FinalProductIcon({ item }) {
  return (
    <div className="strategy-final-product-icon">
      <img src={itemIconUrl(item)} alt={item} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/56?text=product"; }} />
    </div>
  );
}

export default function FiberMaster() {
  const [cfg, setCfg] = useState(loadConfig);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showFarmFama, setShowFarmFama] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(cfg));
  }, [cfg]);

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

  const runStrategy = useCallback(async () => {
    setStrategyLoading(true);
    try {
      const data = await strategyFiber({
        taxaNpc: cfg.taxaNpc,
        spec: cfg.spec,
        buyOrder: cfg.buyOrder,
        bonusFortSterling: cfg.bonusFortSterling,
      });
      setStrategy(data);
    } catch (e) {
      setStrategy({ error: e.message || String(e) });
    } finally {
      setStrategyLoading(false);
    }
  }, [cfg]);

  const refreshAll = useCallback(async () => {
    await Promise.all([runCalculate(), runStrategy()]);
  }, [runCalculate, runStrategy]);

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

  useEffect(() => {
    let cancelled = false;
    setStrategyLoading(true);
    strategyFiber({
      taxaNpc: cfg.taxaNpc,
      spec: cfg.spec,
      buyOrder: cfg.buyOrder,
      bonusFortSterling: cfg.bonusFortSterling,
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
  }, [cfg.buyOrder, cfg.bonusFortSterling]);

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
          <button type="button" className="btn btn-primary" onClick={refreshAll} disabled={loading || strategyLoading}>
            {loading || strategyLoading ? "A carregar…" : "Refresh preços"}
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
              {result.rows?.map((row) => (
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
                          <th>Lucro</th>
                          <th>RRR%</th>
                          <th>Fama</th>
                          <th>Estratégia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showLy && row.lymhurst && (
                          <tr>
                            <td className={profitClass(row.lymhurst.lucro)}>
                              <strong>Lymhurst</strong>
                              <br />
                              {Number.isFinite(row.lymhurst.lucro)
                                ? row.lymhurst.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                                : "—"}{" "}
                              prata
                            </td>
                            <td className="tabular-nums">{result.rrrPercent?.toFixed(1)}%</td>
                            <td className="tabular-nums result-table__fama">
                              {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                            </td>
                            <td>Vender bruto</td>
                          </tr>
                        )}
                        <tr>
                          <td className={profitClass(row.lucro)}>
                            <strong>Fort Sterling</strong>
                            <br />
                            {Number.isFinite(row.lucro)
                              ? row.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "—"}{" "}
                            prata
                          </td>
                          <td className="tabular-nums">{result.rrrPercent?.toFixed(1)}%</td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                          </td>
                          <td>Vender bruto</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
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
          {strategyLoading && <p className="mono strategy-hint">A carregar…</p>}
          {strategy?.error && <p className="error">{strategy.error}</p>}
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
