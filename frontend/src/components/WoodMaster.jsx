import { useCallback, useEffect, useState } from "react";
import { calculateWood, scheduleWood, strategyWood } from "../api.js";
import { profitClass, famaClass } from "../utils/profit.js";

const SPEC_KEYS = [
  { key: "t4", label: "Bétula (T4)" },
  { key: "t5", label: "Cedro (T5)" },
  { key: "t6", label: "Carvalho (T6)" },
  { key: "t7", label: "Ferro (T7)" },
  { key: "t8", label: "Abrunheiro (T8)" },
];

const STORAGE = "albion-wood-config-v1";

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

export default function WoodMaster() {
  const [cfg, setCfg] = useState(loadConfig);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
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
      const data = await calculateWood({
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
      const data = await strategyWood({
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
    calculateWood({
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
    // Igual ao desktop: recalcular ao mudar tier / opções de estratégia (não a cada tecla nas specs).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- usa cfg atual em cada disparo destes campos
  }, [cfg.tier, cfg.buyOrder, cfg.foco, cfg.bonusFortSterling]);

  useEffect(() => {
    let cancelled = false;
    setStrategyLoading(true);
    strategyWood({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- taxa/spec atualizados no refresh ou blur
  }, [cfg.buyOrder, cfg.bonusFortSterling]);

  const convertUtcToUtc3 = (utcTime) => {
    if (utcTime === "---") return "---";
    // Formato: "DD/MM HH:MM"
    const [datePart, timePart] = utcTime.split(" ");
    const [day, month] = datePart.split("/");
    const [hour, minute] = timePart.split(":").map(Number);
    
    // Criar data UTC
    const utcDate = new Date();
    utcDate.setUTCFullYear(2024, parseInt(month) - 1, parseInt(day));
    utcDate.setUTCHours(hour, minute, 0, 0);
    
    // Subtrair 3 horas para UTC-3
    utcDate.setUTCHours(utcDate.getUTCHours() - 3);
    
    // Formatar de volta
    const newDay = String(utcDate.getUTCDate()).padStart(2, "0");
    const newMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
    const newHour = String(utcDate.getUTCHours()).padStart(2, "0");
    const newMinute = String(utcDate.getUTCMinutes()).padStart(2, "0");
    
    return `${newDay}/${newMonth} ${newHour}:${newMinute}`;
  };

  const openSchedule = async () => {
    setShowSchedule(true);
    setScheduleLoading(true);
    setSchedule(null);
    try {
      const data = await scheduleWood(cfg.tier);
      setSchedule(data);
    } catch (e) {
      setSchedule({ error: e.message || String(e) });
    } finally {
      setScheduleLoading(false);
    }
  };

  const colAntLabel = cfg.tier === "T4" ? "Tábua T3" : "Tábua Ant.";
  const showLy = cfg.showLymhurst ?? false;

  return (
    <div className="wood-layout">
      <aside className="panel panel--sidebar wood-sidebar">
        <h2>Configurações</h2>
        <div className="form-grid">
          <label>
            Taxa do NPC (Prata)
            <input
              type="text"
              value={cfg.taxaNpc}
              onChange={(e) => setCfg({ ...cfg, taxaNpc: e.target.value })}
              onBlur={refreshAll}
            />
          </label>
          {SPEC_KEYS.map(({ key, label }) => (
            <label key={key}>
              {label}
              <input
                type="text"
                value={cfg.spec[key] ?? ""}
                onChange={(e) => setSpec(key, e.target.value)}
                onBlur={refreshAll}
              />
            </label>
          ))}
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
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={cfg.showLymhurst ?? false}
              onChange={(e) => setCfg({ ...cfg, showLymhurst: e.target.checked })}
            />
            Lymhurst
          </label>
          <button type="button" className="btn btn-primary" onClick={refreshAll} disabled={loading || strategyLoading}>
            {loading || strategyLoading ? "A carregar…" : "Refresh preços"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={openSchedule}>
            Horários (UTC-3)
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
                const thTronco = `Tronco (${q}×)`;
                const thAnt = `${colAntLabel} (1×)`;
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
                          <th>{thTronco}</th>
                          <th>{thAnt}</th>
                          <th>Tábua</th>
                          <th>Lucro</th>
                          <th>Fama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showLy && (
                        <tr>
                          <td>Lymhurst</td>
                          <td className="tabular-nums">{row.lymhurst.tronco?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className="tabular-nums">{row.lymhurst.tabuaAnt?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className="tabular-nums">{row.lymhurst.tabua?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className={profitClass(row.lymhurst.lucro)}>
                            {Number.isFinite(row.lymhurst.lucro)
                              ? row.lymhurst.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                          </td>
                        </tr>
                        )}
                        <tr>
                          <td>Fort Sterling</td>
                          <td className="tabular-nums">{row.fortSterling.tronco?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className="tabular-nums">{row.fortSterling.tabuaAnt?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className="tabular-nums">{row.fortSterling.tabua?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td className={profitClass(row.fortSterling.lucro)}>
                            {Number.isFinite(row.fortSterling.lucro)
                              ? row.fortSterling.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 })
                              : "—"}
                          </td>
                          <td className="tabular-nums result-table__fama">
                            {row.famaRefino != null ? row.famaRefino.toLocaleString("pt-PT") : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="otimizado-line">
                    <span className="otimizado-line__label">Otimizado (compra/venda)</span>
                    <span className={profitClass(row.otimizado)}>
                      {Number.isFinite(row.otimizado)
                        ? `${row.otimizado.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} prata`
                        : "—"}
                    </span>
                  </p>
                  {row.foco && (
                    <p className="foco-line">
                      Foco: <span className="tabular-nums">{row.foco.unidades?.toFixed(1)}</span> un ·{" "}
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
            Top 15 com volume (todas as tiers). Atualiza ao mudar buy order / bónus ou com Refresh.
          </p>
          {strategyLoading && <p className="mono strategy-hint">A carregar…</p>}
          {strategy?.error && <p className="error">{strategy.error}</p>}
          {strategy && !strategy.error && (
            <>
              <StrategyTable title="Local com Foco" kind="foco" rows={strategy.fsLocalFoco} compact />
              <StrategyTable title="Local: Fama" kind="fama" rows={strategy.fsLocalFama} compact />
              {showLy && <StrategyTable title="Global com Foco" kind="foco" rows={strategy.globalFoco} compact />}
              {showLy && <StrategyTable title="Global: Fama" kind="fama" rows={strategy.globalFama} compact />}
            </>
          )}
        </aside>
      </div>

      {showSchedule && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowSchedule(false)}>
          <div className="modal" role="dialog" aria-labelledby="sched-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3 id="sched-title">Últimas atualizações (UTC-3) — {cfg.tier}</h3>
              <button type="button" className="modal-close" onClick={() => setShowSchedule(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            {scheduleLoading && <p>A carregar…</p>}
            {schedule?.error && <p className="error">{schedule.error}</p>}
            {schedule?.blocos?.map((b) => (
              <div key={b.titulo} className="schedule-block">
                <h4>{b.titulo}</h4>
                <div className="table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>Cidade</th>
                        <th>Tronco</th>
                        <th>Tábua Ant.</th>
                        <th>Tábua (Sell)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.cities.map((c) => (
                        <tr key={c.city}>
                          <td>{c.city}</td>
                          <td>{convertUtcToUtc3(c.tronco)}</td>
                          <td>{convertUtcToUtc3(c.tabuaAnt)}</td>
                          <td>{convertUtcToUtc3(c.tabuaSell)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function StrategyTable({ title, kind, rows, compact }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

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
                <td>{r.item}</td>
                <td className={kind === "fama" ? famaClass(r.lucro) : profitClass(r.lucro)}>
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
