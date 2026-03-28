import { useEffect, useState } from "react";
import { marketCategories, marketOpportunities } from "../api.js";

export default function MarketAnalyzer() {
  const [categories, setCategories] = useState([]);
  const [categoria, setCategoria] = useState("Armas");
  const [maxHoras, setMaxHoras] = useState("6");
  const [loading, setLoading] = useState(false);
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
          "Armas",
          "Armaduras",
          "Elmos",
          "Botas",
          "Capas",
          "Montarias",
          "Consumíveis",
          "Artefatos",
          "Etc (Bolsas)",
        ])
      );
  }, []);

  const buscar = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await marketOpportunities({
        categoria,
        maxIdadeHoras: parseInt(maxHoras, 10) || 6,
      });
      setRows(data.oportunidades || []);
    } catch (e) {
      setErr(e.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Arbitragem entre cidades seguras</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <label>
          <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            Categoria
          </span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {(categories.length ? categories : ["Armas"]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
            Atualizado há no máx. (h)
          </span>
          <select value={maxHoras} onChange={(e) => setMaxHoras(e.target.value)}>
            {["2", "6", "12", "24", "48"].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={buscar} disabled={loading}>
          {loading ? "A buscar…" : "Buscar oportunidades"}
        </button>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="table-wrap">
        <table className="result-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Comprar em</th>
              <th>Vender em</th>
              <th>P. compra</th>
              <th>P. venda</th>
              <th>Lucro (c/ taxa)</th>
              <th>Média 7d</th>
              <th>Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((op) => (
              <tr key={`${op.id}-${op.origem}-${op.destino}`}>
                <td>{op.id.replaceAll("_", " ")}</td>
                <td>{op.origem}</td>
                <td>{op.destino}</td>
                <td>{op.compra?.toLocaleString("pt-PT")}</td>
                <td>{op.venda?.toLocaleString("pt-PT")}</td>
                <td className={op.lucro > 0 ? "row-lucro-pos" : undefined}>{op.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}</td>
                <td>{op.media7d} / dia</td>
                <td style={{ fontSize: "0.72rem" }}>{op.atualizacaoDest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && !err && (
        <p style={{ color: "var(--muted)", marginTop: "0.75rem" }}>Carregue uma pesquisa para ver oportunidades.</p>
      )}
    </div>
  );
}
