import { useEffect, useState } from "react";
import { marketCategories, marketOpportunities } from "../api.js";
import { profitClass } from "../utils/profit.js";

function tierStyle(tier) {
  const colors = {
    T4: "#9f6d34",
    T5: "#3a84c8",
    T6: "#9f3fba",
    T7: "#d46f2e",
    T8: "#c41d7f",
  };
  return colors[tier] || "#999";
}

function timeAgo(label) {
  if (!label) return "-";
  const parts = String(label).split(" ");
  if (parts.length < 2) return label;
  const [datePart, timePart] = parts;
  const [y,m,d] = datePart.split("-").map(Number);
  const [hh,mm] = timePart.split(":").map(Number);
  const date = new Date(Date.UTC(y,m-1,d,hh,mm));
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "agora";
  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

export default function MarketAnalyzer() {
  const [categories, setCategories] = useState([]);
  const [categoria, setCategoria] = useState("Todos");
  const [maxHoras, setMaxHoras] = useState("6");
  const [itemFiltro, setItemFiltro] = useState("");
  const [maxItens, setMaxItens] = useState("2500");
  const [taxaVenda, setTaxaVenda] = useState("6.5");
  const [stepSize, setStepSize] = useState("500");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    marketCategories()
      .then((d) => {
        const cats = d.categories || [];
        setCategories(cats);
        if (cats.length && !cats.includes(categoria)) {
          setCategoria(cats[0]);
        }
      })
      .catch(() =>
        setCategories([
          "Todos",
          "Armas",
          "Armaduras",
          "Elmos",
          "Botas",
          "Capas",
          "Escudos",
          "Luvas",
          "Montarias",
          "Consumíveis",
          "Artefatos",
          "Bolsas",
          "Materiais",
          "Ferragens",
          "Outros",
        ])
      );
  }, []);

  const buscar = async () => {
    setScanning(true);
    setLoading(true);
    setErr(null);
    setRows([]);
    setProgress(0);

    const totalMax = parseInt(maxItens, 10) || 2500;
    const step = parseInt(stepSize, 10) || 500;
    const maxRounds = Math.ceil(totalMax / step);

    try {
      let todas = [];
      for (let i = 0; i < maxRounds; i += 1) {
        const offset = i * step;
        const data = await marketOpportunities({
          categoria,
          maxIdadeHoras: parseInt(maxHoras, 10) || 6,
          itemFiltro,
          taxaVenda: parseFloat(taxaVenda) || 6.5,
          maxItensProcessar: totalMax,
          offset,
          step,
        });

        const slice = Array.isArray(data) ? data : data.oportunidades || [];
        if (i === 0) setRows(slice);
        else setRows((prev) => [...prev, ...slice]);

        todas = [...todas, ...slice];

        const pct = Math.min(100, Math.round(((offset + step) / totalMax) * 100));
        setProgress(pct);

        if (slice.length === 0) break;

        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      setRows(todas);
    } catch (e) {
      setErr(e.message || String(e));
      setRows([]);
    } finally {
      setScanning(false);
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="panel">
      <h2>Arbitragem entre cidades seguras</h2>
      <p className="strategy-hint">
        Compara preços entre cidades seguras; lucro líquido estimado com todas as taxas incluídas.
      </p>
      
      {/* Linha 1: Categoria e Filtro */}
      <div className="market-toolbar">
        <label>
          <span>Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {(categories.length ? categories : ["Armas"]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Item (filtro)</span>
          <input
            type="text"
            value={itemFiltro}
            onChange={(e) => setItemFiltro(e.target.value)}
            placeholder="ex: sword, wood"
          />
        </label>
      </div>

      {/* Linha 2: Configurações */}
      <div className="market-toolbar">
        <label>
          <span>Máx. itens processados</span>
          <input
            type="text"
            value={maxItens}
            onChange={(e) => setMaxItens(e.target.value)}
            style={{ width: "80px" }}
          />
        </label>
        <label>
          <span>Tamanho do lote</span>
          <input
            type="text"
            value={stepSize}
            onChange={(e) => setStepSize(e.target.value)}
            style={{ width: "80px" }}
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={buscar} disabled={loading || scanning}>
          {scanning ? "Escaneando…" : "Buscar oportunidades"}
        </button>
      </div>

      <div className="market-progress" style={{ marginBottom: "0.75rem" }}>
        {scanning ? (
          <span>Progresso: {progress}% (escaneando)</span>
        ) : (
          <span>Último escaneamento: {progress === 100 ? "Concluído" : "Aguardando"}</span>
        )}
      </div>

      {err && <p className="error">{err}</p>}
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Compra</th>
              <th>Venda</th>
              <th>Lucro</th>
              <th>%</th>
              <th>Última</th>
              <th>Stale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((op, idx) => {
              const margem = op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : "0.0";
              // Filtrar itens com lucro % maior que 200%
              if (parseFloat(margem) > 200) return null;
              const ultima = timeAgo(op.atualizacaoDest || op.atualizacaoOrig);
              return (
                <tr key={`${op.id}-${op.origem}-${op.destino}`}> 
                  <td style={{ textAlign: "right" }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <img
                        src={`https://render.albiononline.com/v1/item/${op.id}.png?quality=1`}
                        alt={op.nomeBase}
                        style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid #666" }}
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/32?text=?"; }}
                      />
                      <div>
                        <strong>{op.nomeBase}</strong>
                        <div style={{ marginTop: "0.1rem", fontSize: "0.80rem", color: "#aaa" }}>
                          <span style={{ color: tierStyle(op.tier), fontWeight: 700 }}>[{op.tier}]</span>
                          <span style={{ marginLeft: "0.4rem" }}>{op.estado}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{op.compra?.toLocaleString("pt-PT")}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                      {op.origem} · {timeAgo(op.atualizacaoOrig)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{op.venda?.toLocaleString("pt-PT")}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                      {op.destino} · {timeAgo(op.atualizacaoDest)}
                    </div>
                  </td>
                  <td className={profitClass(op.lucro)} style={{ fontWeight: 700 }}>
                    {op.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: "right" }}>{margem}%</td>
                  <td>{ultima}</td>
                  <td style={{ textAlign: "center" }}>{op.desatualizado ? "⚠️" : "✅"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && !err && (
        <p className="market-empty">Carregue uma pesquisa para ver oportunidades.</p>
      )}
    </div>
  );
}
