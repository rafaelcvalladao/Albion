import React, { useState } from "react";
import { equipBuyOptions } from '../api.js';

const SLOTS = [
  { value: "arma", label: "Arma" },
  { value: "armadura", label: "Armadura" },
  { value: "topo", label: "Topo" },
  { value: "bota", label: "Bota" },
  // Adicione outros slots se necessário
];

const TIERS = ["T4", "T5", "T6", "T7", "T8"];
const CIDADES = [
  "Todos",
  "Caerleon",
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
];

const EquipBuy = () => {
  const [slot, setSlot] = useState(SLOTS[0].value);
  const [tier, setTier] = useState("T7");
  const [cidade, setCidade] = useState("Todos");
  const [equipamento, setEquipamento] = useState("");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // TODO: Buscar lista de equipamentos disponíveis para o slot/tier
  // TODO: Buscar preços e calcular melhor opção

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultados([]);
    try {
      const res = await equipBuyOptions({ slot, tier, cidade, equipamento });
      setResultados(res);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar opções');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="equip-buy-container">
      <h2>Equip Buy</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <label>Slot:</label>
          <select value={slot} onChange={e => setSlot(e.target.value)}>
            {SLOTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Tier desejado:</label>
          <select value={tier} onChange={e => setTier(e.target.value)}>
            {TIERS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Cidade:</label>
          <select value={cidade} onChange={e => setCidade(e.target.value)}>
            {CIDADES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Equipamento:</label>
          <input
            type="text"
            value={equipamento}
            onChange={e => setEquipamento(e.target.value)}
            placeholder="Ex: Claymore, Royal Armor..."
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar Melhor Opção"}
        </button>
      </form>
      <div className="equip-buy-results" style={{ marginTop: '1.5rem' }}>
        {erro && <div style={{ color: 'red' }}>{erro}</div>}
        {resultados.length === 0 && !loading && <div>Nenhum resultado ainda.</div>}
        {resultados.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cidade</th>
                <th>Encantamento</th>
                <th>Preço Item</th>
                <th>Recurso</th>
                <th>Qtd</th>
                <th>Preço Recurso</th>
                <th>Custo Total</th>
                <th>Data</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, i) => (
                <tr key={r.itemId + r.cidade + i}>
                  <td>{r.nome}</td>
                  <td>{r.cidade}</td>
                  <td>{r.encantamento}</td>
                  <td>{r.preco?.toLocaleString('pt-BR') ?? '-'}</td>
                  <td>{r.recurso || '-'}</td>
                  <td>{r.recursoQtd || '-'}</td>
                  <td>{r.precoRecurso?.toLocaleString('pt-BR') ?? '-'}</td>
                  <td style={{ fontWeight: 'bold' }}>{r.custoTotal?.toLocaleString('pt-BR') ?? '-'}</td>
                  <td>{r.data ? r.data.replace('T', ' ') : '-'}</td>
                  <td style={{ fontSize: '0.8em', color: '#888' }}>{r.itemId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EquipBuy;
