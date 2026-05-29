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

// Backend returns cities without spaces (e.g. 'FortSterling') — normalize before comparing
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

// ─── AutocompleteInput (used inside modal slot rows) ───
function AutocompleteInput({ value, onChange, onSelect, placeholder, lista, className }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const sugestoes = useMemo(() => filtrarSugestoes(value, lista), [value, lista]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="eb-ac-wrap" ref={ref}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => value && setAberto(true)}
        placeholder={placeholder}
        className={className}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="eb-ac-list">
          {sugestoes.map((s, i) => (
            <div key={i} className="eb-ac-item"
              onMouseDown={() => { onSelect(s); setAberto(false); }}>
              {s}
            </div>
          ))}
        </div>
      )}
      {aberto && value && sugestoes.length === 0 && (
        <div className="eb-ac-empty">Nenhum item encontrado</div>
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

  return (
    <div className="eb-modal-overlay" onClick={onClose}>
      <div className="eb-modal" onClick={e => e.stopPropagation()}>
        <header className="eb-modal-head">
          <h2 className="eb-modal-title">Conjuntos de Equipamentos</h2>
          <button className="eb-modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <div className="eb-modal-body">
          {conjuntos.length > 0 && (
            <div>
              <div className="eb-modal-sec-lbl">Salvos</div>
              <ul className="eb-saved-list">
                {conjuntos.map(c => (
                  <li key={c.id} className={`eb-saved-row ${editingId === c.id ? 'eb-saved-row-editing' : ''}`}>
                    <span className="eb-saved-name">{c.name}</span>
                    <span className="eb-saved-city">{c.cidade.split(' ').map(w => w[0]).join('')}</span>
                    <div className="eb-saved-actions">
                      <button className="eb-btn-ghost" onClick={() => editar(c)}>Editar</button>
                      <button className="eb-btn-ghost eb-btn-ghost-del" onClick={() => excluir(c.id)}>Excluir</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="eb-novo-section">
            <div className={`eb-modal-sec-lbl ${editingId != null ? 'eb-modal-sec-lbl-editing' : ''}`}>
              {editingId != null ? 'Editando conjunto' : 'Novo conjunto'}
            </div>

            <div className="eb-novo-top">
              <label className="eb-novo-field">
                <span>Nome</span>
                <input type="text" value={form.name} placeholder="Ex: Arqueiro PvP"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="eb-novo-field">
                <span>Minha cidade</span>
                <select value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}>
                  {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="eb-slots-head">
              <div className="eb-slots-head-col">Slot</div>
              <div className="eb-slots-head-col">Item</div>
              <div className="eb-slots-head-col">Nível</div>
              <div className="eb-slots-head-col">Qualidade</div>
            </div>

            {SLOTS.map(slot => (
              <div key={slot.key} className="eb-slot-row">
                <div className="eb-slot-lbl">
                  <div className="eb-slot-name">{slot.label}</div>
                  <div className="eb-slot-sub">{slot.sub}</div>
                </div>
                <AutocompleteInput
                  value={form.slots[slot.key].item}
                  onChange={val => setSlotField(slot.key, 'item', val)}
                  onSelect={val => setSlotField(slot.key, 'item', val)}
                  placeholder={slot.sub}
                  lista={itensPorSlot[slot.key] ?? []}
                  className="eb-slot-input"
                />
                <input type="number" min={4} max={12}
                  value={form.slots[slot.key].nivel}
                  onChange={e => setSlotField(slot.key, 'nivel', e.target.value)}
                  className="eb-slot-num"
                />
                <select value={form.slots[slot.key].qualidade}
                  onChange={e => setSlotField(slot.key, 'qualidade', e.target.value)}
                  className="eb-slot-qual">
                  {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>
            ))}

            <div className="eb-novo-actions">
              {editingId != null && (
                <button className="eb-btn-cancel"
                  onClick={() => { setForm(EMPTY_FORM()); setEditingId(null); }}>
                  Cancelar
                </button>
              )}
              <button className="btn-primary" onClick={salvar} disabled={!form.name.trim()}>
                {editingId != null ? 'Salvar alterações' : 'Criar conjunto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SlotResultCard ───
function SlotResultCard({ slot, slotData, cidade }) {
  if (!slotData) {
    return (
      <div className="slot-card">
        <div className="slot-card-head">
          <div className="slot-card-lbl">
            <span className="slot-card-l1">{slot.label}</span>
            <span className="slot-card-sep"> · </span>
            <span className="slot-card-l2">{slot.sub}</span>
          </div>
        </div>
        <div className="slot-card-item slot-card-not-configured">não configurado</div>
      </div>
    );
  }

  const { item, direto, encantando, erro } = slotData;

  const melhorDireto    = direto.find(r => r.custoFinal > 0) ?? null;
  const melhorEnc       = encantando.find(r => r.custoFinal > 0) ?? null;
  const usarEncGeral    = (melhorEnc?.custoFinal ?? Infinity) < (melhorDireto?.custoFinal ?? Infinity);
  const melhorGeral     = usarEncGeral ? melhorEnc : melhorDireto;

  const cidadeNorm         = normalCity(cidade);
  const melhorDiretoCidade = direto.find(r => normalCity(r.cidadeOrigem) === cidadeNorm && r.custoFinal > 0) ?? null;
  const melhorEncCidade    = encantando.find(r => normalCity(r.cidadeOrigem) === cidadeNorm && r.custoFinal > 0) ?? null;
  const usarEncCidade      = (melhorEncCidade?.custoFinal ?? Infinity) < (melhorDiretoCidade?.custoFinal ?? Infinity);
  const melhorCidade       = usarEncCidade ? melhorEncCidade : melhorDiretoCidade;

  const cidadeEMelhor = normalCity(melhorGeral?.cidadeOrigem) === cidadeNorm;
  const nivelLabel    = slotData.nivel ? `Nv ${slotData.nivel}` : '';

  const BlocoOpcao = ({ opcao, usarEnc, titulo, kind }) => {
    if (!opcao) return (
      <div className="slot-opt slot-opt-empty">
        <div className="slot-opt-head">
          <span className={`slot-opt-tag slot-opt-tag-${kind}`}>{titulo}</span>
        </div>
        <div className="slot-opt-empty-msg">sem preço disponível</div>
      </div>
    );
    return (
      <div className={`slot-opt slot-opt-${kind}`}>
        <div className="slot-opt-head">
          <span className={`slot-opt-tag slot-opt-tag-${kind}`}>{titulo}</span>
          <span className="slot-opt-meta">
            T{opcao.tier}.{opcao.enchant} · {usarEnc ? 'encantar' : 'pronto'}
          </span>
        </div>
        <div className="slot-opt-price">
          {formatarMoeda(opcao.custoFinal)}<span className="slot-opt-unit"> prata</span>
        </div>
        <div className="slot-opt-detail">
          {opcao.cidadeOrigem}
          {usarEnc && opcao.pathDesc ? ` · ${opcao.pathDesc}` : ''}
        </div>
      </div>
    );
  };

  return (
    <div className="slot-card">
      <div className="slot-card-head">
        <div className="slot-card-lbl">
          <span className="slot-card-l1">{slot.label}</span>
          <span className="slot-card-sep"> · </span>
          <span className="slot-card-l2">{slot.sub}</span>
        </div>
        {nivelLabel && <span className="slot-card-nv">{nivelLabel}</span>}
      </div>
      <div className="slot-card-item">{item}</div>
      {erro ? (
        <div className="eb-err-inline">Erro ao buscar</div>
      ) : (
        <div className="slot-card-opts">
          <BlocoOpcao opcao={melhorGeral} usarEnc={usarEncGeral} titulo="★ Melhor opção" kind="best" />
          {!cidadeEMelhor && (
            <BlocoOpcao opcao={melhorCidade} usarEnc={usarEncCidade} titulo={`⌂ ${cidade}`} kind="local" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───
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

  const melhorDireto      = resultadosDireto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
  const melhorEncantando  = resultadosEncantando[0]?.custoFinal ?? Infinity;
  const encantarEMaisBarato = melhorEncantando < melhorDireto;
  const temResultados     = resultadosDireto.length > 0 || resultadosEncantando.length > 0;

  const conjuntoAtivoData = useMemo(() =>
    conjuntos.find(c => c.name === conjuntoAtivo), [conjuntos, conjuntoAtivo]);

  const totalConjunto = useMemo(() => {
    if (!conjuntoResultados) return null;
    let total = 0; let algumSlot = false;
    for (const slot of SLOTS) {
      const d = conjuntoResultados[slot.key];
      if (!d || d.erro) continue;
      const mD = d.direto.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
      const mE = d.encantando.find(r => r.custoFinal > 0)?.custoFinal ?? Infinity;
      const m = Math.min(mD, mE);
      if (m !== Infinity) { total += m; algumSlot = true; }
    }
    return algumSlot ? total : null;
  }, [conjuntoResultados]);

  const totalConjuntoCidade = useMemo(() => {
    if (!conjuntoResultados) return null;
    const cidNorm = normalCity(conjuntoAtivoData?.cidade ?? '');
    let total = 0; let algumSlot = false;
    for (const slot of SLOTS) {
      const d = conjuntoResultados[slot.key];
      if (!d || d.erro) continue;
      const mD = d.direto.find(r => normalCity(r.cidadeOrigem) === cidNorm && r.custoFinal > 0)?.custoFinal ?? Infinity;
      const mE = d.encantando.find(r => normalCity(r.cidadeOrigem) === cidNorm && r.custoFinal > 0)?.custoFinal ?? Infinity;
      const m = Math.min(mD, mE);
      if (m !== Infinity) { total += m; algumSlot = true; }
    }
    return algumSlot ? total : null;
  }, [conjuntoResultados, conjuntoAtivoData]);

  return (
    <div className="page-inner">

      {/* ── Header ── */}
      <div className="eb-header">
        <h1 className="eb-title">Equip Buy</h1>
        <button className="btn-secondary" onClick={() => setShowGerenciarModal(true)}>
          Gerenciar Conjuntos
        </button>
      </div>

      {/* ── Conjuntos strip ── */}
      {conjuntos.length > 0 && (
        <div className="conjuntos-strip card">
          <div className="conjuntos-lbl">Conjuntos</div>
          <div className="conjuntos-list">
            {conjuntos.map(c => (
              <button key={c.id}
                className={`conjunto-pill ${conjuntoAtivo === c.name ? 'conjunto-pill-active' : ''}`}
                onClick={() => buscarConjunto(c)}
                disabled={conjuntoLoading}>
                {c.name}
                <span className="conjunto-pill-tier mono">
                  T{Object.values(c.slots).find(s => s?.nivel)?.nivel ?? '?'}
                </span>
              </button>
            ))}
            <button className="conjunto-add" onClick={() => setShowGerenciarModal(true)}>
              + Novo
            </button>
          </div>
        </div>
      )}

      {/* ── Search form ── */}
      <form className="card eb-search" onSubmit={handleSubmit}>
        <div className="eb-field eb-field-name">
          <label>Nome do Item</label>
          <div className="eb-ac-wrap" ref={searchInputRef}>
            <input
              type="text"
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                setSugestoesVisivel(true);
                if (!e.target.value) setItemSelecionado("");
              }}
              onFocus={() => searchText && setSugestoesVisivel(true)}
              placeholder="Ex: Arco Guerra"
              className={itemSelecionado ? 'eb-item-selected' : ''}
            />
            {sugestoesVisivel && sugestoes.length > 0 && (
              <div className="eb-ac-list">
                {sugestoes.map((s, i) => (
                  <div key={i} className="eb-ac-item" onClick={() => handleSelectSugestao(s)}>{s}</div>
                ))}
              </div>
            )}
            {searchText && sugestoes.length === 0 && sugestoesVisivel && (
              <div className="eb-ac-empty">Nenhum item encontrado</div>
            )}
          </div>
        </div>

        <div className="eb-field eb-field-nivel">
          <label>Nível <span className="eb-hint">4–12</span></label>
          <input type="number" min={4} max={12} value={nivelEfetivo}
            onChange={e => setNivelEfetivo(e.target.value)}
            className={nivelEfetivoValido(nivelEfetivo) ? 'eb-item-selected' : ''}
          />
        </div>

        <div className="eb-field eb-field-qual">
          <label>Qualidade</label>
          <select value={qualidade} onChange={e => setQualidade(e.target.value)}>
            {QUALITY_LEVELS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
          </select>
        </div>

        <div className="eb-field eb-field-cidade">
          <label>Minha cidade</label>
          <select value={cidade} onChange={e => setCidade(e.target.value)}>
            {CIDADES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <button type="submit" className="btn-primary eb-buscar" disabled={loading || !itemSelecionado}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {/* ── Set results ── */}
      {(conjuntoLoading || conjuntoResultados) && (
        <div>
          <div className="eb-set-summary">
            <div className="eb-set-id">
              <h2 className="eb-set-name">{conjuntoAtivo}</h2>
              {conjuntoAtivoData && (
                <span className="eb-set-city">{conjuntoAtivoData.cidade}</span>
              )}
            </div>
            {(totalConjunto != null || totalConjuntoCidade != null) && (
              <div className="eb-set-totals">
                {totalConjuntoCidade != null && (
                  <div className="eb-set-total">
                    <div className="eb-set-total-lbl">Custo {conjuntoAtivoData?.cidade ?? ''}</div>
                    <div className="eb-set-total-v mono eb-set-total-local">
                      {formatarMoeda(totalConjuntoCidade)}<span className="eb-sum-unit"> prata</span>
                    </div>
                  </div>
                )}
                {totalConjunto != null && (
                  <div className="eb-set-total">
                    <div className="eb-set-total-lbl">Custo otimizado</div>
                    <div className="eb-set-total-v mono eb-set-total-optimized">
                      {formatarMoeda(totalConjunto)}<span className="eb-sum-unit"> prata</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {conjuntoLoading ? (
            <div className="eb-loading">Buscando preços…</div>
          ) : (
            <div className="slot-grid">
              {SLOTS.map(slot => (
                <SlotResultCard key={slot.key} slot={slot}
                  slotData={conjuntoResultados[slot.key]}
                  cidade={conjuntoAtivoData?.cidade ?? ''} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Individual item results ── */}
      {erro && <div className="eb-error">⚠ {erro}</div>}

      {!temResultados && !loading && !conjuntoResultados && !erro && (
        <div className="eb-empty">
          Selecione um item e clique em "Buscar", ou escolha um conjunto salvo.
        </div>
      )}

      {temResultados && (
        <div className="eb-results">

          {/* Summary strip */}
          <div className="card eb-summary">
            {melhorDireto !== Infinity && (
              <div className="eb-sum-col">
                <div className="eb-sum-lbl">Comprar pronto</div>
                <div className={`eb-sum-val mono ${!encantarEMaisBarato ? 'eb-sum-accent' : ''}`}>
                  {formatarMoeda(melhorDireto)}<span className="eb-sum-unit">prata</span>
                  {!encantarEMaisBarato && <span className="eb-cheaper">★ mais barato</span>}
                </div>
                <div className="eb-sum-sub">
                  {(() => {
                    const m = resultadosDireto.find(r => r.custoFinal > 0);
                    return m ? `T${m.tier}.${m.enchant} em ${m.cidadeOrigem}` : '';
                  })()}
                </div>
              </div>
            )}
            {melhorEncantando !== Infinity && (
              <div className="eb-sum-col">
                <div className="eb-sum-lbl">Comprar + encantar</div>
                <div className={`eb-sum-val mono ${encantarEMaisBarato ? 'eb-sum-accent' : ''}`}>
                  {formatarMoeda(melhorEncantando)}<span className="eb-sum-unit">prata</span>
                  {encantarEMaisBarato && <span className="eb-cheaper">★ mais barato</span>}
                </div>
                <div className="eb-sum-sub">
                  T{resultadosEncantando[0]?.tier}.{resultadosEncantando[0]?.enchant} — {resultadosEncantando[0]?.pathDesc}
                </div>
              </div>
            )}
            {melhorDireto !== Infinity && melhorEncantando !== Infinity && (
              <div className="eb-sum-col">
                <div className="eb-sum-lbl">Economia encantando</div>
                <div className={`eb-sum-val mono ${encantarEMaisBarato ? 'pos' : 'neg'}`}>
                  {encantarEMaisBarato ? '+' : '−'}{formatarMoeda(Math.abs(melhorDireto - melhorEncantando))}
                  <span className="eb-sum-unit">prata</span>
                </div>
              </div>
            )}
          </div>

          {/* Comprar pronto table */}
          {resultadosDireto.length > 0 && (
            <div className="card eb-table-card">
              <div className="eb-table-head">
                <h3 className="eb-table-title">Comprar pronto</h3>
              </div>
              <div className="eb-table-scroll">
                <table className="eb-table">
                  <thead>
                    <tr>
                      <th>Tier.Enc</th>
                      <th>Cidade</th>
                      <th className="eb-th-right">Preço Item</th>
                      <th className="eb-th-right">Teleporte</th>
                      <th className="eb-th-right eb-th-total">Total</th>
                      <th>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosDireto.map((r, i) => {
                      const semPreco = !r.custoFinal || r.custoFinal === 0;
                      const eMelhor = !semPreco && r.custoFinal === melhorDireto;
                      const eCidade = normalCity(r.cidadeOrigem) === normalCity(cidade);
                      return (
                        <tr key={`${r.tier}.${r.enchant}-${r.cidadeOrigem}`}
                          className={`${eMelhor ? 'eb-row-best' : ''} ${semPreco ? 'eb-row-dim' : ''}`}>
                          <td>
                            <span className="eb-tier mono">
                              {eMelhor && '★ '}T{r.tier}.{r.enchant}
                            </span>
                          </td>
                          <td className={eCidade ? 'eb-city-home' : 'eb-city'}>
                            {r.cidadeOrigem}{eCidade && ' ⌂'}
                          </td>
                          <td className="ff-right mono">{semPreco ? '—' : formatarMoeda(r.preco)}</td>
                          <td className={`ff-right mono ${r.custoTeleporte > 0 ? 'eb-tele-cost' : 'eb-tele'}`}>
                            {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                          </td>
                          <td className="eb-total-cell">
                            {semPreco ? '—' : formatarMoeda(r.custoFinal)}
                          </td>
                          <td className="eb-atual">{semPreco ? '—' : formatarData(r.data)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comprar base + encantar table */}
          {resultadosEncantando.length > 0 && (
            <div className="card eb-table-card">
              <div className="eb-table-head">
                <h3 className="eb-table-title">Comprar base + encantar</h3>
              </div>
              <div className="eb-table-scroll">
                <table className="eb-table">
                  <thead>
                    <tr>
                      <th>Tier.Enc</th>
                      <th>Estratégia</th>
                      <th>Cidade</th>
                      <th className="eb-th-right">Item Base</th>
                      <th className="eb-th-right">Materiais</th>
                      <th className="eb-th-right">Teleporte</th>
                      <th className="eb-th-right eb-th-total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosEncantando.map((r, i) => {
                      const eCidade = normalCity(r.cidadeOrigem) === normalCity(cidade);
                      return (
                        <tr key={`${r.tier}.${r.enchant}-enc-${i}`}
                          className={i === 0 ? 'eb-row-best' : ''}>
                          <td>
                            <span className="eb-tier mono">
                              {i === 0 && '★ '}T{r.tier}.{r.enchant}
                            </span>
                          </td>
                          <td className="eb-strategy">{r.pathDesc}</td>
                          <td className={eCidade ? 'eb-city-home' : 'eb-city'}>
                            {r.cidadeOrigem}{eCidade && ' ⌂'}
                          </td>
                          <td className="ff-right mono">{formatarMoeda(r.custoItem)}</td>
                          <td className="eb-mat-cost">{formatarMoeda(r.custoMateriais)}</td>
                          <td className={`ff-right mono ${r.custoTeleporte > 0 ? 'eb-tele-cost' : 'eb-tele'}`}>
                            {r.custoTeleporte === 0 ? '—' : formatarMoeda(r.custoTeleporte)}
                          </td>
                          <td className="eb-total-cell">{formatarMoeda(r.custoFinal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
