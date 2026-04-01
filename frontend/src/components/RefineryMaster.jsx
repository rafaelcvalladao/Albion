import { useCallback, useEffect, useState } from "react";
import { calculateFiber, calculateLeather, calculateMetal, calculateStone } from "../api.js";
import { profitClass, famaClass } from "../utils/profit.js";

const SPEC_KEYS = [
  { key: "t4", label: "T4" },
  { key: "t5", label: "T5" },
  { key: "t6", label: "T6" },
  { key: "t7", label: "T7" },
  { key: "t8", label: "T8" },
];

const MATERIAL_TYPES = {
  fiber: {
    label: "Tecido",
    calcFunction: calculateFiber,
    storageKey: "albion-fiber-config-v1",
    specLabels: [
      { key: "t4", label: "Fibra (T4)" },
      { key: "t5", label: "Fibra (T5)" },
      { key: "t6", label: "Fibra (T6)" },
      { key: "t7", label: "Fibra (T7)" },
      { key: "t8", label: "Fibra (T8)" },
    ],
  },
  leather: {
    label: "Couro",
    calcFunction: calculateLeather,
    storageKey: "albion-leather-config-v1",
    specLabels: [
      { key: "t4", label: "Pelego (T4)" },
      { key: "t5", label: "Pelego (T5)" },
      { key: "t6", label: "Pelego (T6)" },
      { key: "t7", label: "Pelego (T7)" },
      { key: "t8", label: "Pelego (T8)" },
    ],
  },
  metal: {
    label: "Metal",
    calcFunction: calculateMetal,
    storageKey: "albion-metal-config-v1",
    specLabels: [
      { key: "t4", label: "Minério (T4)" },
      { key: "t5", label: "Minério (T5)" },
      { key: "t6", label: "Minério (T6)" },
      { key: "t7", label: "Minério (T7)" },
      { key: "t8", label: "Minério (T8)" },
    ],
  },
  stone: {
    label: "Pedra",
    calcFunction: calculateStone,
    storageKey: "albion-stone-config-v1",
    specLabels: [
      { key: "t4", label: "Pedra (T4)" },
      { key: "t5", label: "Pedra (T5)" },
      { key: "t6", label: "Pedra (T6)" },
      { key: "t7", label: "Pedra (T7)" },
      { key: "t8", label: "Pedra (T8)" },
    ],
  },
};

function loadConfig(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
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

function StrategyTable({ title, kind, rows, compact }) {
  if (!rows || rows.length === 0) return null;
  const isFama = kind === "fama";

  return (
    <div className="strategy-table-wrapper">
      <h4>{title}</h4>
      <div className="table-wrap">
        <table className="strategy-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="tabular-nums">{isFama ? "Fama" : "Lucro"}</th>
              <th className="tabular-nums">Vol. 24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={compact ? "compact" : ""}>
                <td>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <img
                      src={itemIconUrl(row.itemId)}
                      alt={row.itemName}
                      style={{ width: "32px", height: "32px" }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/32?text=item";
                      }}
                    />
                    <span>{row.itemName}</span>
                  </div>
                </td>
                <td className="tabular-nums">
                  <span className={isFama ? famaClass(row.value) : profitClass(row.value)}>
                    {Number.isFinite(row.value) ? row.value?.toLocaleString("pt-PT") : "—"}
                  </span>
                </td>
                <td className="tabular-nums">
                  <span>{Number.isFinite(row.vol) ? row.vol?.toLocaleString("pt-PT") : "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RefineryMaster({ materialType }) {
  const materialConfig = MATERIAL_TYPES[materialType];
  if (!materialConfig) return <div className="error">Material type inválido</div>;

  const [cfg, setCfg] = useState(() => loadConfig(materialConfig.storageKey));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showFarmFama, setShowFarmFama] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(materialConfig.storageKey, JSON.stringify(cfg));
  }, [cfg, materialConfig.storageKey]);

  const setSpec = (key, value) => {
    setCfg((c) => ({ ...c, spec: { ...c.spec, [key]: value } }));
  };

  const runCalculate = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await materialConfig.calcFunction({
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
  }, [cfg, materialConfig]);

  const runStrategy = useCallback(async () => {
    setStrategyLoading(true);
    try {
      const data = { top7: [] };
      setStrategy(data);
    } catch (e) {
      setStrategy({ error: e.message || String(e) });
    } finally {
      setStrategyLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([runCalculate(), runStrategy()]);
  }, [runCalculate, runStrategy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    materialConfig.calcFunction({
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
  }, [cfg.tier, cfg.buyOrder, cfg.foco, cfg.bonusFortSterling, materialConfig]);

  useEffect(() => {
    let cancelled = false;
    setStrategyLoading(true);
    Promise.resolve({ top7: [] })
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
          <h2>Resultados - {materialConfig.label}</h2>
          {err && <p className="error">{err}</p>}
          {result && (
            <>
              <div className="summary-strip">
                <span className="summary-strip__label">Estratégia</span>
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
          {strategy && !strategy.error && (
            <>
              <StrategyTable title="Local com Foco" kind="foco" rows={strategy.fsLocalFoco} compact />
              {showLy && <StrategyTable title="Global com Foco" kind="foco" rows={strategy.globalFoco} compact />}
              {showLy && <StrategyTable title="Global: Fama" kind="fama" rows={strategy.globalFama} compact />}
            </>
          )}
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
              {materialConfig.specLabels.map(({ key, label }) => (
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
