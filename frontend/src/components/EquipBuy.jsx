import React, { useState, useMemo, useRef, useEffect } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getAllEquipmentCategories, QUALITY_LEVELS } from '../data/equipmentHierarchy.js';

const CIDADES = [
  "Fort Sterling",
  "Lymhurst",
  "Bridgewatch",
  "Martlock",
  "Thetford",
  "Brecilien",
];

// Nível efetivo N = tier_base + enchant (ex: 7 → T7.0, T6.1, T5.2, T4.3)
function nivelEfetivoValido(valor) {
  const n = parseInt(valor, 10);
  return !isNaN(n) && n >= 4 && n <= 12;
}

function labelNivel(n) {
  const combinations = [];
  for (let base = Math.max(4, n - 4); base <= Math.min(8, n); base++) {
    combinations.push(`T${base}.${n - base}`);
  }
  return combinations.join(' = ');
}

const EquipBuy = () => {
  const [searchText, setSearchText] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState("");
  const [qualidade, setQualidade] = useState("1");
  const [nivelEfetivo, setNivelEfetivo] = useState("8");
  const [cidade, setCidade] = useState("Fort Sterling");
  const [resultadosDireto, setResultadosDireto] = useState([]);
  const [resultadosEncantando, setResultadosEncantando] = useState([]);
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
          if (Array.isArray(itens)) itens.forEach(item => items.push(item));
        });
      }
    });
    setTodosOsItens(items);
  }, []);

  const sugestoes = useMemo(() => {
    if (!searchText.trim()) return [];
    const termo = searchText.toLowerCase();
    return todosOsItens.filter(item => item.toLowerCase().includes(termo)).sort().slice(0, 15);
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
    if (!itemSelecionado) { setErro("Selecione um item"); return; }
    if (!nivelEfetivoValido(nivelEfetivo)) { setErro("Nível inválido. Use um número de 4 a 12."); return; }
    setLoading(true);
    setErro(null);
    setResultadosDireto([]);
    setResultadosEncantando([]);
    try {
      const res = await equipBuyOptions({
        equipamentoNome: itemSelecionado,
        nivelEfetivo: parseInt(nivelEfetivo, 10),
        qualidade: parseInt(qualidade),
        cidadeDestino: cidade,
      });
      setResultadosDireto(res?.direto ?? []);
      setResultadosEncantando(res?.encantando ?? []);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar opções');
    } finally {
      setLoading(false);
    }
  };

  const melhorDireto = resultadosDireto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
  const melhorEncantando = resultadosEncantando[0]?.custoFinal ?? Infinity;
  const encantarEMaisBarato = melhorEncantando < melhorDireto;
  const temResultados = resultadosDireto.length > 0 || resultadosEncantando.length > 0;

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return '-';
    return valor.toLocaleString('pt-BR');
  };

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr.startsWith('0001') || dataStr === '') return 'N/A';
    try {
      const iso = (dataStr.includes('Z') || dataStr.includes('+')) ? dataStr : dataStr + 'Z';
      const data = new Date(iso);
      if (isNaN(data.getTime())) return 'N/A';
      const diffMs = Date.now() - data.getTime();
      if (diffMs < 0) return 'agora';
      const diffS = Math.floor(diffMs / 1000);
      if (diffS < 60) return `há ${diffS}s`;
      const diffM = Math.floor(diffS / 60);
      if (diffM < 60) return `há ${diffM}min`;
      const diffH = Math.floor(diffM / 60);
      if (diffH < 24) return `há ${diffH}h`;
      return `há ${Math.floor(diffH / 24)}d`;
    } catch { return 'N/A'; }
  };

  const nivelNum = parseInt(nivelEfetivo, 10);
  const previewLabel = nivelEfetivoValido(nivelEfetivo) ? labelNivel(nivelNum) : '';

  const thStyle = { padding: '0.85rem 1rem', textAlign: 'left', borderBottom: '2px solid #444', fontWeight: 700, fontSize: '0.85rem' };
  const thR = { ...thStyle, textAlign: 'right' };
  const tdStyle = { padding: '0.75rem 1rem', borderBottom: '1px solid #2a2a35' };
  const tdR = { ...tdStyle, textAlign: 'right' };

  return (
    <div className="equip-buy-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Equip Buy</h2>

      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: '1.2rem',
        background: 'rgba(30,30,40,0.85)', borderRadius: 12,
        padding: '1.5rem 1rem', boxShadow: '0 2px 12px #0002', marginBottom: '2rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', alignItems: 'flex-end' }}>

          {/* Autocomplete para Item */}
          <div style={{ position: 'relative' }} ref={searchInputRef}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Nome do Item</span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setSugestoesVisivel(true); if (!e.target.value) setItemSelecionado(""); }}
                onFocus={() => searchText && setSugestoesVisivel(true)}
                placeholder="Ex: Arco de Guerra"
                style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: itemSelecionado ? '1px solid #4caf50' : '1px solid #555', fontSize: '0.95rem', fontFamily: 'inherit' }}
              />
            </label>
            {sugestoesVisivel && sugestoes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', maxHeight: '250px', overflowY: 'auto', zIndex: 100, marginTop: '0.4rem' }}>
                {sugestoes.map((s, i) => (
                  <div key={i} onClick={() => handleSelectSugestao(s)}
                    style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #333', color: s === itemSelecionado ? '#4caf50' : '#ccc', background: s === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent', userSelect: 'none' }}
                    onMouseEnter={e => e.target.style.background = '#333'}
                    onMouseLeave={e => e.target.style.background = s === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent'}
                  >{s}</div>
                ))}
              </div>
            )}
            {searchText && sugestoes.length === 0 && sugestoesVisivel && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, padding: '0.8rem', marginTop: '0.4rem', color: '#888', fontSize: '0.9rem', zIndex: 100 }}>
                Nenhum item encontrado
              </div>
            )}
          </div>

          {/* Nível Efetivo */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>
              Nível Efetivo
              <span style={{ fontWeight: 400, color: '#666', marginLeft: '0.4rem', fontSize: '0.8rem' }}>4 a 12</span>
            </span>
            <input
              type="number"
              min={4} max={12}
              value={nivelEfetivo}
              onChange={e => setNivelEfetivo(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: nivelEfetivoValido(nivelEfetivo) ? '1px solid #4caf50' : '1px solid #555', fontSize: '1.2rem', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
            />
            {previewLabel && (
              <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>{previewLabel}</span>
            )}
          </label>

          {/* Qualidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Qualidade</span>
            <select value={qualidade} onChange={e => setQualidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.95rem', cursor: 'pointer' }}>
              {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </label>

          {/* Cidade */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Minha cidade</span>
            <select value={cidade} onChange={e => setCidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.95rem', cursor: 'pointer' }}>
              {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Botão */}
          <button type="submit" disabled={loading || !itemSelecionado}
            style={{ padding: '0.6rem 1.5rem', borderRadius: 8, background: itemSelecionado ? '#4caf50' : '#666', color: '#fff', fontWeight: 600, fontSize: '0.95rem', border: 'none', cursor: itemSelecionado && !loading ? 'pointer' : 'not-allowed', opacity: itemSelecionado && !loading ? 1 : 0.6, transition: 'all 0.2s' }}
            onMouseEnter={e => itemSelecionado && !loading && (e.target.style.background = '#45a049')}
            onMouseLeave={e => itemSelecionado && !loading && (e.target.style.background = '#4caf50')}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {/* Resultados */}
      <div style={{ marginTop: '2rem' }}>
        {erro && (
          <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, marginBottom: '1rem' }}>
            ⚠️ {erro}
          </div>
        )}
        {!temResultados && !loading && (
          <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            Nenhum resultado ainda. Selecione um item e clique em "Buscar".
          </div>
        )}

        {/* Banner comparativo */}
        {temResultados && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', background: 'rgba(30,30,40,0.9)', borderRadius: 10, border: '1px solid #333', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {melhorDireto !== Infinity && (
              <div>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>Comprar pronto</span>
                <div style={{ color: encantarEMaisBarato ? '#ffb74d' : '#4caf50', fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatarMoeda(melhorDireto)} prata
                  {!encantarEMaisBarato && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>★ mais barato</span>}
                </div>
                <div style={{ color: '#666', fontSize: '0.8rem' }}>
                  {(() => { const m = resultadosDireto.find(r => r.custoFinal > 0); return m ? `${m.tier}.${m.enchant} em ${m.cidadeOrigem}` : ''; })()}
                </div>
              </div>
            )}
            {melhorEncantando !== Infinity && (
              <div>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>Comprar + encantar</span>
                <div style={{ color: encantarEMaisBarato ? '#4caf50' : '#ffb74d', fontWeight: 700, fontSize: '1.1rem' }}>
                  {formatarMoeda(melhorEncantando)} prata
                  {encantarEMaisBarato && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>★ mais barato</span>}
                </div>
                <div style={{ color: '#666', fontSize: '0.8rem' }}>
                  {resultadosEncantando[0]?.tier}.{resultadosEncantando[0]?.enchant} — {resultadosEncantando[0]?.pathDesc}
                </div>
              </div>
            )}
            {melhorDireto !== Infinity && melhorEncantando !== Infinity && (
              <div style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>Economia encantando</span>
                <div style={{ color: encantarEMaisBarato ? '#4caf50' : '#ff6b6b', fontWeight: 700, fontSize: '1.1rem' }}>
                  {encantarEMaisBarato ? '+' : '-'}{formatarMoeda(Math.abs(melhorDireto - melhorEncantando))} prata
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabela: Comprar pronto */}
        {resultadosDireto.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#ccc', fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>
              Comprar pronto
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e', color: '#aaa' }}>
                    <th style={thStyle}>Tier.Enc</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thR}>Preço Item</th>
                    <th style={thR}>Teleporte</th>
                    <th style={{ ...thR, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' }}>TOTAL</th>
                    <th style={{ ...thStyle, textAlign: 'center', fontSize: '0.78rem' }}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosDireto.map((r, i) => {
                    const semPreco = !r.custoFinal || r.custoFinal === 0;
                    const eMelhor = !semPreco && r.custoFinal === melhorDireto;
                    return (
                      <tr key={`${r.tier}.${r.enchant}-${r.cidadeOrigem}`} style={{ background: eMelhor ? 'rgba(76,175,80,0.07)' : i % 2 === 0 ? '#23232e' : '#1a1a22', color: semPreco ? '#444' : '#fff', opacity: semPreco ? 0.5 : 1 }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: eMelhor ? '#4caf50' : semPreco ? '#555' : '#e0e0e0' }}>
                            {eMelhor && '★ '}{r.tier}.{r.enchant}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: semPreco ? '#555' : '#bbb' }}>{r.cidadeOrigem}</td>
                        <td style={{ ...tdR, color: semPreco ? '#555' : '#ddd' }}>{semPreco ? '—' : formatarMoeda(r.preco)}</td>
                        <td style={{ ...tdR, color: r.custoTeleporte === 0 ? '#555' : '#ffb74d', fontWeight: r.custoTeleporte > 0 ? 'bold' : 'normal' }}>
                          {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                        </td>
                        <td style={{ ...tdR, fontWeight: 'bold', color: semPreco ? '#555' : '#4caf50', backgroundColor: eMelhor ? 'rgba(76,175,80,0.12)' : 'transparent' }}>
                          {semPreco ? '—' : formatarMoeda(r.custoFinal)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.78rem', color: '#555' }}>
                          {semPreco ? '—' : formatarData(r.data)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabela: Comprar base + encantar */}
        {resultadosEncantando.length > 0 && (
          <div>
            <h3 style={{ color: '#ccc', fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>
              Comprar base + encantar
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e', color: '#aaa' }}>
                    <th style={thStyle}>Tier.Enc</th>
                    <th style={thStyle}>Estratégia</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thR}>Item Base</th>
                    <th style={thR}>Materiais</th>
                    <th style={thR}>Teleporte</th>
                    <th style={{ ...thR, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosEncantando.map((r, i) => (
                    <tr key={`${r.tier}.${r.enchant}-enc`} style={{ background: i === 0 ? 'rgba(76,175,80,0.07)' : i % 2 === 0 ? '#23232e' : '#1a1a22', color: '#fff' }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: i === 0 ? '#4caf50' : '#e0e0e0' }}>
                          {i === 0 && '★ '}{r.tier}.{r.enchant}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#aaa', fontFamily: 'monospace' }}>
                        {r.pathDesc}
                      </td>
                      <td style={{ ...tdStyle, color: '#bbb' }}>{r.cidadeOrigem}</td>
                      <td style={{ ...tdR, color: '#ddd' }}>{formatarMoeda(r.custoItem)}</td>
                      <td style={{ ...tdR, color: '#ce93d8' }}>{formatarMoeda(r.custoMateriais)}</td>
                      <td style={{ ...tdR, color: r.custoTeleporte === 0 ? '#555' : '#ffb74d', fontWeight: r.custoTeleporte > 0 ? 'bold' : 'normal' }}>
                        {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                      </td>
                      <td style={{ ...tdR, fontWeight: 'bold', color: '#4caf50', backgroundColor: i === 0 ? 'rgba(76,175,80,0.12)' : 'transparent' }}>
                        {formatarMoeda(r.custoFinal)}
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
