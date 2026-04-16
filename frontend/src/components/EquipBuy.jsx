import React, { useState, useMemo } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getTypesForEquipment, getVariantsForEquipmentType, getAllEquipmentCategories } from '../data/equipmentHierarchy.js';

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
  const [equipamento, setEquipamento] = useState("");
  const [tipo, setTipo] = useState("");
  const [variante, setVariante] = useState("");
  const [tier, setTier] = useState("T7");
  const [cidade, setCidade] = useState("Todos");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // Obter categorias
  const equipamentos = useMemo(() => getAllEquipmentCategories(), []);
  
  // Obter tipos baseado no equipamento selecionado
  const tipos = useMemo(() => {
    return equipamento ? getTypesForEquipment(equipamento) : [];
  }, [equipamento]);
  
  // Obter variantes baseado no tipo selecionado
  const variantes = useMemo(() => {
    return equipamento && tipo ? getVariantsForEquipmentType(equipamento, tipo) : [];
  }, [equipamento, tipo]);

  // Reset dos campos dependentes quando equipamento muda
  const handleEquipamentoChange = (e) => {
    setEquipamento(e.target.value);
    setTipo("");
    setVariante("");
  };

  // Reset da variante quando tipo muda
  const handleTipoChange = (e) => {
    setTipo(e.target.value);
    setVariante("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!variante) {
      setErro("Selecione um equipamento completo");
      return;
    }
    
    setLoading(true);
    setErro(null);
    setResultados([]);
    try {
      // Mapeando para o slot esperado pela API
      const slot = equipamento.toLowerCase();
      const res = await equipBuyOptions({ slot, tier, cidade, equipamento: variante });
      setResultados(res);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar opções');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="equip-buy-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
          {/* Equipamento (Categoria Principal) */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Equipamento</span>
            <select 
              value={equipamento} 
              onChange={handleEquipamentoChange}
              style={{ 
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: '#23232e',
                color: '#fff',
                border: '1px solid #555',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              <option value="">Selecionar...</option>
              {equipamentos.map(eq => (
                <option key={eq} value={eq}>{EQUIPMENT_HIERARCHY[eq].label}</option>
              ))}
            </select>
          </label>

          {/* Tipo (Subcategoria) */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Tipo</span>
            <select 
              value={tipo}
              onChange={handleTipoChange}
              disabled={!equipamento}
              style={{ 
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: equipamento ? '#23232e' : '#1a1a22',
                color: equipamento ? '#fff' : '#888',
                border: '1px solid #555',
                fontSize: '0.95rem',
                cursor: equipamento ? 'pointer' : 'not-allowed',
                opacity: equipamento ? 1 : 0.6,
              }}
            >
              <option value="">Selecionar...</option>
              {tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {/* Variante (Item Específico) */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Item Específico</span>
            <select 
              value={variante}
              onChange={e => setVariante(e.target.value)}
              disabled={!tipo}
              style={{ 
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: tipo ? '#23232e' : '#1a1a22',
                color: tipo ? '#fff' : '#888',
                border: '1px solid #555',
                fontSize: '0.95rem',
                cursor: tipo ? 'pointer' : 'not-allowed',
                opacity: tipo ? 1 : 0.6,
              }}
            >
              <option value="">Selecionar...</option>
              {variantes.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>

          {/* Tier */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Tier desejado</span>
            <select 
              value={tier} 
              onChange={e => setTier(e.target.value)}
              style={{ 
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: '#23232e',
                color: '#fff',
                border: '1px solid #555',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {TIERS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {/* Cidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Cidade</span>
            <select 
              value={cidade} 
              onChange={e => setCidade(e.target.value)}
              style={{ 
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: '#23232e',
                color: '#fff',
                border: '1px solid #555',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              {CIDADES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* Botão */}
          <button 
            type="submit" 
            disabled={loading || !variante}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 8,
              background: variante ? '#4caf50' : '#666',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              border: 'none',
              cursor: variante && !loading ? 'pointer' : 'not-allowed',
              opacity: variante && !loading ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => variante && !loading && (e.target.style.background = '#45a049')}
            onMouseLeave={e => variante && !loading && (e.target.style.background = '#4caf50')}
          >
            {loading ? "Buscando..." : "Buscar Melhor Opção"}
          </button>
        </div>
      </form>

      <div className="equip-buy-results" style={{ marginTop: '2rem' }}>
        {erro && <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, marginBottom: '1rem' }}>⚠️ {erro}</div>}
        {resultados.length === 0 && !loading && <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Nenhum resultado ainda. Selecione um equipamento e clique em "Buscar".</div>}
        {resultados.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#23232e', color: '#fff' }}>
                  <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #333' }}>Nome</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #333' }}>Cidade</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #333' }}>Encantamento</th>
                  <th style={{ padding: '0.8rem', textAlign: 'right', borderBottom: '1px solid #333' }}>Preço Item</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #333' }}>Recurso</th>
                  <th style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #333' }}>Qtd</th>
                  <th style={{ padding: '0.8rem', textAlign: 'right', borderBottom: '1px solid #333' }}>Preço Recurso</th>
                  <th style={{ padding: '0.8rem', textAlign: 'right', borderBottom: '1px solid #333', color: '#4caf50' }}>Custo Total</th>
                  <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #333', fontSize: '0.85rem' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((r, i) => (
                  <tr key={r.itemId + r.cidade + i} style={{ background: i % 2 === 0 ? '#23232e' : '#1a1a22', color: '#fff', borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '0.8rem' }}>{r.nome}</td>
                    <td style={{ padding: '0.8rem' }}>{r.cidade}</td>
                    <td style={{ padding: '0.8rem' }}>{r.encantamento}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>{r.preco?.toLocaleString('pt-BR') ?? '-'}</td>
                    <td style={{ padding: '0.8rem' }}>{r.recurso || '-'}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'center' }}>{r.recursoQtd || '-'}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>{r.precoRecurso?.toLocaleString('pt-BR') ?? '-'}</td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 'bold', color: '#4caf50' }}>{r.custoTotal?.toLocaleString('pt-BR') ?? '-'}</td>
                    <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: '#888' }}>{r.data ? r.data.replace('T', ' ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
};

export default EquipBuy;
