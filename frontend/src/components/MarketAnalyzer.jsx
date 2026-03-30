import { useEffect, useState } from "react";
import { marketCategories, marketOpportunities } from "../api.js";
import { profitClass } from "../utils/profit.js";

export default function MarketAnalyzer() {
  const [categories, setCategories] = useState([]);
  const [categoria, setCategoria] = useState("Armas");
  const [maxHoras, setMaxHoras] = useState("6");
  const [usarBuyOrder, setUsarBuyOrder] = useState(false);
  const [taxaVenda, setTaxaVenda] = useState("6.5");
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
    setLoading(true);
    setErr(null);
    try {
      const data = await marketOpportunities({
        categoria,
        maxIdadeHoras: parseInt(maxHoras, 10) || 6,
        usarBuyOrder,
        taxaVenda: parseFloat(taxaVenda) || 6.5,
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
      <p className="strategy-hint">
        Compara preços entre cidades seguras; lucro líquido estimado com todas as taxas incluídas.
      </p>
      
      {/* Linha 1: Categoria e Dados */}
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
          <span>Dados no máx. (h)</span>
          <select value={maxHoras} onChange={(e) => setMaxHoras(e.target.value)}>
            {["2", "6", "12", "24", "48"].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Linha 2: Checkboxes e Configurações */}
      <div className="market-toolbar">
        <label className="market-checkbox">
          <input
            type="checkbox"
            checked={usarBuyOrder}
            onChange={(e) => setUsarBuyOrder(e.target.checked)}
          />
          Considerar Buy Order (compra)
        </label>
        <label>
          <span>Taxa Venda (%)</span>
          <input
            type="text"
            value={taxaVenda}
            onChange={(e) => setTaxaVenda(e.target.value)}
            style={{ width: "60px" }}
          />
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
              <th>T</th>
              <th>E</th>
              <th>Est</th>
              <th>Comprar em</th>
              <th>Vender em</th>
              <th>P. Compra</th>
              <th>P. Venda</th>
              <th>Teleporte</th>
              <th>Lucro Líquido</th>
              <th>Média 7d</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((op) => (
              <tr key={`${op.id}-${op.origem}-${op.destino}`}>
                <td>{op.nomeBase}</td>
                <td style={{ textAlign: "center" }}>{op.tier}</td>
                <td style={{ textAlign: "center" }}>{op.encanto}</td>
                <td style={{ textAlign: "center" }}>{op.estado}</td>
                <td>{op.origem}</td>
                <td>{op.destino}</td>
                <td className="tabular-nums">{op.compra?.toLocaleString("pt-PT")}</td>
                <td className="tabular-nums">{op.venda?.toLocaleString("pt-PT")}</td>
                <td className="tabular-nums">{op.custoTeleporte?.toFixed(0)}</td>
                <td className={profitClass(op.lucro)}>{op.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}</td>
                <td style={{ textAlign: "center" }}>{op.media7d} / dia</td>
                <td style={{ fontSize: "0.72rem" }}>{op.atualizacaoDest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && !err && (
        <p className="market-empty">Carregue uma pesquisa para ver oportunidades.</p>
      )}
    </div>
  );
}
