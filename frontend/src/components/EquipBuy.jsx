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
    <div className="equip-buy-container" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Equip Buy</h2>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        background: 'rgba(30,30,40,0.85)',
        borderRadius: 12,
        padding: '1.5rem 1rem',
        boxShadow: '0 2px 12px #0002',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500 }}>
            Slot:
            <select value={slot} onChange={e => setSlot(e.target.value)} style={{ minWidth: 120, padding: 6, borderRadius: 6 }}>
              {SLOTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500 }}>
            Tier desejado:
            <select value={tier} onChange={e => setTier(e.target.value)} style={{ minWidth: 80, padding: 6, borderRadius: 6 }}>
              {TIERS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500 }}>
            Cidade:
            <select value={cidade} onChange={e => setCidade(e.target.value)} style={{ minWidth: 140, padding: 6, borderRadius: 6 }}>
              {CIDADES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500, flex: 1 }}>
            Equipamento:
            <input
              type="text"
              value={equipamento}
              onChange={e => setEquipamento(e.target.value)}
              placeholder="Ex: Claymore, Royal Armor..."
              style={{ padding: 6, borderRadius: 6, width: '100%' }}
            />
          </label>
          <button type="submit" disabled={loading} style={{
            padding: '0.7rem 1.2rem',
            borderRadius: 8,
            background: '#4caf50',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginTop: 24,
            minWidth: 180,
          }}>
            {loading ? "Buscando..." : "Buscar Melhor Opção"}
          </button>
        </div>
      </form>
      <div className="equip-buy-results" style={{ marginTop: '1.5rem' }}>
        {erro && <div style={{ color: 'red' }}>{erro}</div>}
        {resultados.length === 0 && !loading && <div>Nenhum resultado ainda.</div>}
        {resultados.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#23232e', color: '#fff' }}>
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
                <tr key={r.itemId + r.cidade + i} style={{ background: i % 2 === 0 ? '#23232e' : '#181820', color: '#fff' }}>
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
