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
    rawLabel: "Fibra",
    refinedLabel: "Tecido",
    rawId: "FIBER",
    refinedId: "CLOTH",
  },
  leather: {
    label: "Couro",
    calcFunction: calculateLeather,
    storageKey: "albion-leather-config-v1",
    rawLabel: "Pelego",
    refinedLabel: "Couro",
    rawId: "HIDE",
    refinedId: "LEATHER",
  },
  metal: {
    label: "Barras de Metal",
    calcFunction: calculateMetal,
    storageKey: "albion-metal-config-v1",
    rawLabel: "Minério",
    refinedLabel: "Barras de Metal",
    rawId: "ORE",
    refinedId: "METAL",
  },
  stone: {
    label: "Bloco de Pedra",
    calcFunction: calculateStone,
    storageKey: "albion-stone-config-v1",
    rawLabel: "Pedra",
    refinedLabel: "Bloco de Pedra",
    rawId: "ROCK",
    refinedId: "STONEBLOCK",
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

function itemIconUrl(itemId) {
  return `https://render.albiononline.com/v1/item/${itemId}.png?quality=1`;
}

export default function RefineryMaster({ materialType }) {
  const materialConfig = MATERIAL_TYPES[materialType];
  if (!materialConfig) return <div className="error">Material type inválido</div>;

  const [cfg, setCfg] = useState(() => loadConfig(materialConfig.storageKey));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

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

  const refreshAll = useCallback(async () => {
    await runCalculate();
  }, [runCalculate]);

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
          <div>
            <label>
              Taxa NPC
              <input
                type="number"
                value={cfg.taxaNpc}
                onChange={(e) => setCfg({ ...cfg, taxaNpc: e.target.value })}
              />
            </label>
          </div>
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
                <span className="summary-strip__value">{result.rrrPercent}%</span>
              </div>
              {result.rows?.map((row) => (
                <article key={row.nivel} className="result-card">
                  <h3 className="result-card__title">
                    <span className="result-card__tier">{row.nivel}</span>
                    <span className="result-card__vol">
                      Vol. 24h:{" "}
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
                          <td className={profitClass(row.lucro)} style={{ fontWeight: 700 }}>
                            {row.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}
                          </td>
                          <td>{row.rrr}%</td>
                          <td className={famaClass(row.fama)}>{row.fama}</td>
                          <td>{row.strategy}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
