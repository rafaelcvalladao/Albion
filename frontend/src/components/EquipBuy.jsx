import React, { useState, useMemo, useRef, useEffect } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getAllEquipmentCategories, QUALITY_LEVELS } from '../data/equipmentHierarchy.js';

const CIDADES = [
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
  "Brecilien",
];

function parseTierEnchant(valor) {
  const match = valor.trim().match(/^([4-8])\.([0-4])$/);
  if (!match) return null;
  return { tier: `T${match[1]}`, encantamento: match[2] };
}

const EquipBuy = () => {
  const [searchText, setSearchText] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState("");
  const [qualidade, setQualidade] = useState("1");
  const [tierEnchant, setTierEnchant] = useState("7.0");
  const [cidade, setCidade] = useState("Bridgewatch");
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [sugestoesVisivel, setSugestoesVisivel] = useState(false);
  const [todosOsItens, setTodosOsItens] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const items = [];
    const equipamentos = getAllEquipmentCategories();
    equipamentos.forEach(eq => {
      const categoria = EQUIPMENT_HIERARCHY[eq];
      if (categoria && categoria.types) {
        Object.keys(categoria.types).forEach(tipo => {
          const itens = categoria.types[tipo];
          if (Array.isArray(itens)) {
            itens.forEach(item => items.push(item));
          }
        });
      }
    });
    setTodosOsItens(items);
  }, []);

  const sugestoes = useMemo(() => {
    if (!searchText.trim()) return [];
    const termo = searchText.toLowerCase();
    return todosOsItens
      .filter(item => item.toLowerCase().includes(termo))
      .sort()
      .slice(0, 15);
  }, [searchText, todosOsItens]);

  const handleSelectSugestao = (item) => {
    setItemSelecionado(item);
    setSearchText(item);
    setSugestoesVisivel(false);
  };

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
    const parsed = parseTierEnchant(tierEnchant);
    if (!parsed) {
      setErro("Formato inválido. Use tier.encantamento (ex: 7.3, 5.0, 8.4)");
      return;
    }
    setLoading(true);
    setErro(null);
    setResultados([]);
    try {
      const res = await equipBuyOptions({
        equipamentoNome: itemSelecionado,
        tier: parsed.tier,
        qualidade: parseInt(qualidade),
        cidadeDestino: cidade,
        encantamento: parsed.encantamento,
      });
      setResultados(res);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar opções');
    } finally {
      setLoading(false);
    }
  };

  // Uma linha por cidade, a de menor custo total (resultados já vêm ordenados pelo backend)
  const resultadosPorCidade = Object.values(
    resultados.reduce((acc, r) => {
      if (!acc[r.cidadeOrigem]) acc[r.cidadeOrigem] = r;
      return acc;
    }, {})
  ).sort((a, b) => a.custoFinal - b.custoFinal);

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
                placeholder="Ex: Arco de Guerra"
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

            {sugestoesVisivel && sugestoes.length > 0 && (
              <div style={{
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
              }}>
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
              <div style={{
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
              }}>
                Nenhum item encontrado
              </div>
            )}
          </div>

          {/* Tier.Encantamento */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>
              Tier.Encantamento
              <span style={{ fontWeight: 400, color: '#666', marginLeft: '0.4rem' }}>ex: 7.3 · 5.0 · 8.4</span>
            </span>
            <input
              type="text"
              value={tierEnchant}
              onChange={e => setTierEnchant(e.target.value)}
              placeholder="7.0"
              maxLength={3}
              style={{
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                background: '#23232e',
                color: '#fff',
                border: parseTierEnchant(tierEnchant) ? '1px solid #4caf50' : '1px solid #555',
                fontSize: '1.1rem',
                fontFamily: 'monospace',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {/* Qualidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Qualidade</span>
            <select
              value={qualidade}
              onChange={e => setQualidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </label>

          {/* Cidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Minha cidade</span>
            <select
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
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
            {loading ? "Buscando..." : "Buscar Melhor Preço"}
          </button>
        </div>
      </form>

      <div className="equip-buy-results" style={{ marginTop: '2rem' }}>
        {erro && (
          <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, marginBottom: '1rem' }}>
            ⚠️ {erro}
          </div>
        )}
        {resultadosPorCidade.length === 0 && !loading && (
          <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            Nenhum resultado ainda. Selecione um item e clique em "Buscar".
          </div>
        )}
        {resultadosPorCidade.length > 0 && (
          <div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(76,175,80,0.15)', borderRadius: 8, borderLeft: '3px solid #4caf50' }}>
              <div style={{ color: '#4caf50', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                ✓ {resultadosPorCidade.length} cidades encontradas
              </div>
              <div style={{ color: '#8bc34a', fontSize: '0.95rem' }}>
                Melhor preço: <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{formatarMoeda(resultadosPorCidade[0]?.custoFinal)} prata</span>
                {' '}em <span style={{ fontWeight: 'bold', color: '#fff' }}>{resultadosPorCidade[0]?.cidadeOrigem}</span>
                {resultadosPorCidade[0]?.custoTeleporte > 0 && (
                  <span style={{ color: '#aaa', fontSize: '0.88rem' }}>{' '}(item: {formatarMoeda(resultadosPorCidade[0]?.preco)} + teleporte: {formatarMoeda(resultadosPorCidade[0]?.custoTeleporte)})</span>
                )}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e', color: '#fff' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #444', fontWeight: 700 }}>Cidade</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #444', fontWeight: 700 }}>Enc.</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700 }}>Preço Item</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700 }}>Teleporte</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #444', fontWeight: 700, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.1)' }}>TOTAL</th>
                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #444', fontWeight: 700, fontSize: '0.85rem' }}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosPorCidade.map((r, i) => (
                    <tr
                      key={r.cidadeOrigem}
                      style={{
                        background: i === 0 ? 'rgba(76,175,80,0.08)' : i % 2 === 0 ? '#23232e' : '#1a1a22',
                        color: '#fff',
                        borderBottom: '1px solid #333',
                      }}
                    >
                      <td style={{ padding: '0.9rem 1rem', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#4caf50' : '#bbb' }}>
                        {i === 0 && '★ '}{r.cidadeOrigem || 'N/A'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontWeight: 'bold', color: r.enchant > 0 ? '#ffd700' : '#888' }}>
                        {r.enchant === 0 ? '—' : `+${r.enchant}`}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', color: '#ddd' }}>
                        {formatarMoeda(r.preco)}
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem',
                        textAlign: 'right',
                        color: r.custoTeleporte === 0 ? '#888' : '#ffb74d',
                        fontWeight: r.custoTeleporte === 0 ? 'normal' : 'bold',
                      }}>
                        {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                      </td>
                      <td style={{
                        padding: '0.9rem 1rem',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#4caf50',
                        backgroundColor: i === 0 ? 'rgba(76,175,80,0.15)' : 'transparent',
                        fontSize: '1rem',
                      }}>
                        {formatarMoeda(r.custoFinal)}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
                        {formatarData(r.data)}
                      </td>
                    </tr>
                  ))}
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
