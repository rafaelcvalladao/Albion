import { useCallback, useEffect, useState } from "react";
import { calculateWood, scheduleWood, strategyWood } from "../api.js";

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

  return (
    <div className="wood-layout" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      <aside className="panel" style={{ flex: "0 0 280px" }}>
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
          <button type="button" className="btn btn-primary" onClick={refreshAll} disabled={loading || strategyLoading}>
            {loading || strategyLoading ? "A carregar…" : "Refresh preços"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={openSchedule}>
            Horários (UTC)
          </button>
        </div>
      </aside>

      <div className="wood-results-row">
        <section className="panel wood-results-main">
          <h2>Resultados</h2>
          {err && <p className="error">{err}</p>}
          {result && (
            <>
              <p className="mono" style={{ marginTop: 0, color: "var(--accent)" }}>
                Estratégia: {result.strategy} | RRR: {result.rrrPercent?.toFixed(1)}%
              </p>
              {result.rows?.map((row) => (
                <div key={row.nivel} style={{ marginBottom: "1.25rem" }}>
                  <p className="mono" style={{ color: "var(--accent)", margin: "0 0 0.35rem" }}>
                    --- {row.nivel} (Vol: {row.volumeFs24h?.toLocaleString("pt-PT")} un/24h FS) ---
                  </p>
                  <div className="table-wrap">
                    <table className="result-table">
                      <thead>
                        <tr>
                          <th>Cidade</th>
                          <th>Tronco</th>
                          <th>{colAntLabel}</th>
                          <th>Tábua</th>
                          <th>Lucro</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Lymhurst</td>
                          <td>{row.lymhurst.tronco?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{row.lymhurst.tabuaAnt?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{row.lymhurst.tabua?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{Number.isFinite(row.lymhurst.lucro) ? row.lymhurst.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) : "—"}</td>
                        </tr>
                        <tr>
                          <td>Fort Sterling</td>
                          <td>{row.fortSterling.tronco?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{row.fortSterling.tabuaAnt?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{row.fortSterling.tabua?.toLocaleString("pt-PT") ?? "—"}</td>
                          <td>{Number.isFinite(row.fortSterling.lucro) ? row.fortSterling.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) : "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p
                    className="mono"
                    style={{
                      margin: "0.35rem 0 0",
                      color: row.otimizado > 0 ? "var(--accent-2)" : undefined,
                    }}
                  >
                    Otimizado (compra/venda): {Number.isFinite(row.otimizado) ? row.otimizado.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) : "—"} prata
                  </p>
                  {row.foco && (
                    <p className="mono" style={{ margin: "0.25rem 0 0", color: "var(--foco)" }}>
                      &gt; Foco: {row.foco.unidades?.toFixed(1)} un | {row.foco.prataPorFoco?.toFixed(2)} Prata/Foco
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </section>

        <aside className="panel wood-strategy-panel" aria-label="Estratégia completa">
          <h2 style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1, paddingBottom: "0.35rem" }}>
            Estratégia completa
          </h2>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
            Top 7 com volume (todas as tiers). Atualiza ao mudar buy order / bónus ou com Refresh.
          </p>
          {strategyLoading && <p className="mono" style={{ color: "var(--muted)" }}>A carregar…</p>}
          {strategy?.error && <p className="error">{strategy.error}</p>}
          {strategy && !strategy.error && (
            <>
              <StrategyTable title="GLOBAL: Lucro com foco (prata/foco)" rows={strategy.globalFoco} prataFormat="foco" compact />
              <StrategyTable title="GLOBAL: Giro de fama (lucro un.)" rows={strategy.globalFama} prataFormat="int" compact />
              <StrategyTable title="FS local: Lucro com foco (prata/foco)" rows={strategy.fsLocalFoco} prataFormat="foco" compact />
              <StrategyTable title="FS local: Giro de fama (lucro un.)" rows={strategy.fsLocalFama} prataFormat="int" compact />
            </>
          )}
        </aside>
      </div>

      {showSchedule && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowSchedule(false)}>
          <div className="modal" role="dialog" aria-labelledby="sched-title" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3 id="sched-title">Últimas atualizações (UTC) — {cfg.tier}</h3>
              <button type="button" className="modal-close" onClick={() => setShowSchedule(false)} aria-label="Fechar">
                ×
              </button>
            </header>
            {scheduleLoading && <p>A carregar…</p>}
            {schedule?.error && <p className="error">{schedule.error}</p>}
            {schedule?.blocos?.map((b) => (
              <div key={b.titulo} style={{ marginBottom: "1rem" }}>
                <h4 className="mono" style={{ color: "var(--accent)", margin: "0 0 0.5rem" }}>
                  {b.titulo}
                </h4>
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
                          <td>{c.tronco}</td>
                          <td>{c.tabuaAnt}</td>
                          <td>{c.tabuaSell}</td>
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

function StrategyTable({ title, rows, prataFormat, compact }) {
  if (!rows?.length) return null;
  return (
    <div className={`strategy-block${compact ? " strategy-block--compact" : ""}`}>
      <h4>{title}</h4>
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Lucro</th>
              <th>Vol. 24h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item}>
                <td>{r.item}</td>
                <td className={r.lucro > 0 ? "row-lucro-pos" : undefined}>
                  {prataFormat === "foco" ? r.lucro.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) : r.lucro.toFixed(2)}
                </td>
                <td>{r.volume?.toLocaleString("pt-PT") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
