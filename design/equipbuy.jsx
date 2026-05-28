// equipbuy.jsx — Equip Buy page: single-item compare + saved-set results.

const { useState: useStateEB, useMemo: useMemoEB, useRef: useRefEB } = React;
const { fmt: ebfmt } = window;

// ─── Autocomplete input ───────────────────────────────────────────────────
function ItemAutocomplete({ value, onChange, onSelect }) {
  const [focused, setFocused] = useStateEB(false);
  const sugs = useMemoEB(() => {
    if (!value) return window.EB_ITEM_SUGGESTIONS.slice(0, 6);
    const v = value.toLowerCase();
    return window.EB_ITEM_SUGGESTIONS.filter((s) => s.toLowerCase().includes(v)).slice(0, 6);
  }, [value]);

  return (
    <div className="ac-wrap">
      <input className="ac-input" type="text" value={value}
             onChange={(e) => onChange(e.target.value)}
             onFocus={() => setFocused(true)}
             onBlur={() => setTimeout(() => setFocused(false), 120)}
             placeholder="Buscar item…"/>
      {focused && sugs.length > 0 && (
        <ul className="ac-list">
          {sugs.map((s) => (
            <li key={s} className="ac-item"
                onMouseDown={() => { onChange(s); onSelect && onSelect(s); }}>
              <window.ICONS.search size={11}/>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────
function EBHeader({ onOpenModal }) {
  return (
    <div className="eb-header">
      <h1 className="eb-title">Equip Buy</h1>
      <button className="btn-secondary eb-manage" onClick={onOpenModal}>
        <window.ICONS.save size={13}/>
        <span>Gerenciar Conjuntos</span>
      </button>
    </div>
  );
}

// ─── Conjuntos strip ──────────────────────────────────────────────────────
function ConjuntosStrip({ sets, activeId, onSelect, onOpenModal }) {
  return (
    <div className="conjuntos-strip">
      <div className="conjuntos-lbl">Conjuntos</div>
      <div className="conjuntos-list">
        {sets.length === 0 && (
          <span className="conjuntos-empty">Nenhum conjunto salvo</span>
        )}
        {sets.map((s) => (
          <button key={s.id}
                  className={`conjunto-pill ${activeId === s.id ? 'conjunto-pill-active' : ''}`}
                  onClick={() => onSelect(s.id)}>
            <span>{s.name}</span>
            <span className="conjunto-pill-tier mono">T{s.nivel}</span>
          </button>
        ))}
        <button className="conjunto-add" onClick={onOpenModal}>
          <window.ICONS.plus size={12}/>
          <span>Novo</span>
        </button>
      </div>
    </div>
  );
}

// ─── Search form ──────────────────────────────────────────────────────────
function SearchForm({ form, setForm, onSubmit }) {
  const set = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div className="card eb-search">
      <div className="eb-field eb-field-name">
        <label>Nome do Item</label>
        <ItemAutocomplete value={form.nome}
                          onChange={(v) => set('nome', v)}/>
      </div>
      <div className="eb-field eb-field-nivel">
        <label>Nível Efetivo <span className="eb-hint">4–12</span></label>
        <input type="number" min="4" max="12" value={form.nivel}
               onChange={(e) => set('nivel', parseInt(e.target.value) || 8)}/>
      </div>
      <div className="eb-field eb-field-qual">
        <label>Qualidade</label>
        <select value={form.qualidade} onChange={(e) => set('qualidade', e.target.value)}>
          {window.EB_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <div className="eb-field eb-field-cidade">
        <label>Minha cidade</label>
        <select value={form.cidade} onChange={(e) => set('cidade', e.target.value)}>
          {window.EB_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button className="btn-primary eb-buscar" onClick={onSubmit}>
        Buscar
      </button>
    </div>
  );
}

// ─── Single-item: summary strip + table ───────────────────────────────────
function SummaryStrip({ data }) {
  return (
    <div className="card eb-summary">
      <div className="eb-sum-col">
        <div className="eb-sum-lbl">Comprar pronto</div>
        <div className="eb-sum-val mono">
          {ebfmt(data.comprarPronto.total)}<span className="eb-sum-unit">prata</span>
        </div>
        <div className="eb-sum-sub">{data.comprarPronto.sub}</div>
      </div>
      <div className="eb-sum-col">
        <div className="eb-sum-lbl">Comprar + encantar</div>
        <div className="eb-sum-val mono eb-sum-cheap">
          {ebfmt(data.comprarEncantar.total)}<span className="eb-sum-unit">prata</span>
          {data.comprarEncantar.cheaper && (
            <span className="eb-cheaper">
              <window.ICONS.star size={10}/>
              <span>mais barato</span>
            </span>
          )}
        </div>
        <div className="eb-sum-sub">{data.comprarEncantar.sub}</div>
      </div>
      <div className="eb-sum-col">
        <div className="eb-sum-lbl">Economia encantando</div>
        <div className="eb-sum-val mono pos">
          +{ebfmt(data.economia)}<span className="eb-sum-unit">prata</span>
        </div>
      </div>
    </div>
  );
}

function ComprarProntoTable({ rows }) {
  return (
    <div className="card eb-table-card">
      <div className="eb-table-head">
        <h3 className="eb-table-title">Comprar pronto</h3>
      </div>
      <table className="eb-table">
        <thead>
          <tr>
            <th>Tier.Enc</th>
            <th>Cidade</th>
            <th className="ff-right">Preço Item</th>
            <th className="ff-right">Teleporte</th>
            <th className="ff-right eb-th-total">Total</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const cls = [
              r.best && 'eb-row-best',
              r.dim && 'eb-row-dim',
            ].filter(Boolean).join(' ');
            return (
              <tr key={i} className={cls}>
                <td>
                  <span className="eb-tier mono">
                    {r.best && <window.ICONS.star size={10}/>}
                    T{r.tier}.{r.enc}
                  </span>
                </td>
                <td className="eb-city">
                  <span>{r.city}</span>
                  {r.locked && <window.ICONS.lock size={11}/>}
                </td>
                <td className="ff-right mono">{r.preco != null ? ebfmt(r.preco) : '—'}</td>
                <td className="ff-right mono eb-tele">{r.tele != null ? ebfmt(r.tele) : '—'}</td>
                <td className="ff-right mono eb-total-cell">{r.total != null ? ebfmt(r.total) : '—'}</td>
                <td className="eb-atual">{r.atualizado}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Set results — slot cards ─────────────────────────────────────────────
function ActionTag({ action }) {
  return <span className="slot-action mono">{action === 'pronto' ? 'pronto' : 'encantar'}</span>;
}

function SlotOption({ kind, opt, cityLabel }) {
  if (opt.noPrice) {
    return (
      <div className="slot-opt slot-opt-local slot-opt-empty">
        <div className="slot-opt-head">
          <span className="slot-opt-tag slot-opt-tag-local">
            <window.ICONS.home size={10}/>
            <span>{cityLabel}</span>
          </span>
        </div>
        <div className="slot-opt-empty-msg">sem preço disponível</div>
      </div>
    );
  }
  const isBest = kind === 'best';
  return (
    <div className={`slot-opt ${isBest ? 'slot-opt-best' : 'slot-opt-local'}`}>
      <div className="slot-opt-head">
        {isBest ? (
          <span className="slot-opt-tag slot-opt-tag-best">
            <window.ICONS.star size={10}/>
            <span>Melhor opção</span>
          </span>
        ) : (
          <span className="slot-opt-tag slot-opt-tag-local">
            <window.ICONS.home size={10}/>
            <span>{cityLabel}</span>
          </span>
        )}
        <span className="slot-opt-meta mono">
          T{opt.tier}.{opt.enc} <span className="dotdiv">·</span> <ActionTag action={opt.action}/>
        </span>
      </div>
      <div className="slot-opt-price mono">
        {ebfmt(opt.total)}<span className="slot-opt-unit"> prata</span>
      </div>
      <div className="slot-opt-detail">
        {opt.city}{opt.detail ? ` · ${opt.detail}` : ''}
      </div>
    </div>
  );
}

function SlotCard({ slot, cityLabel }) {
  const [u, t] = slot.slotLabel.split(' · ');
  return (
    <div className="slot-card">
      <div className="slot-card-head">
        <div className="slot-card-lbl">
          <span className="slot-card-l1">{u}</span>
          <span className="dotdiv">·</span>
          <span className="slot-card-l2">{t}</span>
        </div>
        <span className="slot-card-nv mono">Nv {slot.nivel}</span>
      </div>
      <div className="slot-card-item">{slot.itemName}</div>
      <div className="slot-card-opts">
        <SlotOption kind="best"  opt={slot.melhor} cityLabel={cityLabel}/>
        <SlotOption kind="local" opt={slot.local}  cityLabel={cityLabel}/>
      </div>
    </div>
  );
}

function SetResults({ data }) {
  return (
    <div className="eb-set-results">
      <div className="eb-set-summary">
        <div className="eb-set-id">
          <h2 className="eb-set-name">{data.setName}</h2>
          <span className="eb-set-city">{data.cidade}</span>
        </div>
        <div className="eb-set-totals">
          <div className="eb-set-total">
            <div className="eb-set-total-lbl">Custo {data.cidade}</div>
            <div className="eb-set-total-v mono eb-set-total-local">
              {ebfmt(data.custoCidade)}<span className="eb-sum-unit">prata</span>
            </div>
          </div>
          <div className="eb-set-total">
            <div className="eb-set-total-lbl">Custo total otimizado</div>
            <div className="eb-set-total-v mono pos">
              {ebfmt(data.custoOtimizado)}<span className="eb-sum-unit">prata</span>
            </div>
          </div>
        </div>
      </div>
      <div className="slot-grid">
        {data.slots.map((s) => (
          <SlotCard key={s.id} slot={s} cityLabel={data.cidade}/>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
function EquipBuyPage() {
  const [mode, setMode] = useStateEB('item');           // 'item' | 'set'
  const [form, setForm] = useStateEB({ nome: 'Arco', nivel: 8, qualidade: 'Bom', cidade: 'Fort Sterling' });
  const [activeSet, setActiveSet] = useStateEB(null);
  const [modalOpen, setModalOpen] = useStateEB(false);
  const [savedSets, setSavedSets] = useStateEB([
    { id: 'arqueiro', name: 'Arqueiro', cityShort: 'FS', cidade: 'Fort Sterling', nivel: 8, slots: [] },
  ]);

  const onBuscar = () => {
    if (!form.nome.trim()) return;
    setMode('item');
    setActiveSet(null);
  };

  const onSelectSet = (id) => {
    setActiveSet(id);
    setMode('set');
  };

  const onCreateSet = (newSet) => {
    setSavedSets((arr) => [...arr, newSet]);
  };
  const onDeleteSet = (id) => {
    setSavedSets((arr) => arr.filter((s) => s.id !== id));
    if (activeSet === id) { setActiveSet(null); setMode('item'); }
  };

  return (
    <div className="page-inner">
      <EBHeader onOpenModal={() => setModalOpen(true)}/>
      <ConjuntosStrip sets={savedSets} activeId={activeSet}
                      onSelect={onSelectSet}
                      onOpenModal={() => setModalOpen(true)}/>
      <SearchForm form={form} setForm={setForm} onSubmit={onBuscar}/>

      {mode === 'item' && window.EB_MOCK_ITEM && (
        <div className="eb-results">
          <SummaryStrip data={window.EB_MOCK_ITEM}/>
          <ComprarProntoTable rows={window.EB_MOCK_ITEM.rows}/>
        </div>
      )}
      {mode === 'set' && activeSet && (
        <SetResults data={window.EB_MOCK_SET}/>
      )}

      <window.ConjuntosModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        savedSets={savedSets}
        onCreate={onCreateSet}
        onDelete={onDeleteSet}/>
    </div>
  );
}

Object.assign(window, { EquipBuyPage });
