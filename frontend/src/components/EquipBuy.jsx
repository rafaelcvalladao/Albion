import React, { useState, useMemo, useRef, useEffect } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getAllEquipmentCategories, QUALITY_LEVELS } from '../data/equipmentHierarchy.js';

const TIERS = ["T4", "T5", "T6", "T7", "T8"];
const CIDADES = [
  "Caerleon",
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
];

const EquipBuy = () => {
  const [searchText, setSearchText] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState("");
  const [qualidade, setQualidade] = useState("1");
  const [tier, setTier] = useState("T7");
  const [cidade, setCidade] = useState("Caerleon");
  const [enchantFilter, setEnchantFilter] = useState("Todos");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sugestoesVisivel, setSugestoesVisivel] = useState(false);
  const [todosOsItens, setTodosOsItens] = useState([]);
  const searchInputRef = useRef(null);

  // Atualizar lista de itens quando EQUIPMENT_HIERARCHY muda
  useEffect(() => {
    const items = [];
    const equipamentos = getAllEquipmentCategories();
    
    equipamentos.forEach(eq => {
      const categoria = EQUIPMENT_HIERARCHY[eq];
      if (categoria && categoria.types) {
        Object.keys(categoria.types).forEach(tipo => {
          const itens = categoria.types[tipo];
          if (Array.isArray(itens)) {
            itens.forEach(item => {
              items.push(item);
            });
          }
        });
      }
    });
    
    setTodosOsItens(items);
    if (items.length > 0) {
      console.log(`✓ ${items.length} itens carregados para busca`);
    }
  }, []);

  // Filtra sugestões baseado no texto de busca
  const sugestoes = useMemo(() => {
    if (!searchText.trim()) return [];
    
    const termo = searchText.toLowerCase();
    return todosOsItens
      .filter(item => item.toLowerCase().includes(termo))
      .sort()
      .slice(0, 15);
  }, [searchText, todosOsItens]);

  // Handler para seleção de sugestão
  const handleSelectSugestao = (item) => {
    setItemSelecionado(item);
    setSearchText(item);
    setSugestoesVisivel(false);
  };

  // Handler para clique fora do autocomplete
  useEffect(() => {
    const handleClickFora = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setSugestoesVisivel(false);
      }
    };

    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemSelecionado) {
      setErro("Selecione um item");
      return;
    }
    
    setLoading(true);
    setErro(null);
    setResultados([]);
    try {
      const res = await equipBuyOptions({ 
        equipamentoNome: itemSelecionado,
        tier,
        qualidade: parseInt(qualidade),
        cidadeDestino: cidade
      });
      console.log('[EquipBuy] Resposta da API:', res);
      if (res && res.length > 0) {
        console.log('[EquipBuy] Primeiro resultado:', res[0]);
      }
      setResultados(res);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar opções');
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return '-';
    return valor.toLocaleString('pt-BR');
  };

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr === '0001-01-01' || dataStr === '') return 'N/A';
    try {
      const data = new Date(dataStr);
      if (isNaN(data.getTime())) return 'N/A';
      return data.toLocaleString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const resultadosFiltrados = resultados.filter(r => {
    if (enchantFilter === 'Todos') return true;
    return String(r.enchant) === enchantFilter;
  });

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
          {/* Autocomplete para Item */}
          <div style={{ position: 'relative' }} ref={searchInputRef}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Nome do Item</span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSugestoesVisivel(true);
                  if (!e.target.value) setItemSelecionado("");
                }}
                onFocus={() => searchText && setSugestoesVisivel(true)}
                placeholder="Digitar nome do item... (ex: Arco de Guerra)"
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: 6,
                  background: '#23232e',
                  color: '#fff',
                  border: itemSelecionado ? '1px solid #4caf50' : '1px solid #555',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
              />
            </label>

            {/* Dropdown de sugestões */}
            {sugestoesVisivel && sugestoes.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#23232e',
                  border: '1px solid #555',
                  borderRadius: 6,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  zIndex: 100,
                  marginTop: '0.4rem',
                }}
              >
                {sugestoes.map((sugestao, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSugestao(sugestao)}
                    style={{
                      padding: '0.6rem 0.8rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #333',
                      color: sugestao === itemSelecionado ? '#4caf50' : '#ccc',
                      background: sugestao === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#333'}
                    onMouseLeave={(e) => {
                      e.target.style.background = sugestao === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent';
                    }}
                  >
                    {sugestao}
                  </div>
                ))}
              </div>
            )}

            {searchText && sugestoes.length === 0 && sugestoesVisivel && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#23232e',
                  border: '1px solid #555',
                  borderRadius: 6,
                  padding: '0.8rem',
                  marginTop: '0.4rem',
                  color: '#888',
                  fontSize: '0.9rem',
                  zIndex: 100,
                }}
              >
                Nenhum item encontrado
              </div>
            )}
          </div>

          {/* Qualidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Qualidade</span>
            <select 
              value={qualidade}
              onChange={e => setQualidade(e.target.value)}
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
              {QUALITY_LEVELS.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
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

          {/* Encantamento (filtro pós-busca) */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Filtrar Encantamento</span>
            <select 
              value={enchantFilter}
              onChange={e => setEnchantFilter(e.target.value)}
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
              <option value="Todos">Todos</option>
              <option value="0">Sem Encantamento</option>
              <option value="1">+1 Encantamento</option>
              <option value="2">+2 Encantamento</option>
              <option value="3">+3 Encantamento</option>
              <option value="4">+4 Encantamento</option>
            </select>
          </label>

          {/* Botão */}
          <button 
            type="submit" 
            disabled={loading || !itemSelecionado}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 8,
              background: itemSelecionado ? '#4caf50' : '#666',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              border: 'none',
              cursor: itemSelecionado && !loading ? 'pointer' : 'not-allowed',
              opacity: itemSelecionado && !loading ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => itemSelecionado && !loading && (e.target.style.background = '#45a049')}
            onMouseLeave={e => itemSelecionado && !loading && (e.target.style.background = '#4caf50')}
          >
            {loading ? "Buscando..." : "Buscar Melhor Opção"}
          </button>
        </div>
      </form>

      <div className="equip-buy-results" style={{ marginTop: '2rem' }}>
        {erro && <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, marginBottom: '1rem' }}>⚠️ {erro}</div>}
        {resultados.length === 0 && !loading && <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Nenhum resultado ainda. Selecione um item e clique em "Buscar".</div>}
        {resultados.length > 0 && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(76,175,80,0.15)', borderRadius: 8, borderLeft: '3px solid #4caf50' }}>
              <div style={{ color: '#4caf50', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                ✓ {resultadosFiltrados.length} de {resultados.length} opções encontradas
              </div>
              <div style={{ color: '#8bc34a', fontSize: '0.95rem' }}>
                💰 Melhor preço: <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{formatarMoeda(resultadosFiltrados[0]?.custoFinal)} prata</span>
                {resultadosFiltrados[0]?.custoTeleporte > 0 && 
                  <span> (item: {formatarMoeda(resultadosFiltrados[0]?.preco)} + teleporte: {formatarMoeda(resultadosFiltrados[0]?.custoTeleporte)})</span>
                }
              </div>
              {/* Debug: mostrar primeiro resultado */}
              <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 4, color: '#888', fontFamily: 'monospace' }}>
                DEBUG: {resultadosFiltrados[0] ? `cidade="${resultadosFiltrados[0].cidadeOrigem}" preco=${resultadosFiltrados[0].preco} teleporte=${resultadosFiltrados[0].custoTeleporte} data="${resultadosFiltrados[0].data}"` : 'sem dados'}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e', color: '#fff' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #444', fontWeight: 700 }}>Item</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #444', fontWeight: 700 }}>✨ Enc.</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #444', fontWeight: 700 }}>De Cidade</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700 }} title="Preço base do item">Preço Item</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700 }} title="Custo de teleporte (0 = mesma cidade)">Taxa Teleporte</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.1)' }} title="Preço final = item + teleporte">💚 TOTAL</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #444', fontWeight: 700, fontSize: '0.85rem' }}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosFiltrados.length > 0 ? resultadosFiltrados.map((r, i) => (
                    <tr key={r.itemId + r.cidadeOrigem + i} style={{ 
                      background: i % 2 === 0 ? '#23232e' : '#1a1a22', 
                      color: '#fff', 
                      borderBottom: '1px solid #333',
                      hover: { background: '#2a2a35' }
                    }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{r.nome}</div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: 'bold', color: r.enchant > 0 ? '#ffd700' : '#888', fontSize: '0.95rem' }}>
                        {r.enchant === 0 ? '—' : `+${r.enchant}`}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: '#bbb' }}>
                        {r.cidadeOrigem || 'N/A'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', color: '#ddd' }}>
                        {formatarMoeda(r.preco)}
                      </td>
                      <td style={{ 
                        padding: '0.9rem 1rem', 
                        textAlign: 'right', 
                        color: r.custoTeleporte === 0 ? '#888' : '#ffb74d',
                        fontWeight: r.custoTeleporte === 0 ? 'normal' : 'bold'
                      }}>
                        {r.custoTeleporte === 0 ? '(mesma cidade)' : formatarMoeda(r.custoTeleporte)}
                      </td>
                      <td style={{ 
                        padding: '0.9rem 1rem', 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: '#4caf50',
                        backgroundColor: i === 0 ? 'rgba(76,175,80,0.15)' : 'transparent',
                        fontSize: '1rem'
                      }}>
                        {formatarMoeda(r.custoFinal)}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                        {formatarData(r.data)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                        Nenhum resultado para o filtro de encantamento selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipBuy;
