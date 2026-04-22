import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { equipBuyOptions } from '../api.js';
import { EQUIPMENT_HIERARCHY, getAllEquipmentCategories, QUALITY_LEVELS } from '../data/equipmentHierarchy.js';

const CIDADES = [
  "Fort Sterling", "Lymhurst", "Bridgewatch", "Martlock", "Thetford", "Brecilien",
];

const SLOTS = [
  { key: 'arma',  label: 'Arma',  sub: 'Arma',      hierKey: 'Arma'     },
  { key: 'topo',  label: 'Topo',  sub: 'Capacete',  hierKey: 'Topo'     },
  { key: 'meio',  label: 'Meio',  sub: 'Peitoral',  hierKey: 'Armadura' },
  { key: 'baixo', label: 'Baixo', sub: 'Sapatos',   hierKey: 'Bota'     },
  { key: 'capa',  label: 'Capa',  sub: 'Capa',      hierKey: 'Capa'     },
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

function buildItensPorSlot() {
  const result = {};
  SLOTS.forEach(slot => {
    const items = [];
    const categoria = EQUIPMENT_HIERARCHY[slot.hierKey];
    if (categoria?.types) {
      Object.values(categoria.types).forEach(lista => {
        if (Array.isArray(lista)) lista.forEach(item => items.push(item));
      });
    }
    result[slot.key] = items.sort();
  });
  return result;
}

function buildTodosOsItens() {
  const items = [];
  getAllEquipmentCategories().forEach(eq => {
    const cat = EQUIPMENT_HIERARCHY[eq];
    if (cat?.types) Object.values(cat.types).forEach(lista => {
      if (Array.isArray(lista)) lista.forEach(item => items.push(item));
    });
  });
  return items;
}

function filtrarSugestoes(texto, lista, limite = 15) {
  if (!texto.trim()) return [];
  const palavras = texto.toLowerCase().split(/\s+/).filter(Boolean);
  return lista.filter(item => palavras.every(p => item.toLowerCase().includes(p))).slice(0, limite);
}

// Backend retorna cidades sem espaço (ex: 'FortSterling') — normalizar antes de comparar
function normalCity(name) {
  return (name || '').toLowerCase().replace(/\s+/g, '');
}

function migrarConjunto(c) {
  const slots = {};
  for (const { key } of SLOTS) {
    const val = c.slots?.[key];
    if (typeof val === 'string') {
      slots[key] = { item: val, nivel: c.nivel ?? '8', qualidade: c.qualidade ?? '1' };
    } else if (val && typeof val === 'object') {
      slots[key] = { item: val.item ?? '', nivel: val.nivel ?? '8', qualidade: val.qualidade ?? '1' };
    } else {
      slots[key] = { item: '', nivel: '8', qualidade: '1' };
    }
  }
  return { id: c.id, name: c.name, cidade: c.cidade ?? 'Fort Sterling', slots };
}

// ─── AutocompleteInput reutilizável ───
function AutocompleteInput({ value, onChange, onSelect, placeholder, lista, inputStyle = {} }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const sugestoes = useMemo(() => filtrarSugestoes(value, lista), [value, lista]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1 }} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => value && setAberto(true)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #555', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', ...inputStyle }}
      />
      {aberto && sugestoes.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 200, marginTop: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
          {sugestoes.map((s, i) => (
            <div key={i}
              onMouseDown={() => { onSelect(s); setAberto(false); }}
              style={{ padding: '0.5rem 0.7rem', cursor: 'pointer', borderBottom: '1px solid #2a2a35', color: s === value ? '#4caf50' : '#ccc', fontSize: '0.88rem' }}
              onMouseEnter={e => e.currentTarget.style.background = '#333'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{s}</div>
          ))}
        </div>
      )}
      {aberto && value && sugestoes.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #555', borderRadius: 6, padding: '0.6rem 0.7rem', marginTop: 2, color: '#666', fontSize: '0.85rem', zIndex: 200 }}>
          Nenhum item encontrado
        </div>
      )}
    </div>
  );
}

// ─── Modal de gerenciar conjuntos ───
const EMPTY_SLOT_DATA = () => ({ item: '', nivel: '8', qualidade: '1' });
const EMPTY_FORM = () => ({
  name: '',
  cidade: 'Fort Sterling',
  slots: Object.fromEntries(SLOTS.map(s => [s.key, EMPTY_SLOT_DATA()])),
});

function GerenciarModal({ conjuntos, setConjuntos, itensPorSlot, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const salvar = () => {
    if (!form.name.trim()) return;
    if (editingId != null) {
      setConjuntos(prev => prev.map(c => c.id === editingId ? { ...form, id: editingId } : c));
    } else {
      setConjuntos(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setForm(EMPTY_FORM());
    setEditingId(null);
  };

  const excluir = (id) => {
    if (editingId === id) { setForm(EMPTY_FORM()); setEditingId(null); }
    setConjuntos(prev => prev.filter(c => c.id !== id));
  };

  const editar = (c) => {
    setForm({ name: c.name, cidade: c.cidade, slots: JSON.parse(JSON.stringify(c.slots)) });
    setEditingId(c.id);
  };

  const setSlotField = (slotKey, field, val) =>
    setForm(f => ({ ...f, slots: { ...f.slots, [slotKey]: { ...f.slots[slotKey], [field]: val } } }));

  const inp = { padding: '0.45rem 0.6rem', borderRadius: 6, background: '#1a1a24', color: '#fff', border: '1px solid #444', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 12, padding: '1.5rem', maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ margin: 0, color: '#e0e0e0' }}>Conjuntos de Equipamentos</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Lista conjuntos existentes */}
        {conjuntos.length > 0 && (
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Salvos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {conjuntos.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: editingId === c.id ? 'rgba(76,175,80,0.07)' : '#23232e', borderRadius: 7, padding: '0.5rem 0.8rem', border: editingId === c.id ? '1px solid rgba(76,175,80,0.4)' : '1px solid transparent' }}>
                  <span style={{ flex: 1, color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                  <span style={{ color: '#666', fontSize: '0.78rem' }}>{c.cidade.split(' ').map(w => w[0]).join('')}</span>
                  <button onClick={() => editar(c)} style={{ ...inp, cursor: 'pointer', padding: '0.2rem 0.55rem' }}>Editar</button>
                  <button onClick={() => excluir(c.id)} style={{ ...inp, cursor: 'pointer', padding: '0.2rem 0.55rem', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.08)' }}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário */}
        <div style={{ background: '#23232e', borderRadius: 10, padding: '1rem', border: '1px solid #2a2a35' }}>
          <div style={{ fontSize: '0.75rem', color: editingId != null ? '#4caf50' : '#666', marginBottom: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {editingId != null ? 'Editando conjunto' : 'Novo conjunto'}
          </div>

          {/* Nome + Cidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#888' }}>Nome</span>
              <input style={{ ...inp, background: '#1a1a24' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Arqueiro PvP" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#888' }}>Minha cidade</span>
              <select style={{ ...inp, background: '#1a1a24', cursor: 'pointer' }} value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}>
                {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {/* Slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {/* Header das colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 130px', gap: '0.4rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 600, textTransform: 'uppercase' }}>Slot</div>
              <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 600, textTransform: 'uppercase' }}>Item</div>
              <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 600, textTransform: 'uppercase' }}>Nível</div>
              <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 600, textTransform: 'uppercase' }}>Qualidade</div>
            </div>

            {SLOTS.map(slot => (
              <div key={slot.key} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 130px', gap: '0.4rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.82rem', color: '#aaa', fontWeight: 600 }}>
                  {slot.label}
                  <span style={{ fontSize: '0.72rem', color: '#555', display: 'block' }}>{slot.sub}</span>
                </div>
                <AutocompleteInput
                  value={form.slots[slot.key].item}
                  onChange={val => setSlotField(slot.key, 'item', val)}
                  onSelect={val => setSlotField(slot.key, 'item', val)}
                  placeholder={slot.sub}
                  lista={itensPorSlot[slot.key] ?? []}
                />
                <input
                  type="number" min={4} max={12}
                  value={form.slots[slot.key].nivel}
                  onChange={e => setSlotField(slot.key, 'nivel', e.target.value)}
                  style={{ ...inp, background: '#1a1a24', width: '100%', textAlign: 'center', fontSize: '0.9rem', fontFamily: 'monospace' }}
                />
                <select
                  value={form.slots[slot.key].qualidade}
                  onChange={e => setSlotField(slot.key, 'qualidade', e.target.value)}
                  style={{ ...inp, background: '#1a1a24', cursor: 'pointer', width: '100%' }}
                >
                  {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            {editingId != null && (
              <button onClick={() => { setForm(EMPTY_FORM()); setEditingId(null); }}
                style={{ ...inp, cursor: 'pointer', padding: '0.45rem 1rem', fontSize: '0.88rem', color: '#888' }}>
                Cancelar
              </button>
            )}
            <button onClick={salvar} disabled={!form.name.trim()}
              style={{ padding: '0.45rem 1.2rem', borderRadius: 6, background: form.name.trim() ? '#4caf50' : '#444', color: '#fff', border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.88rem', opacity: form.name.trim() ? 1 : 0.5 }}>
              {editingId != null ? 'Salvar alterações' : 'Criar conjunto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de resultado de slot ───
function SlotResultCard({ slot, slotData, cidade }) {
  if (!slotData) {
    return (
      <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '1rem', minHeight: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{slot.label} · {slot.sub}</div>
        <div style={{ color: '#444', fontSize: '0.82rem', marginTop: 'auto' }}>não configurado</div>
      </div>
    );
  }

  const { item, direto, encantando, erro } = slotData;

  // Melhor geral (qualquer cidade)
  const melhorDireto = direto.find(r => r.custoFinal > 0) ?? null;
  const melhorEnc = encantando.find(r => r.custoFinal > 0) ?? null;
  const usarEncGeral = (melhorEnc?.custoFinal ?? Infinity) < (melhorDireto?.custoFinal ?? Infinity);
  const melhorGeral = usarEncGeral ? melhorEnc : melhorDireto;

  // Melhor da cidade selecionada (normalizar para comparar 'FortSterling' === 'Fort Sterling')
  const cidadeNorm = normalCity(cidade);
  const melhorDiretoCidade = direto.find(r => normalCity(r.cidadeOrigem) === cidadeNorm && r.custoFinal > 0) ?? null;
  const melhorEncCidade = encantando.find(r => normalCity(r.cidadeOrigem) === cidadeNorm && r.custoFinal > 0) ?? null;
  const usarEncCidade = (melhorEncCidade?.custoFinal ?? Infinity) < (melhorDiretoCidade?.custoFinal ?? Infinity);
  const melhorCidade = usarEncCidade ? melhorEncCidade : melhorDiretoCidade;

  // Se a melhor geral já é da cidade, não mostramos o bloco da cidade separado
  const cidadeEMelhor = normalCity(melhorGeral?.cidadeOrigem) === cidadeNorm;

  const nivelLabel = slotData.nivel ? `Nv ${slotData.nivel}` : '';

  const BlocoOpcao = ({ opcao, usarEnc, titulo, titoloColor, fundo }) => {
    if (!opcao) return (
      <div style={{ padding: '0.5rem 0.65rem', background: '#141420', borderRadius: 6, border: '1px solid #222' }}>
        <div style={{ fontSize: '0.72rem', color: titoloColor ?? '#666', fontWeight: 600, marginBottom: '0.2rem' }}>{titulo}</div>
        <div style={{ color: '#444', fontSize: '0.82rem' }}>sem preço disponível</div>
      </div>
    );
    return (
      <div style={{ padding: '0.5rem 0.65rem', background: fundo ?? 'rgba(76,175,80,0.08)', borderRadius: 6, border: `1px solid ${fundo ? 'rgba(255,183,77,0.2)' : 'rgba(76,175,80,0.22)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
          <span style={{ fontSize: '0.7rem', color: titoloColor ?? '#4caf50', fontWeight: 700 }}>{titulo}</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>
            {opcao.tier}.{opcao.enchant}
            {usarEnc ? ' · encantar' : ' · pronto'}
          </span>
        </div>
        <div style={{ color: titoloColor ?? '#4caf50', fontWeight: 700, fontSize: '1rem' }}>
          {formatarMoeda(opcao.custoFinal)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#777' }}>prata</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.1rem' }}>
          {opcao.cidadeOrigem}
          {usarEnc && opcao.pathDesc ? ` · ${opcao.pathDesc}` : ''}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: 10, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot.label} · {slot.sub}</div>
          <div style={{ color: '#d0d0d0', fontWeight: 600, fontSize: '0.85rem', marginTop: '0.15rem', lineHeight: 1.3 }}>{item}</div>
        </div>
        {nivelLabel && <div style={{ fontSize: '0.7rem', color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{nivelLabel}</div>}
      </div>

      {erro ? (
        <div style={{ color: '#ff6b6b', fontSize: '0.82rem' }}>Erro ao buscar</div>
      ) : (
        <>
          <BlocoOpcao
            opcao={melhorGeral}
            usarEnc={usarEncGeral}
            titulo="★ Melhor opção"
            titoloColor="#4caf50"
            fundo={undefined}
          />
          {!cidadeEMelhor && (
            <BlocoOpcao
              opcao={melhorCidade}
              usarEnc={usarEncCidade}
              titulo={`🏠 ${cidade}`}
              titoloColor="#ffb74d"
              fundo="rgba(255,183,77,0.07)"
            />
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
  const [itensPorSlot, setItensPorSlot] = useState({ topo: [], meio: [], baixo: [], capa: [] });
  const searchInputRef = useRef(null);

  const [conjuntos, setConjuntos] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('albion-equip-conjuntos') || '[]');
      return raw.map(migrarConjunto);
    } catch { return []; }
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
    setItensPorSlot(buildItensPorSlot());
  }, []);

  const sugestoes = useMemo(() => filtrarSugestoes(searchText, todosOsItens), [searchText, todosOsItens]);

  const handleSelectSugestao = (item) => {
    setItemSelecionado(item);
    setSearchText(item);
    setSugestoesVisivel(false);
  };

  useEffect(() => {
    const h = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target))
        setSugestoesVisivel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
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
      const res = await equipBuyOptions({ equipamentoNome: itemSelecionado, nivelEfetivo: parseInt(nivelEfetivo, 10), qualidade: parseInt(qualidade), cidadeDestino: cidade });
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
      const sd = conjunto.slots[slot.key];
      if (!sd?.item) { resultados[slot.key] = null; return; }
      try {
        const res = await equipBuyOptions({
          equipamentoNome: sd.item,
          nivelEfetivo: parseInt(sd.nivel ?? '8', 10),
          qualidade: parseInt(sd.qualidade ?? '1'),
          cidadeDestino: conjunto.cidade,
        });
        resultados[slot.key] = { item: sd.item, nivel: sd.nivel, direto: res?.direto ?? [], encantando: res?.encantando ?? [] };
      } catch {
        resultados[slot.key] = { item: sd.item, nivel: sd.nivel, direto: [], encantando: [], erro: true };
      }
    }));

    setConjuntoResultados(resultados);
    setConjuntoLoading(false);
  }, []);

  const melhorDireto = resultadosDireto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
  const melhorEncantando = resultadosEncantando[0]?.custoFinal ?? Infinity;
  const encantarEMaisBarato = melhorEncantando < melhorDireto;
  const temResultados = resultadosDireto.length > 0 || resultadosEncantando.length > 0;

  const conjuntoAtivoData = conjuntos.find(c => c.name === conjuntoAtivo);

  const calcTotalConjunto = (filtrarPorCidade = false) => {
    if (!conjuntoResultados) return null;
    const cidNorm = filtrarPorCidade ? normalCity(conjuntoAtivoData?.cidade ?? '') : null;
    let total = 0;
    let algumSlot = false;
    for (const slot of SLOTS) {
      const d = conjuntoResultados[slot.key];
      if (!d || d.erro) continue;
      const melhorDireto = filtrarPorCidade
        ? d.direto.find(r => normalCity(r.cidadeOrigem) === cidNorm && r.custoFinal > 0)?.custoFinal ?? Infinity
        : d.direto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
      const melhorEnc = filtrarPorCidade
        ? d.encantando.find(r => normalCity(r.cidadeOrigem) === cidNorm && r.custoFinal > 0)?.custoFinal ?? Infinity
        : d.encantando.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
      const melhor = Math.min(melhorDireto, melhorEnc);
      if (melhor !== Infinity) { total += melhor; algumSlot = true; }
    }
    return algumSlot ? total : null;
  };

  const totalConjunto = calcTotalConjunto(false);
  const totalConjuntoCidade = calcTotalConjunto(true);

  const thStyle = { padding: '0.85rem 1rem', textAlign: 'left', borderBottom: '2px solid #333', fontWeight: 700, fontSize: '0.82rem', color: '#888' };
  const thR = { ...thStyle, textAlign: 'right' };
  const tdStyle = { padding: '0.7rem 1rem', borderBottom: '1px solid #23232e' };
  const tdR = { ...tdStyle, textAlign: 'right' };

  return (
    <div className="equip-buy-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>Equip Buy</h2>
        <button onClick={() => setShowGerenciarModal(true)}
          style={{ padding: '0.45rem 1rem', borderRadius: 8, background: '#23232e', color: '#bbb', border: '1px solid #333', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
          Gerenciar Conjuntos
        </button>
      </div>

      {/* Conjuntos salvos */}
      {conjuntos.length > 0 && (
        <div style={{ background: 'rgba(30,30,40,0.85)', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1.5rem', border: '1px solid #2a2a35' }}>
          <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.55rem' }}>Conjuntos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {conjuntos.map(c => (
              <button key={c.id} onClick={() => buscarConjunto(c)} disabled={conjuntoLoading}
                style={{ padding: '0.4rem 1rem', borderRadius: 20, background: conjuntoAtivo === c.name ? '#4caf50' : '#23232e', color: conjuntoAtivo === c.name ? '#fff' : '#bbb', border: conjuntoAtivo === c.name ? '1px solid #4caf50' : '1px solid #333', cursor: conjuntoLoading ? 'not-allowed' : 'pointer', fontWeight: conjuntoAtivo === c.name ? 700 : 400, fontSize: '0.88rem', transition: 'all 0.15s' }}>
                {c.name}
                <span style={{ fontSize: '0.7rem', marginLeft: '0.4rem', opacity: 0.65 }}>T{Object.values(c.slots).find(s => s?.nivel)?.nivel ?? '?'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulário busca individual */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(30,30,40,0.85)', borderRadius: 12, padding: '1.2rem 1rem', marginBottom: '2rem', border: '1px solid #2a2a35' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Autocomplete item */}
          <div style={{ position: 'relative' }} ref={searchInputRef}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ccc' }}>Nome do Item</span>
              <input type="text" value={searchText}
                onChange={e => { setSearchText(e.target.value); setSugestoesVisivel(true); if (!e.target.value) setItemSelecionado(""); }}
                onFocus={() => searchText && setSugestoesVisivel(true)}
                placeholder="Ex: Arco Guerra"
                style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: itemSelecionado ? '1px solid #4caf50' : '1px solid #444', fontSize: '0.95rem', fontFamily: 'inherit' }}
              />
            </label>
            {sugestoesVisivel && sugestoes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #444', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', maxHeight: 250, overflowY: 'auto', zIndex: 100, marginTop: '0.3rem' }}>
                {sugestoes.map((s, i) => (
                  <div key={i} onClick={() => handleSelectSugestao(s)}
                    style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #2a2a35', color: s === itemSelecionado ? '#4caf50' : '#ccc', userSelect: 'none', fontSize: '0.9rem' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#333'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{s}</div>
                ))}
              </div>
            )}
            {searchText && sugestoes.length === 0 && sugestoesVisivel && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#23232e', border: '1px solid #444', borderRadius: 6, padding: '0.7rem 0.8rem', marginTop: '0.3rem', color: '#666', fontSize: '0.88rem', zIndex: 100 }}>
                Nenhum item encontrado
              </div>
            )}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ccc' }}>Nível Efetivo <span style={{ color: '#555', fontWeight: 400, fontSize: '0.78rem' }}>4–12</span></span>
            <input type="number" min={4} max={12} value={nivelEfetivo}
              onChange={e => setNivelEfetivo(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: nivelEfetivoValido(nivelEfetivo) ? '1px solid #4caf50' : '1px solid #444', fontSize: '1.2rem', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ccc' }}>Qualidade</span>
            <select value={qualidade} onChange={e => setQualidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #444', fontSize: '0.95rem', cursor: 'pointer' }}>
              {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ccc' }}>Minha cidade</span>
            <select value={cidade} onChange={e => setCidade(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: 6, background: '#23232e', color: '#fff', border: '1px solid #444', fontSize: '0.95rem', cursor: 'pointer' }}>
              {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <button type="submit" disabled={loading || !itemSelecionado}
            style={{ padding: '0.6rem 1.5rem', borderRadius: 8, background: itemSelecionado ? '#4caf50' : '#555', color: '#fff', fontWeight: 600, fontSize: '0.95rem', border: 'none', cursor: itemSelecionado && !loading ? 'pointer' : 'not-allowed', opacity: itemSelecionado && !loading ? 1 : 0.5, transition: 'all 0.2s' }}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>

      {/* Resultados de conjunto */}
      {(conjuntoLoading || conjuntoResultados) && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#e0e0e0', fontSize: '1rem' }}>{conjuntoAtivo}</span>
              {conjuntoAtivoData && (
                <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#666' }}>
                  {conjuntoAtivoData.cidade}
                </span>
              )}
            </div>
            {(totalConjunto > 0 || totalConjuntoCidade > 0) && (
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {totalConjuntoCidade > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888' }}>Custo {conjuntoAtivoData?.cidade ?? ''}</div>
                    <div style={{ color: '#ffb74d', fontWeight: 700, fontSize: '1rem' }}>{formatarMoeda(totalConjuntoCidade)} prata</div>
                  </div>
                )}
                {totalConjunto > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#666' }}>Custo total otimizado</div>
                    <div style={{ color: '#4caf50', fontWeight: 700, fontSize: '1.05rem' }}>{formatarMoeda(totalConjunto)} prata</div>
                  </div>
                )}
              </div>
            )}
          </div>
          {conjuntoLoading ? (
            <div style={{ color: '#666', padding: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>Buscando preços…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem' }}>
              {SLOTS.map(slot => (
                <SlotResultCard key={slot.key} slot={slot} slotData={conjuntoResultados[slot.key]} cidade={conjuntoAtivoData?.cidade ?? ''} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resultados busca individual */}
      <div>
        {erro && (
          <div style={{ color: '#ff6b6b', padding: '0.9rem 1rem', background: 'rgba(255,107,107,0.08)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
            ⚠️ {erro}
          </div>
        )}
        {!temResultados && !loading && !conjuntoResultados && (
          <div style={{ color: '#555', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
            Selecione um item e clique em "Buscar", ou escolha um conjunto.
          </div>
        )}

        {temResultados && (
          <div style={{ marginBottom: '1.5rem', padding: '0.9rem 1.1rem', background: 'rgba(30,30,40,0.9)', borderRadius: 10, border: '1px solid #2a2a35', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {melhorDireto !== Infinity && (
              <div>
                <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Comprar pronto</div>
                <div style={{ color: encantarEMaisBarato ? '#ffb74d' : '#4caf50', fontWeight: 700, fontSize: '1.05rem' }}>
                  {formatarMoeda(melhorDireto)} prata
                  {!encantarEMaisBarato && <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', opacity: 0.8 }}>★ mais barato</span>}
                </div>
                <div style={{ color: '#555', fontSize: '0.78rem' }}>
                  {(() => { const m = resultadosDireto.find(r => r.custoFinal > 0); return m ? `${m.tier}.${m.enchant} em ${m.cidadeOrigem}` : ''; })()}
                </div>
              </div>
            )}
            {melhorEncantando !== Infinity && (
              <div>
                <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Comprar + encantar</div>
                <div style={{ color: encantarEMaisBarato ? '#4caf50' : '#ffb74d', fontWeight: 700, fontSize: '1.05rem' }}>
                  {formatarMoeda(melhorEncantando)} prata
                  {encantarEMaisBarato && <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', opacity: 0.8 }}>★ mais barato</span>}
                </div>
                <div style={{ color: '#555', fontSize: '0.78rem' }}>
                  {resultadosEncantando[0]?.tier}.{resultadosEncantando[0]?.enchant} — {resultadosEncantando[0]?.pathDesc}
                </div>
              </div>
            )}
            {melhorDireto !== Infinity && melhorEncantando !== Infinity && (
              <div style={{ borderLeft: '1px solid #2a2a35', paddingLeft: '2rem' }}>
                <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.15rem' }}>Economia encantando</div>
                <div style={{ color: encantarEMaisBarato ? '#4caf50' : '#ff6b6b', fontWeight: 700, fontSize: '1.05rem' }}>
                  {encantarEMaisBarato ? '+' : '−'}{formatarMoeda(Math.abs(melhorDireto - melhorEncantando))} prata
                </div>
              </div>
            )}
          </div>
        )}

        {resultadosDireto.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.6rem', fontWeight: 600 }}>Comprar pronto</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e' }}>
                    <th style={thStyle}>Tier.Enc</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thR}>Preço Item</th>
                    <th style={thR}>Teleporte</th>
                    <th style={{ ...thR, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.06)' }}>TOTAL</th>
                    <th style={{ ...thStyle, textAlign: 'center', fontSize: '0.75rem' }}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosDireto.map((r, i) => {
                    const semPreco = !r.custoFinal || r.custoFinal === 0;
                    const eMelhor = !semPreco && r.custoFinal === melhorDireto;
                    const eCidade = normalCity(r.cidadeOrigem) === normalCity(cidade);
                    return (
                      <tr key={`${r.tier}.${r.enchant}-${r.cidadeOrigem}`}
                        style={{ background: eMelhor ? 'rgba(76,175,80,0.06)' : eCidade ? 'rgba(255,183,77,0.04)' : i % 2 === 0 ? '#23232e' : '#1a1a22', opacity: semPreco ? 0.4 : 1 }}>
                        <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: eMelhor ? '#4caf50' : semPreco ? '#444' : '#ddd' }}>{eMelhor && '★ '}{r.tier}.{r.enchant}</span></td>
                        <td style={{ ...tdStyle, color: eCidade ? '#ffb74d' : semPreco ? '#444' : '#bbb' }}>{r.cidadeOrigem}{eCidade && <span style={{ fontSize: '0.72rem', marginLeft: '0.3rem', opacity: 0.7 }}>🏠</span>}</td>
                        <td style={{ ...tdR, color: semPreco ? '#444' : '#bbb' }}>{semPreco ? '—' : formatarMoeda(r.preco)}</td>
                        <td style={{ ...tdR, color: r.custoTeleporte === 0 ? '#444' : '#ffb74d', fontWeight: r.custoTeleporte > 0 ? 700 : 400 }}>
                          {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                        </td>
                        <td style={{ ...tdR, fontWeight: 700, color: semPreco ? '#444' : '#4caf50', backgroundColor: eMelhor ? 'rgba(76,175,80,0.1)' : 'transparent' }}>
                          {semPreco ? '—' : formatarMoeda(r.custoFinal)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.75rem', color: '#555' }}>{semPreco ? '—' : formatarData(r.data)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {resultadosEncantando.length > 0 && (
          <div>
            <h3 style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.6rem', fontWeight: 600 }}>Comprar base + encantar</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181820', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#23232e' }}>
                    <th style={thStyle}>Tier.Enc</th>
                    <th style={thStyle}>Estratégia</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thR}>Item Base</th>
                    <th style={thR}>Materiais</th>
                    <th style={thR}>Teleporte</th>
                    <th style={{ ...thR, color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.06)' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosEncantando.map((r, i) => {
                    const eCidade = normalCity(r.cidadeOrigem) === normalCity(cidade);
                    return (
                      <tr key={`${r.tier}.${r.enchant}-enc-${i}`}
                        style={{ background: i === 0 ? 'rgba(76,175,80,0.06)' : eCidade ? 'rgba(255,183,77,0.04)' : i % 2 === 0 ? '#23232e' : '#1a1a22', color: '#e0e0e0' }}>
                        <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700, color: i === 0 ? '#4caf50' : '#ddd' }}>{i === 0 && '★ '}{r.tier}.{r.enchant}</span></td>
                        <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' }}>{r.pathDesc}</td>
                        <td style={{ ...tdStyle, color: eCidade ? '#ffb74d' : '#bbb' }}>{r.cidadeOrigem}{eCidade && <span style={{ fontSize: '0.72rem', marginLeft: '0.3rem', opacity: 0.7 }}>🏠</span>}</td>
                        <td style={{ ...tdR, color: '#bbb' }}>{formatarMoeda(r.custoItem)}</td>
                        <td style={{ ...tdR, color: '#ce93d8' }}>{formatarMoeda(r.custoMateriais)}</td>
                        <td style={{ ...tdR, color: r.custoTeleporte === 0 ? '#444' : '#ffb74d', fontWeight: r.custoTeleporte > 0 ? 700 : 400 }}>
                          {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                        </td>
                        <td style={{ ...tdR, fontWeight: 700, color: '#4caf50', backgroundColor: i === 0 ? 'rgba(76,175,80,0.1)' : 'transparent' }}>
                          {formatarMoeda(r.custoFinal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showGerenciarModal && (
        <GerenciarModal
          conjuntos={conjuntos}
          setConjuntos={setConjuntos}
          itensPorSlot={itensPorSlot}
          onClose={() => setShowGerenciarModal(false)}
        />
      )}
    </div>
  );
};

export default EquipBuy;
