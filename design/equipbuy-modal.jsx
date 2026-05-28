// equipbuy-modal.jsx — "Gerenciar Conjuntos" CRUD modal.

const { useState: useStateM, useEffect: useEffectM } = React;

function ConjuntosModal({ open, onClose, savedSets, onCreate, onDelete }) {
  const [name, setName] = useStateM('');
  const [city, setCity] = useStateM('Fort Sterling');
  const [slots, setSlots] = useStateM(() =>
    window.EB_SLOT_DEFS.map((s) => ({ id: s.id, item: '', nivel: 8, qualidade: 'Bom' }))
  );

  // Close on Esc
  useEffectM(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSlot = (i, k, v) => {
    setSlots((arr) => arr.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  };

  const cityShort = (c) =>
    c === 'Fort Sterling' ? 'FS'
    : c === 'Lymhurst' ? 'LY'
    : c === 'Martlock' ? 'ML'
    : c === 'Thetford' ? 'TF'
    : c === 'Bridgewatch' ? 'BW'
    : c === 'Brecilien' ? 'BR'
    : c === 'Caerleon' ? 'CL'
    : '—';

  const onSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      id: Math.random().toString(36).slice(2, 9),
      name: name.trim(),
      cityShort: cityShort(city),
      cidade: city,
      nivel: slots[0]?.nivel ?? 8,
      slots: slots.map((s, i) => ({
        ...window.EB_SLOT_DEFS[i],
        item: s.item || window.EB_SLOT_DEFS[i].subLabel,
        nivel: s.nivel,
        qualidade: s.qualidade,
      })),
    });
    setName('');
    setSlots(window.EB_SLOT_DEFS.map((s) => ({ id: s.id, item: '', nivel: 8, qualidade: 'Bom' })));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2 className="modal-title">Conjuntos de Equipamentos</h2>
          <button className="modal-x" onClick={onClose} aria-label="Fechar">
            <window.ICONS.x size={16}/>
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-sec-lbl">Salvos</div>
            {savedSets.length === 0 ? (
              <div className="modal-empty">Nenhum conjunto salvo ainda.</div>
            ) : (
              <ul className="saved-list">
                {savedSets.map((s) => (
                  <li key={s.id} className="saved-row">
                    <span className="saved-name">{s.name}</span>
                    <span className="saved-city mono">{s.cityShort}</span>
                    <div className="saved-actions">
                      <button className="btn-ghost-edit" title="Editar">
                        <window.ICONS.pencil size={12}/>
                        <span>Editar</span>
                      </button>
                      <button className="btn-ghost-del"
                              onClick={() => onDelete(s.id)} title="Excluir">
                        <window.ICONS.trash size={12}/>
                        <span>Excluir</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-section novo-section">
            <div className="modal-sec-lbl">Novo conjunto</div>
            <div className="novo-top">
              <label className="novo-field">
                <span>Nome</span>
                <input type="text" value={name}
                       placeholder="Ex: Arqueiro PvP"
                       onChange={(e) => setName(e.target.value)}/>
              </label>
              <label className="novo-field">
                <span>Minha cidade</span>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {window.EB_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="novo-table">
              <div className="novo-table-head">
                <div>Slot</div>
                <div>Item</div>
                <div>Nível</div>
                <div>Qualidade</div>
              </div>
              {window.EB_SLOT_DEFS.map((s, i) => (
                <div key={s.id} className="novo-table-row">
                  <div className="novo-slot">
                    <div className="novo-slot-name">{s.label}</div>
                    <div className="novo-slot-sub">{s.subLabel}</div>
                  </div>
                  <input className="novo-item" type="text"
                         placeholder={s.subLabel}
                         value={slots[i].item}
                         onChange={(e) => onSlot(i, 'item', e.target.value)}/>
                  <input className="novo-nivel" type="number"
                         min="4" max="12" value={slots[i].nivel}
                         onChange={(e) => onSlot(i, 'nivel', parseInt(e.target.value) || 8)}/>
                  <select className="novo-qual" value={slots[i].qualidade}
                          onChange={(e) => onSlot(i, 'qualidade', e.target.value)}>
                    {window.EB_QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="novo-actions">
              <button className="btn-primary modal-create" onClick={onSubmit}>
                <window.ICONS.plus size={14}/>
                <span>Criar conjunto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ConjuntosModal });
