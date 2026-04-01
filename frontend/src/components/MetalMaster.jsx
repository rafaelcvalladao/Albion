import { useCallback, useEffect, useState } from "react";
import { calculateMetal, strategyMetal } from "../api.js";
import { profitClass, famaClass } from "../utils/profit.js";

const SPEC_KEYS = [
  { key: "t4", label: "Minério (T4)" },
  { key: "t5", label: "Minério (T5)" },
  { key: "t6", label: "Minério (T6)" },
  { key: "t7", label: "Minério (T7)" },
  { key: "t8", label: "Minério (T8)" },
];

const REFINING_CITY = "Bridgewatch";
const STORAGE = "albion-metal-config-v1";

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

function buildOreId(tier, level) {
  if (level === "0") return `${tier}_ORE`;
  return `${tier}_ORE_LEVEL${level}`;
}

function buildMetalId(tier, level) {
  if (level === "0") return `${tier}_METALBAR`;
  return `${tier}_METALBAR_LEVEL${level}`;
}

function itemIconUrl(itemId) {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=1`;
}

function FinalProductIcon({ item }) {
  const { tier, level } = parseTierItem(item);
  const metalId = buildMetalId(tier, level);

  return (
    <div className="strategy-final-product-icon">
      <img src={itemIconUrl(metalId)} alt={`${tier} minério`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/56?text=metal"; }} />
    </div>
  );
}

function StrategyTable({ title, kind, rows, compact }) {
  const [sortColumn, setSortColumn] = useState(kind === "foco" ? "volume" : null);
  const [sortAsc, setSortAsc] = useState(kind === "foco" ? false : true);

  if (!rows?.length) return null;

  const headClass =
    kind === "foco"
      ? "strategy-section-title strategy-section-title--foco"
      : kind === "fama"
        ? "strategy-section-title strategy-section-title--fama"
        : "strategy-section-title";

  const colHeaderLabel = kind === "foco" ? "Lucro/1 foco" : "Fama por Prata";

  const handleHeaderClick = (column) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(false);
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    let valA, valB;

    if (sortColumn === "lucro" || sortColumn === "fama") {
      valA = kind === "foco" ? a.lucro : a.famaPerPrata;
      valB = kind === "foco" ? b.lucro : b.famaPerPrata;
    } else if (sortColumn === "volume") {
      valA = a.volume ?? 0;
      valB = b.volume ?? 0;
    } else {
      valA = a.item;
      valB = b.item;
    }

    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const getSortIndicator = (column) => {
    if (sortColumn !== column) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  return (
    <div className={`strategy-block${compact ? " strategy-block--compact" : ""}`}>
      <div className={headClass} role="heading" aria-level={3}>
        {title}
      </div>
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleHeaderClick("item")}
              >
                Item{getSortIndicator("item")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleHeaderClick("lucro")}
              >
                {colHeaderLabel}
                {getSortIndicator("lucro")}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => handleHeaderClick("volume")}
              >
                Vol. 24h{getSortIndicator("volume")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.item}>
                <td>
                  <div className="strategy-item-cell">
                    <FinalProductIcon item={r.item} />
                  </div>
                </td>
                <td className={kind === "fama" ? famaClass(r.lucro) : profitClass(r.lucro)} style={{ fontSize: "1.1rem", fontWeight: 700, textAlign: "center" }}>
                  {kind === "foco"
                    ? Math.round(r.lucro).toLocaleString("pt-PT")
                    : r.famaPerPrata?.toFixed(4).toLocaleString("pt-PT") ?? "—"}
                </td>
                <td className="tabular-nums strategy-table-vol">{r.volume?.toLocaleString("pt-PT") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TieredFamaTables({ rows }) {
  const [sortBy, setSortBy] = useState("famaPerPrata");
  const [sortAsc, setSortAsc] = useState(false);
  if (!rows?.length) return null;

  const tiers = ["T4", "T5", "T6", "T7", "T8"];
  const grouped = tiers
    .map((tier) => {
      const tierRows = rows.filter((r) => r.item.startsWith(tier));
      const sorted = [...tierRows].sort((a, b) => {
        let aVal = sortBy === "famaPerPrata" ? a.famaPerPrata ?? 0 : a.volume ?? 0;
        let bVal = sortBy === "famaPerPrata" ? b.famaPerPrata ?? 0 : b.volume ?? 0;
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
      return { tier, items: sorted };
    })
    .filter((g) => g.items.length > 0);

  if (!grouped.length) return null;

  const getIndicator = (column) => {
    if (sortBy !== column) return "";
    return sortAsc ? " ↑" : " ↓";
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortAsc((cur) => !cur);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  return (
    <div>
      <div className="strategy-section-title strategy-section-title--fama">Local: Fama (Todos os enchantments)</div>
      <div className="tiered-fama-grid">
        {grouped.map(({ tier, items }) => (
          <div key={tier} className="strategy-block strategy-block--compact">
            <div className="strategy-section-title strategy-section-title--fama">{tier}</div>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("famaPerPrata")}
                    >
                      Fama/Prata{getIndicator("famaPerPrata")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("volume")}
                    >
                      Vol. 24h{getIndicator("volume")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.item}>
                      <td>
                        <FinalProductIcon item={r.item} />
                      </td>
                      <td className={famaClass(r.lucro)} style={{ fontSize: "1.1rem", fontWeight: 700, textAlign: "center" }}>
                        {r.famaPerPrata?.toFixed(4).toLocaleString("pt-PT") ?? "—"}
                      </td>
                      <td className="tabular-nums strategy-table-vol" style={{ textAlign: "center" }}>{r.volume?.toLocaleString("pt-PT") ?? "—"}</td>
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

export default function MetalMaster() {
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
      const data = await calculateMetal({
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
  }, [cfg]);

  const refreshAll = useCallback(async () => {
    await runCalculate();
  }, [runCalculate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    calculateMetal({
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
  }, [cfg.tier, cfg.buyOrder, cfg.foco]);

  useEffect(() => {
    let cancelled = false;
    setStrategyLoading(true);
    strategyMetal({
      taxaNpc: cfg.taxaNpc,
      spec: cfg.spec,
      buyOrder: cfg.buyOrder,
    })
      .then((data) => {
        if (!cancelled) setStrategy(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setStrategy({ error: e.message || String(e) });
        }
      })
      .finally(() => {
        if (!cancelled) setStrategyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cfg.buyOrder]);

  return (
    <div className="wood-layout">
      <aside className="panel panel--sidebar wood-sidebar">
        <h2>Configurações</h2>
        <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: "4px", border: "1px solid #4CAF50" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: "bold", color: "#2E7D32" }}>🏴 Refino em: <strong>{REFINING_CITY}</strong></p>
        </div>
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
                              <img src={itemIconUrl(buildOreId(parseTierItem(row.nivel).tier, parseTierItem(row.nivel).level))} alt={`${row.nivel} minério`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=ore"; }} />
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
                                  <img src={itemIconUrl(buildMetalId(tAntOf(tier), antLevel))} alt={`${tAntOf(tier)} minério ant.`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=metal"; }} />
                                );
                              })()}
                              <span className="th-with-icon__qty">x1</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-with-icon">
                              <img src={itemIconUrl(buildMetalId(parseTierItem(row.nivel).tier, parseTierItem(row.nivel).level))} alt={`${row.nivel} minério`} onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/84?text=metal"; }} />
                            </div>
                          </th>
                          <th>Lucro</th>
                          <th>Fama</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Bridgewatch</td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.bridgewatch?.tronco?.toLocaleString("pt-PT") ?? "\u2014"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.bridgewatch?.troncoDate)}</div>
                          </td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.bridgewatch?.tabuaAnt?.toLocaleString("pt-PT") ?? "\u2014"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.bridgewatch?.tabuaAntDate)}</div>
                          </td>
                          <td className="tabular-nums" style={{ textAlign: 'center' }}>
                            <div>{row.bridgewatch?.tabua?.toLocaleString("pt-PT") ?? "\u2014"}</div>
                            <div style={{ fontSize: '0.85em', color: '#999' }}>{formatTimeAgo(row.bridgewatch?.tauaDate)}</div>
                          </td>
                          <td className={profitClass(row.bridgewatch?.lucro)}>
                            {Number.isFinite(row.bridgewatch?.lucro)
                              ? row.bridgewatch.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "\u2014"}
                          </td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "\u2014"}
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
          {strategyLoading && <p className="mono strategy-hint">A carregar…</p>}
          {strategy?.error && <p className="error">{strategy.error}</p>}
          {strategy && !strategy.error && (
            <>
              <StrategyTable title="Local com Foco" kind="foco" rows={strategy.fsLocalFoco} compact />
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
                <button type="button" className="btn btn-primary" onClick={() => setShowConfig(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFarmFama && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowFarmFama(false)}>
          <div className="modal modal--large" role="dialog" aria-labelledby="farm-fama-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3 id="farm-fama-title">Farm Fama</h3>
              <button type="button" className="modal-close" onClick={() => setShowFarmFama(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            <div className="modal-body">
              {strategyLoading && <p className="mono">A carregar…</p>}
              {strategy?.error && <p className="error">{strategy.error}</p>}
              {strategy && !strategy.error && (
                <TieredFamaTables rows={strategy.fsLocalFama} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
