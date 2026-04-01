import { useEffect, useState } from "react";
import { marketCategories, marketOpportunities } from "../api.js";
import { profitClass } from "../utils/profit.js";
import NestedCategorySelector from "./NestedCategorySelector.jsx";

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
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [itemsProcessados, setItemsProcessados] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxPrata, setMaxPrata] = useState(""); // Novo: máximo de prata disponível
  const itemsPerPage = 20;

  useEffect(() => {
    console.log("[MarketAnalyzer] 🚀 Iniciando carregamento de categorias...");
    marketCategories()
      .then((d) => {
        console.log("[MarketAnalyzer] ✓ Resposta recebida:", d);
        const cats = d.categories || [];
        console.log(`[MarketAnalyzer] ✓ Categorias carregadas: ${cats.length} categorias`);
        console.log(`[MarketAnalyzer] Primeiras 5: ${cats.slice(0, 5).join(", ")}`);
        setCategories(cats);
        if (cats.length && !cats.includes(categoria)) {
          setCategoria(cats[0]);
        }
      })
      .catch((err) => {
        console.error("[MarketAnalyzer] ❌ Erro ao carregar categorias:", err);
        console.error("[MarketAnalyzer] Usando categorias estáticas como fallback");
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
      });
  }, []);

  const buscar = async () => {
    setScanning(true);
    setLoading(true);
    setErr(null);
    setRows([]);
    setItemsProcessados(0);
    setCurrentPage(1);

    const step = categoria === "Todos" ? 25000 : 1500; // "Todos" processa tudo de uma vez

    try {
      let todas = [];
      let offset = 0;
      let hasMore = true;
      let roundCount = 0;

      while (hasMore) {
        roundCount++;
        console.log(`[Market] Buscando lote ${roundCount} (categoria: ${categoria}, offset: ${offset}, step: ${step})`);
        
        const data = await marketOpportunities({
          categoria,
          offset,
          step,
        });

        const slice = Array.isArray(data) ? data : data.oportunidades || [];
        console.log(`[Market] Lote ${roundCount} retornou ${slice.length} itens`);
        
        todas = [...todas, ...slice];
        setItemsProcessados(offset + slice.length);

        // Se retornou menos itens que o esperado, chegou ao final
        if (slice.length < step) {
          hasMore = false;
        }

        // Deduplicar por (tier + encanto + qualidade + origem + destino)
        const dedupSet = new Set();
        const todasUnicas = [];
        for (const op of todas) {
          const chave = `${op.id}|${op.origem}|${op.destino}`;
          if (!dedupSet.has(chave)) {
            dedupSet.add(chave);
            todasUnicas.push(op);
          }
        }

        // Ordenar por lucro descente e mostrar na tela
        todasUnicas.sort((a, b) => b.lucro - a.lucro);
        setRows(todasUnicas);

        console.log(`[Market] Total acumulado: ${todasUnicas.length} itens únicos`);

        if (!hasMore) break;

        offset += step;
        // Dar mais tempo entre requisições grandes
        const delay = categoria === "Todos" ? 500 : 150;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.log(`[Market] Busca concluída! Total: ${todas.length} brutos, ${rows.length} únicos`);
    } catch (e) {
      console.error(`[Market] Erro na busca:`, e);
      setErr(e.message || String(e));
      setRows([]);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>Arbitragem entre cidades seguras</h2>
      <p className="strategy-hint">
        Compara preços entre cidades seguras; lucro líquido estimado com todas as taxas incluídas.
      </p>
      
      {/* Toolbar */}
      <div className="market-toolbar">
        <div className="categories-wrapper">
          <label className="category-label-text">Categoria</label>
          <NestedCategorySelector
            categories={categories}
            selectedCategory={categoria}
            onCategoryChange={setCategoria}
          />
        </div>

        <div className="max-prata-wrapper">
          <label className="category-label-text">Máx. Prata Disponível</label>
          <input
            type="number"
            value={maxPrata}
            onChange={(e) => setMaxPrata(e.target.value)}
            placeholder="Ex: 100000000"
            className="max-prata-input"
          />
        </div>

        <button type="button" className="btn btn-primary" onClick={buscar} disabled={loading || scanning}>
          {scanning ? "Escaneando…" : "Buscar oportunidades"}
        </button>
      </div>

      <div className="market-progress" style={{ marginBottom: "0.75rem" }}>
        {scanning ? (
          <span>Escaneando... ({itemsProcessados} itens processados, {rows.length} oportunidades encontradas)</span>
        ) : (
          <span>Último escaneamento: {rows.length > 0 ? `Concluído (${rows.length} oportunidades)` : "Aguardando"}</span>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ padding: "0.75rem", backgroundColor: "#1a3a52", borderRadius: "4px", marginBottom: "0.75rem", fontSize: "0.9rem", color: "#aaa" }}>
          <strong style={{ color: "#fff" }}>Dica:</strong> Exibindo {rows.filter((op) => {
            const margem = op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : "0.0";
            const maxPrataNum = maxPrata ? parseInt(maxPrata, 10) : null;
            return parseFloat(margem) <= 200 && (maxPrataNum === null || op.compra <= maxPrataNum);
          }).length} oportunidades {maxPrata ? `com lucro realista e prata ≤ ${parseInt(maxPrata).toLocaleString("pt-PT")}` : "com lucro realista"} ✓
        </div>
      )}

      {err && <p className="error">{err}</p>}
      
      {/* Calcular paginação */}
      {(() => {
        const validRows = rows.filter((op) => {
          const margem = op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : "0.0";
          const margemValida = parseFloat(margem) <= 200;
          
          // Filtro de máximo de prata disponível
          const maxPrataNum = maxPrata ? parseInt(maxPrata, 10) : null;
          const prataValida = maxPrataNum === null || op.compra <= maxPrataNum;
          
          return margemValida && prataValida;
        });
        const totalPages = Math.ceil(validRows.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const pageRows = validRows.slice(startIdx, startIdx + itemsPerPage);

        return (
          <>
            <div className="table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Compra Sell Order</th>
                    <th>Venda Sell Order</th>
                    <th>Venda Buy Order</th>
                    <th>Lucro</th>
                    <th>%</th>
                    <th>Stale</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((op, idx) => {
                    const margem = op.compra > 0 ? ((op.venda / op.compra - 1) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={`${op.id}-${op.origem}-${op.destino}`}>
                        <td style={{ textAlign: "right" }}>{startIdx + idx + 1}</td>
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
                              <div style={{ marginTop: "0.1rem", fontSize: "0.80rem", color: "#aaa", textAlign: "left" }}>
                                <span style={{ color: tierStyle(op.tier), fontWeight: 700 }}>[{op.tier}]</span>
                                <span style={{ marginLeft: "0.4rem" }}>{op.encanto !== "0" ? `.${op.encanto}` : ""} {op.estado}</span>
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
                        <td>
                          <div style={{ fontWeight: 600 }}>{op.buyOrderDestino?.toLocaleString("pt-PT") || "-"}</div>
                          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                            {op.destino} · {timeAgo(op.atualizacaoBuyOrderDest)}
                          </div>
                        </td>
                        <td className={profitClass(op.lucro)} style={{ fontWeight: 700 }}>
                          {op.lucro?.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ textAlign: "right" }}>{margem}%</td>
                        <td style={{ textAlign: "center" }}>{op.desatualizado ? "⚠️" : "✅"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem", padding: "1rem", borderTop: "1px solid #444" }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: "0.5rem 0.75rem", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  ← Anterior
                </button>
                
                <span style={{ margin: "0 1rem" }}>
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: "0.5rem 0.75rem", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Próximo →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {!loading && rows.length === 0 && !err && (
        <p className="market-empty">Carregue uma pesquisa para ver oportunidades.</p>
      )}
    </div>
  );
}
