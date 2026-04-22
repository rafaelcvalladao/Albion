import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getAllEquipmentCategories, QUALITY_LEVELS } from '../data/equipmentHierarchy.js';

const CIDADES = [
  "Fort Sterling", "Lymhurst", "Bridgewatch", "Martlock", "Thetford", "Brecilien",
];

const SLOTS = [
  { key: 'topo',  label: 'Topo',  sub: 'Capacete' },
  { key: 'meio',  label: 'Meio',  sub: 'Peitoral' },
  { key: 'baixo', label: 'Baixo', sub: 'Sapatos'  },
  { key: 'capa',  label: 'Capa',  sub: 'Capa'     },
];

function nivelEfetivoValido(valor) {
  const n = parseInt(valor, 10);
  return !isNaN(n) && n >= 4 && n <= 12;
}

function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '—';
  return valor.toLocaleString('pt-BR');
}

function formatarData(dataStr) {
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
}

function buildTodosOsItens() {
  const items = [];
  const equipamentos = getAllEquipmentCategories();
  equipamentos.forEach(eq => {
    const categoria = EQUIPMENT_HIERARCHY[eq];
    if (categoria?.types) {
      Object.values(categoria.types).forEach(lista => {
        if (Array.isArray(lista)) lista.forEach(item => items.push(item));
      });
    }
  });
  return items;
}

function filtrarSugestoes(texto, todosOsItens, limite = 15) {
  if (!texto.trim()) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(Boolean);
  return todosOsItens
    .filter(item => palavras.every(p => item.toLowerCase().includes(p)))
    .sort()
    .slice(0, limite);
}

// ─── AutocompleteInput reutilizável ───
function AutocompleteInput({ value, onChange, onSelect, placeholder, todosOsItens, style = {} }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const sugestoes = useMemo(() => filtrarSugestoes(value, todosOsItens), [value, todosOsItens]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ position: 'relative', ...style }} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => value && setAberto(true)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
      {aberto && sugestoes.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 200, marginTop: 2 }}>
          {sugestoes.map((s, i) => (
            <div key={i}
              onMouseDown={() => { onSelect(s); setAberto(false); }}
              style={{ padding: '0.5rem 0.7rem', cursor: 'pointer', borderBottom: '1px solid #333', color: s === value ? '#4caf50' : '#ccc', fontSize: '0.88rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#333'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de gerenciar conjuntos ───
function GerenciarModal({ conjuntos, setConjuntos, todosOsItens, onClose }) {
  const EMPTY_FORM = { name: '', nivel: '8', qualidade: '1', cidade: 'Fort Sterling', slots: { topo: '', meio: '', baixo: '', capa: '' } };
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const salvar = () => {
    if (!form.name.trim()) return;
    if (editingId != null) {
      setConjuntos(prev => prev.map(c => c.id === editingId ? { ...form, id: editingId } : c));
    } else {
      setConjuntos(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const excluir = (id) => setConjuntos(prev => prev.filter(c => c.id !== id));

  const editar = (c) => { setForm({ name: c.name, nivel: c.nivel, qualidade: c.qualidade, cidade: c.cidade, slots: { ...c.slots } }); setEditingId(c.id); };

  const cancelarEdicao = () => { setForm(EMPTY_FORM); setEditingId(null); };

  const setSlot = (key, val) => setForm(f => ({ ...f, slots: { ...f.slots, [key]: val } }));

  const inputStyle = { padding: '0.5rem 0.7rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a24', border: '1px solid #333', borderRadius: 12, padding: '1.5rem', maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0, color: '#e0e0e0' }}>Conjuntos de Equipamentos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Lista de conjuntos existentes */}
        {conjuntos.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salvos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {conjuntos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: editingId === c.id ? 'rgba(76,175,80,0.08)' : '#23232e', borderRadius: 8, padding: '0.5rem 0.75rem', border: editingId === c.id ? '1px solid #4caf50' : '1px solid transparent' }}>
                  <span style={{ flex: 1, color: '#e0e0e0', fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>T{c.nivel} · {QUALITY_LEVELS.find(q => q.value === c.qualidade)?.label ?? c.qualidade} · {c.cidade.split(' ').map(w => w[0]).join('')}</span>
                  <button onClick={() => editar(c)} style={{ padding: '0.25rem 0.6rem', borderRadius: 4, background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', fontSize: '0.8rem' }}>Editar</button>
                  <button onClick={() => excluir(c.id)} style={{ padding: '0.25rem 0.6rem', borderRadius: 4, background: 'rgba(255,100,100,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,100,100,0.3)', cursor: 'pointer', fontSize: '0.8rem' }}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário criar / editar */}
        <div style={{ background: '#23232e', borderRadius: 10, padding: '1rem', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.82rem', color: editingId != null ? '#4caf50' : '#888', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {editingId != null ? 'Editando conjunto' : 'Novo conjunto'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Nome</span>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Arqueiro PvP" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Nível</span>
              <input style={inputStyle} type="number" min={4} max={12} value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Qualidade</span>
              <select style={inputStyle} value={form.qualidade} onChange={e => setForm(f => ({ ...f, qualidade: e.target.value }))}>
                {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Minha cidade</span>
              <select style={inputStyle} value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}>
                {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
            {SLOTS.map(slot => (
              <label key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{slot.label} <span style={{ color: '#666' }}>({slot.sub})</span></span>
                <AutocompleteInput
                  value={form.slots[slot.key]}
                  onChange={val => setSlot(slot.key, val)}
                  onSelect={val => setSlot(slot.key, val)}
                  placeholder={`Ex: ${slot.label === 'Capa' ? 'Capa Simples' : slot.label === 'Topo' ? 'Elmo de Placa' : slot.label === 'Meio' ? 'Armadura de Placa' : 'Botas de Placa'}`}
                  todosOsItens={todosOsItens}
                />
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            {editingId != null && (
              <button onClick={cancelarEdicao} style={{ padding: '0.5rem 1rem', borderRadius: 6, background: '#333', color: '#aaa', border: '1px solid #444', cursor: 'pointer', fontSize: '0.9rem' }}>Cancelar</button>
            )}
            <button onClick={salvar} disabled={!form.name.trim()}
              style={{ padding: '0.5rem 1.2rem', borderRadius: 6, background: form.name.trim() ? '#4caf50' : '#444', color: '#fff', border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.9rem', opacity: form.name.trim() ? 1 : 0.6 }}>
              {editingId != null ? 'Salvar alterações' : 'Criar conjunto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de resultado de slot (conjunto) ───
function SlotResultCard({ slot, slotData }) {
  if (!slotData) {
    return (
      <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '1rem', minHeight: 120, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{slot.label} · {slot.sub}</div>
        <div style={{ color: '#555', fontSize: '0.85rem', marginTop: 'auto' }}>— não configurado —</div>
      </div>
    );
  }

  const { item, direto, encantando, erro } = slotData;
  const melhorDireto = direto.find(r => r.custoFinal > 0);
  const melhorEnc = encantando[0]?.custoFinal > 0 ? encantando[0] : null;

  const custoDireto = melhorDireto?.custoFinal ?? Infinity;
  const custoEnc = melhorEnc?.custoFinal ?? Infinity;
  const usarEnc = custoEnc < custoDireto;
  const melhor = usarEnc ? melhorEnc : melhorDireto;
  const custoFinal = melhor?.custoFinal ?? null;

  return (
    <div style={{ background: '#1a1a24', border: custoFinal ? '1px solid #2a3a2a' : '1px solid #2a2a35', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{slot.label} · {slot.sub}</div>
      <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{item}</div>

      {erro ? (
        <div style={{ color: '#ff6b6b', fontSize: '0.82rem', marginTop: '0.5rem' }}>Erro ao buscar</div>
      ) : !melhor ? (
        <div style={{ color: '#666', fontSize: '0.82rem', marginTop: '0.5rem' }}>Sem dados disponíveis</div>
      ) : (
        <>
          <div style={{ marginTop: '0.4rem', padding: '0.6rem 0.7rem', background: 'rgba(76,175,80,0.1)', borderRadius: 7, border: '1px solid rgba(76,175,80,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#4caf50', fontWeight: 700 }}>
                {usarEnc ? '★ Comprar + encantar' : '★ Comprar pronto'}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#aaa' }}>
                {melhor.tier}.{melhor.enchant}
              </span>
            </div>
            <div style={{ color: '#4caf50', fontWeight: 700, fontSize: '1.05rem' }}>
              {formatarMoeda(custoFinal)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888' }}>prata</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#777', marginTop: '0.2rem' }}>
              {melhor.cidadeOrigem}
              {usarEnc && melhor.pathDesc && <span> · {melhor.pathDesc}</span>}
            </div>
          </div>

          {/* Alternativa */}
          {!usarEnc && melhorEnc && (
            <div style={{ fontSize: '0.75rem', color: '#666', paddingLeft: '0.2rem' }}>
              Encantar: {formatarMoeda(custoEnc)} prata
            </div>
          )}
          {usarEnc && melhorDireto && (
            <div style={{ fontSize: '0.75rem', color: '#666', paddingLeft: '0.2rem' }}>
              Pronto: {formatarMoeda(custoDireto)} prata
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Componente principal ───
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

  // Conjuntos
  const [conjuntos, setConjuntos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('albion-equip-conjuntos') || '[]'); }
    catch { return []; }
  });
  const [showGerenciarModal, setShowGerenciarModal] = useState(false);
  const [conjuntoResultados, setConjuntoResultados] = useState(null);
  const [conjuntoLoading, setConjuntoLoading] = useState(false);
  const [conjuntoAtivo, setConjuntoAtivo] = useState(null);

  useEffect(() => {
    localStorage.setItem('albion-equip-conjuntos', JSON.stringify(conjuntos));
  }, [conjuntos]);

  useEffect(() => {
    setTodosOsItens(buildTodosOsItens());
  }, []);

  const sugestoes = useMemo(() => filtrarSugestoes(searchText, todosOsItens), [searchText, todosOsItens]);

  const handleSelectSugestao = (item) => {
    setItemSelecionado(item);
    setSearchText(item);
    setSugestoesVisivel(false);
  };

  useEffect(() => {
    const handleClickFora = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target))
        setSugestoesVisivel(false);
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
    setConjuntoResultados(null);
    setConjuntoAtivo(null);
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

  const buscarConjunto = useCallback(async (conjunto) => {
    setConjuntoLoading(true);
    setConjuntoAtivo(conjunto.name);
    setConjuntoResultados(null);
    setResultadosDireto([]);
    setResultadosEncantando([]);
    setErro(null);

    const resultados = {};
    await Promise.all(SLOTS.map(async (slot) => {
      const itemName = conjunto.slots[slot.key];
      if (!itemName) { resultados[slot.key] = null; return; }
      try {
        const res = await equipBuyOptions({
          equipamentoNome: itemName,
          nivelEfetivo: parseInt(conjunto.nivel, 10),
          qualidade: parseInt(conjunto.qualidade),
          cidadeDestino: conjunto.cidade,
        });
        resultados[slot.key] = { item: itemName, direto: res?.direto ?? [], encantando: res?.encantando ?? [] };
      } catch {
        resultados[slot.key] = { item: itemName, direto: [], encantando: [], erro: true };
      }
    }));

    setConjuntoResultados(resultados);
    setConjuntoLoading(false);
  }, []);

  const melhorDireto = resultadosDireto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
  const melhorEncantando = resultadosEncantando[0]?.custoFinal ?? Infinity;
  const encantarEMaisBarato = melhorEncantando < melhorDireto;
  const temResultados = resultadosDireto.length > 0 || resultadosEncantando.length > 0;

  const thStyle = { padding: '0.85rem 1rem', textAlign: 'left', borderBottom: '2px solid #444', fontWeight: 700, fontSize: '0.85rem' };
  const thR = { ...thStyle, textAlign: 'right' };
  const tdStyle = { padding: '0.75rem 1rem', borderBottom: '1px solid #2a2a35' };
  const tdR = { ...tdStyle, textAlign: 'right' };

  const conjuntoAtivoData = conjuntos.find(c => c.name === conjuntoAtivo);
  const totalConjunto = conjuntoResultados
    ? SLOTS.reduce((sum, slot) => {
        const d = conjuntoResultados[slot.key];
        if (!d || d.erro) return sum;
        const custoDireto = d.direto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
        const custoEnc = d.encantando[0]?.custoFinal > 0 ? d.encantando[0].custoFinal : Infinity;
        const melhor = Math.min(custoDireto, custoEnc);
        return melhor === Infinity ? sum : sum + melhor;
      }, 0)
    : null;

  return (
    <div className="equip-buy-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Equip Buy</h2>
        <button onClick={() => setShowGerenciarModal(true)}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 8, background: '#333', color: '#ccc', border: '1px solid #444', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          Gerenciar Conjuntos
        </button>
      </div>

      {/* Conjuntos salvos */}
      {conjuntos.length > 0 && (
        <div style={{ background: 'rgba(30,30,40,0.85)', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1.5rem', border: '1px solid #2a2a35' }}>
          <div style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Conjuntos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {conjuntos.map(c => (
              <button key={c.id} onClick={() => buscarConjunto(c)} disabled={conjuntoLoading}
                style={{ padding: '0.45rem 1rem', borderRadius: 20, background: conjuntoAtivo === c.name ? '#4caf50' : '#23232e', color: conjuntoAtivo === c.name ? '#fff' : '#ccc', border: conjuntoAtivo === c.name ? '1px solid #4caf50' : '1px solid #444', cursor: conjuntoLoading ? 'not-allowed' : 'pointer', fontWeight: conjuntoAtivo === c.name ? 700 : 400, fontSize: '0.88rem', transition: 'all 0.15s' }}>
                {c.name}
                <span style={{ fontSize: '0.72rem', marginLeft: '0.4rem', opacity: 0.7 }}>T{c.nivel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulário busca individual */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'rgba(30,30,40,0.85)', borderRadius: 12, padding: '1.5rem 1rem', boxShadow: '0 2px 12px #0002', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', alignItems: 'flex-end' }}>

          {/* Autocomplete item */}
          <div style={{ position: 'relative' }} ref={searchInputRef}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ccc' }}>Nome do Item</span>
              <input type="text" value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setSugestoesVisivel(true); if (!e.target.value) setItemSelecionado(""); }}
                onFocus={() => searchText && setSugestoesVisivel(true)}
                placeholder="Ex: Arco Guerra"
                style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: itemSelecionado ? '1px solid #4caf50' : '1px solid #555', fontSize: '0.95rem', fontFamily: 'inherit' }}
              />
            </label>
            {sugestoesVisivel && sugestoes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', maxHeight: 250, overflowY: 'auto', zIndex: 100, marginTop: '0.4rem' }}>
                {sugestoes.map((s, i) => (
                  <div key={i} onClick={() => handleSelectSugestao(s)}
                    style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #333', color: s === itemSelecionado ? '#4caf50' : '#ccc', background: s === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent', userSelect: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#333'}
                    onMouseLeave={e => e.currentTarget.style.background = s === itemSelecionado ? 'rgba(76,175,80,0.1)' : 'transparent'}
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
            <input type="number" min={4} max={12} value={nivelEfetivo}
              onChange={e => setNivelEfetivo(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: nivelEfetivoValido(nivelEfetivo) ? '1px solid #4caf50' : '1px solid #555', fontSize: '1.2rem', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
            />
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
          >{loading ? "Buscando..." : "Buscar"}</button>
        </div>
      </form>

      {/* Resultados de conjunto */}
      {(conjuntoLoading || conjuntoResultados) && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '1.05rem' }}>{conjuntoAtivo}</span>
              {conjuntoAtivoData && (
                <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: '#888' }}>
                  Nível {conjuntoAtivoData.nivel} · {QUALITY_LEVELS.find(q => q.value === conjuntoAtivoData.qualidade)?.label} · {conjuntoAtivoData.cidade}
                </span>
              )}
            </div>
            {totalConjunto > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#888' }}>Total mínimo</div>
                <div style={{ color: '#4caf50', fontWeight: 700, fontSize: '1.1rem' }}>{formatarMoeda(totalConjunto)} prata</div>
              </div>
            )}
          </div>

          {conjuntoLoading ? (
            <div style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Buscando preços…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {SLOTS.map(slot => (
                <SlotResultCard key={slot.key} slot={slot} slotData={conjuntoResultados[slot.key]} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resultados busca individual */}
      <div>
        {erro && (
          <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8, marginBottom: '1rem' }}>
            ⚠️ {erro}
          </div>
        )}
        {!temResultados && !loading && !conjuntoResultados && (
          <div style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            Nenhum resultado ainda. Selecione um item ou clique em um conjunto.
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
            <h3 style={{ color: '#ccc', fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Comprar pronto</h3>
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
                        <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: eMelhor ? '#4caf50' : semPreco ? '#555' : '#e0e0e0' }}>{eMelhor && '★ '}{r.tier}.{r.enchant}</span></td>
                        <td style={{ ...tdStyle, color: semPreco ? '#555' : '#bbb' }}>{r.cidadeOrigem}</td>
                        <td style={{ ...tdR, color: semPreco ? '#555' : '#ddd' }}>{semPreco ? '—' : formatarMoeda(r.preco)}</td>
                        <td style={{ ...tdR, color: r.custoTeleporte === 0 ? '#555' : '#ffb74d', fontWeight: r.custoTeleporte > 0 ? 'bold' : 'normal' }}>
                          {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                        </td>
                        <td style={{ ...tdR, fontWeight: 'bold', color: semPreco ? '#555' : '#4caf50', backgroundColor: eMelhor ? 'rgba(76,175,80,0.12)' : 'transparent' }}>
                          {semPreco ? '—' : formatarMoeda(r.custoFinal)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.78rem', color: '#555' }}>{semPreco ? '—' : formatarData(r.data)}</td>
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
            <h3 style={{ color: '#ccc', fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Comprar base + encantar</h3>
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
                      <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: i === 0 ? '#4caf50' : '#e0e0e0' }}>{i === 0 && '★ '}{r.tier}.{r.enchant}</span></td>
                      <td style={{ ...tdStyle, fontSize: '0.82rem', color: '#aaa', fontFamily: 'monospace' }}>{r.pathDesc}</td>
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

      {/* Modal gerenciar conjuntos */}
      {showGerenciarModal && (
        <GerenciarModal
          conjuntos={conjuntos}
          setConjuntos={setConjuntos}
          todosOsItens={todosOsItens}
          onClose={() => setShowGerenciarModal(false)}
        />
      )}
    </div>
  );
};

export default EquipBuy;
