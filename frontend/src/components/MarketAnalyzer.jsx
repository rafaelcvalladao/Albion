import { useEffect, useState } from "react";
import { marketCategories, marketOpportunities } from "../api.js";
import { profitClass } from "../utils/profit.js";

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
          <span>Item (filtro)</span>
          <input
            type="text"
            value={itemFiltro}
            onChange={(e) => setItemFiltro(e.target.value)}
            placeholder="ex: sword, wood"
          />
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
        <label>
          <span>Taxa Venda (%)</span>
          <input
            type="text"
            value={taxaVenda}
            onChange={(e) => setTaxaVenda(e.target.value)}
            style={{ width: "60px" }}
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
              <th>Item</th>
              <th>T</th>
              <th>Compre</th>
              <th>Venda</th>
              <th>P. Compra</th>
              <th>P. Venda</th>
              <th>%</th>
              <th>Lucro</th>
              <th>Última</th>
              <th>Stale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((op) => {
              const margem = op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : "0.0";
              const ultima = op.atualizacaoDest || op.atualizacaoOrig || "-";
              return (
                <tr key={`${op.id}-${op.origem}-${op.destino}`}>
                  <td>{op.nomeBase}</td>
                  <td style={{ textAlign: "center" }}>{op.tier}</td>
                  <td>{op.origem}</td>
                  <td>{op.destino}</td>
                  <td className="tabular-nums">{op.compra?.toLocaleString("pt-PT")}</td>
                  <td className="tabular-nums">{op.venda?.toLocaleString("pt-PT")}</td>
                  <td style={{ textAlign: "right" }}>{margem}%</td>
                  <td className={profitClass(op.lucro)}>{op.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{ultima}</td>
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
