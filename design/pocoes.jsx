// pocoes.jsx — Poções (potions) profitability analysis.
// Two modes: crafting & selling in the same city, or the Brecilien bonus route.

const { useState: useStateP, useMemo: useMemoP } = React;

// Shared helpers from hub.jsx
const { Checkbox: PCheckbox, PrimaryButton: PPrimaryButton,
        TierBadge: PTierBadge, fmt: pfmt, fmtPct: pfmtPct } = window;

// ─── Reference data ────────────────────────────────────────────────────────
const POC_CITIES = [
  { name: 'Caerleon',      short: 'CL' },
  { name: 'Brecilien',     short: 'BR' },
  { name: 'Lymhurst',      short: 'LH' },
  { name: 'Martlock',      short: 'MT' },
  { name: 'Fort Sterling', short: 'FS' },
  { name: 'Thetford',      short: 'TF' },
  { name: 'Bridgewatch',   short: 'BW' },
];
const CITY_NAME = Object.fromEntries(POC_CITIES.map((c) => [c.short, c.name]));

const HERBS = {
  arcano:    { name: 'Agárico Arcano',        color: 'var(--fiber)'   },
  confrei:   { name: 'Confrei Brilhante',     color: 'var(--positive)'},
  bardana:   { name: 'Bardana Ameada',        color: 'var(--leather)' },
  babosa:    { name: 'Babosa da Alvorada',    color: 'var(--accent)'  },
  dedaleira: { name: 'Dedaleira Esquiva',     color: 'var(--info)'    },
  verbasco:  { name: 'Verbasco Ardente',      color: 'var(--negative)'},
  milfolhas: { name: 'Mil-folhas Necrófago',  color: 'var(--metal)'   },
};

const POTIONS = [
  { key: 'cura',        name: 'Poção de Cura',        cat: 'Cura',        color: 'var(--fiber)',
    recipe: [{ herb: 'arcano', qty: 4 }, { herb: 'confrei', qty: 4 }],   output: 5 },
  { key: 'energia',     name: 'Poção de Energia',     cat: 'Energia',     color: 'var(--info)',
    recipe: [{ herb: 'bardana', qty: 4 }, { herb: 'babosa', qty: 4 }],   output: 5 },
  { key: 'resistencia', name: 'Poção de Resistência', cat: 'Resistência', color: 'var(--leather)',
    recipe: [{ herb: 'dedaleira', qty: 4 }, { herb: 'confrei', qty: 2 }], output: 5 },
  { key: 'gigantify',   name: 'Poção Gigantify',      cat: 'Gigantify',   color: 'var(--accent)',
    recipe: [{ herb: 'verbasco', qty: 6 }, { herb: 'milfolhas', qty: 2 }], output: 5 },
  { key: 'veneno',      name: 'Poção de Veneno',      cat: 'Veneno',      color: 'var(--positive)',
    recipe: [{ herb: 'milfolhas', qty: 4 }, { herb: 'dedaleira', qty: 4 }], output: 5 },
];
const POC_CATS = ['Cura', 'Energia', 'Resistência', 'Gigantify', 'Veneno'];

const ATUAL = ['2h atrás', '23h atrás', '21h atrás', '14h atrás', '10h atrás',
               '20h atrás', '47m atrás', '1h atrás', '4h atrás', '24h atrás'];

// Deterministic pseudo-random for stable mock data
function pseed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
const pvar = (s, lo, hi) => lo + pseed(s) * (hi - lo);

// Ingredient unit price for a herb at a tier (and optionally a city)
function herbPrice(herbKey, tier, citySeed = '') {
  const tierMul = Math.pow(2.35, tier - 2);
  return Math.round(190 * tierMul * pvar(`${herbKey}-${tier}-${citySeed}-p`, 0.78, 1.22));
}

// Focus cost per batch given tier and spec level (higher spec → less focus)
function focoBatch(tier, spec) {
  const base = 320 * Math.pow(1.9, tier - 2);
  const eff = 1 - Math.min(spec, 100) / 100 * 0.55;
  return Math.round(base * eff);
}

// ─── Row builders ──────────────────────────────────────────────────────────
function craftCost(potion, tier, bonus, citySeed = '') {
  // total herb cost, reduced by the production (RRR) bonus
  let total = 0;
  potion.recipe.forEach((ing) => {
    total += ing.qty * herbPrice(ing.herb, tier, citySeed);
  });
  const rrr = 1 - bonus / 100 * 0.45;  // bonus lowers effective material use
  return Math.round(total * rrr);
}

function makeSameCityRows(taxa, bonus, specs) {
  const rows = [];
  POTIONS.forEach((potion) => {
    [4, 5, 6, 7].forEach((tier, ti) => {
      const city = POC_CITIES[(tier + potion.key.length) % 5];
      const custo = craftCost(potion, tier, bonus, '');
      const unitSell = Math.round(custo / potion.output *
                        pvar(`${potion.key}-${tier}-m`, 0.55, 2.6));
      const receita = Math.round(unitSell * potion.output);
      const lucroBatch = Math.round(receita * (1 - taxa / 100) - custo);
      const lucroUnid = Math.round(lucroBatch / potion.output);
      const pct = parseFloat(((lucroBatch / custo) * 100).toFixed(1));
      const vol = Math.round(pvar(`${potion.key}-${tier}-v`, 40, 7200));
      const spec = specs[tier] ?? 0;
      const fb = focoBatch(tier, spec);
      const prataFoco = Math.round(lucroBatch / fb);
      rows.push({
        id: `${potion.key}-${tier}`,
        potion, tier,
        cityShort: city.short,
        custo, receita, lucroBatch, lucroUnid, pct, vol,
        focoBatch: fb, prataFoco,
        atual: ATUAL[(tier + ti + potion.key.length) % ATUAL.length],
      });
    });
  });
  rows.sort((a, b) => b.lucroBatch - a.lucroBatch);
  return rows;
}

function makeBrecilienRows(taxa, bonus) {
  // Brecilien production bonus is fixed at 15% — overrides the daily bonus toggle.
  const BR_BONUS = 15;
  const rows = [];
  POTIONS.forEach((potion) => {
    [4, 5, 6, 7].forEach((tier, ti) => {
      const sellCity = (tier + ti) % 2 === 0 ? 'CL' : 'BR';
      const teleporte = sellCity === 'CL';  // selling in Caerleon needs a teleport
      // Each ingredient sourced from its cheapest royal city
      const sources = potion.recipe.map((ing, idx) => {
        const candidates = ['LH', 'MT', 'FS', 'TF', 'BW'];
        let best = null;
        candidates.forEach((cs) => {
          const price = herbPrice(ing.herb, tier, cs);
          if (!best || price < best.price) best = { city: cs, price };
        });
        return { ...ing, ...best, atual: ATUAL[(idx + tier) % ATUAL.length] };
      });
      const rawCost = sources.reduce((s, x) => s + x.qty * x.price, 0);
      const custo = Math.round(rawCost * (1 - BR_BONUS / 100 * 0.45));
      const unitSell = Math.round(custo / potion.output *
                        pvar(`${potion.key}-${tier}-bm`, 0.7, 2.2));
      const receita = Math.round(unitSell * potion.output);
      const teleCost = teleporte ? Math.round(rawCost * 0.04) : 0;
      const lucroBatch = Math.round(receita * (1 - taxa / 100) - custo - teleCost);
      const lucroUnid = Math.round(lucroBatch / potion.output);
      const pct = parseFloat(((lucroBatch / custo) * 100).toFixed(1));
      const vol = Math.round(pvar(`${potion.key}-${tier}-bv`, 60, 6800));
      rows.push({
        id: `${potion.key}-${tier}-br`,
        potion, tier, sellCity, teleporte, teleCost,
        custo, receita, lucroBatch, lucroUnid, pct, vol, sources,
        atual: ATUAL[(tier + ti) % ATUAL.length],
      });
    });
  });
  rows.sort((a, b) => b.lucroBatch - a.lucroBatch);
  return rows;
}

// ─── Small components ───────────────────────────────────────────────────────
function PotionIcon({ color }) {
  return (
    <div className="bm-icon" style={{ color }}>
      <window.ICONS.flask size={16}/>
    </div>
  );
}

function HerbSquare({ herbKey, qty }) {
  const herb = HERBS[herbKey];
  return (
    <div className="ing-sq">
      <div className="ing-mark" style={{ color: herb.color }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1.5"
                stroke="currentColor" strokeWidth="1.2"/>
          <rect x="5" y="5" width="4" height="4" fill="currentColor" opacity="0.5"/>
        </svg>
      </div>
      {qty && <span className="ing-qty">×{qty}</span>}
    </div>
  );
}

function CityLabel({ short }) {
  const isBR = short === 'BR';
  return (
    <span className={`poc-city ${isBR ? 'poc-city-br' : ''}`}>
      {short}
      {isBR && <span className="poc-city-star"><window.ICONS.star size={11}/></span>}
    </span>
  );
}

// ─── Recipe modal ────────────────────────────────────────────────────────────
function RecipeModal({ row, tier, taxa, onClose }) {
  const potion = row.potion;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">
            {potion.name}
            <span className="poc-modal-tier mono">T{tier}</span>
          </h3>
          <button className="modal-x" onClick={onClose} aria-label="Fechar">
            <window.ICONS.x size={16}/>
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-sec-lbl">Ingredientes</div>
            <div className="poc-recipe-list">
              {potion.recipe.map((ing) => {
                const herb = HERBS[ing.herb];
                const unit = herbPrice(ing.herb, tier, '');
                return (
                  <div key={ing.herb} className="poc-recipe-row">
                    <HerbSquare herbKey={ing.herb} qty={ing.qty}/>
                    <span className="poc-recipe-name">{herb.name}</span>
                    <span className="poc-recipe-qty mono">×{ing.qty}</span>
                    <span className="poc-recipe-cost mono">
                      {pfmt(unit)}<span className="poc-recipe-cost-u">/un.</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="modal-section">
            <div className="modal-sec-lbl">Resultado</div>
            <div className="poc-output">
              <span className="poc-output-lbl">Resultado:</span>
              <span className="poc-output-v mono">{potion.output}</span>
              <span className="poc-output-u">unidades por batch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Brecilien expandable detail ──────────────────────────────────────────────
function BrecilienDetail({ row, colSpan }) {
  return (
    <tr className="poc-detail-row">
      <td colSpan={colSpan}>
        <div className="poc-detail-inner">
          <div className="poc-detail-title">Onde comprar cada ingrediente</div>
          <div className="poc-detail-list">
            {row.sources.map((s) => {
              const herb = HERBS[s.herb];
              return (
                <div key={s.herb} className="poc-detail-item">
                  <HerbSquare herbKey={s.herb} qty={s.qty}/>
                  <span className="poc-detail-name">{herb.name}</span>
                  <span className="poc-detail-qty mono">×{s.qty}</span>
                  <span className="poc-detail-city">
                    <window.ICONS.building size={13}/>
                    {CITY_NAME[s.city]}
                  </span>
                  <span className="poc-detail-price mono">{pfmt(s.price)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Tables ────────────────────────────────────────────────────────────────
function SameCityTable({ rows, foco, onInfo }) {
  return (
    <div className="card bm-table-card">
      <div className="bm-scroll">
        <table className="bm-table poc-table">
          <thead>
            <tr>
              <th>Poção</th>
              <th>Tier</th>
              <th>Cidade</th>
              <th className="poc-r">Custo ingred.</th>
              <th className="poc-r bm-sort">Lucro/batch <window.ICONS.arrowDown size={10}/></th>
              <th className="poc-r">Lucro/unid.</th>
              <th className="poc-r">%</th>
              {foco && <th className="poc-r">Foco/batch</th>}
              {foco && <th className="poc-r">Prata/foco</th>}
              <th className="poc-r">Vol./dia</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const neg = row.lucroBatch < 0;
              const lucroCls = neg ? 'neg' : 'pos';
              return (
                <tr key={row.id} className={neg ? 'poc-row-neg' : ''}>
                  <td className="poc-cell-item">
                    <div className="poc-item-inner">
                      <PotionIcon color={row.potion.color}/>
                      <span className="poc-item-name">{row.potion.name}</span>
                      <button className="poc-info" title="Ver receita"
                              onClick={() => onInfo(row)}>
                        <window.ICONS.info size={15}/>
                      </button>
                    </div>
                  </td>
                  <td><PTierBadge tier={row.tier}/></td>
                  <td><CityLabel short={row.cityShort}/></td>
                  <td className="poc-cost mono">{pfmt(row.custo)}</td>
                  <td className={`poc-lucro mono ${lucroCls}`}>
                    {(row.lucroBatch >= 0 ? '+' : '') + pfmt(row.lucroBatch)}
                  </td>
                  <td className={`poc-unid mono ${lucroCls}`}>
                    {(row.lucroUnid >= 0 ? '+' : '') + pfmt(row.lucroUnid)}
                  </td>
                  <td className={`poc-pct mono ${neg ? 'neg' : 'pos'}`}>{pfmtPct(row.pct)}</td>
                  {foco && <td className="poc-foco-col mono">{pfmt(row.focoBatch)}</td>}
                  {foco && <td className="poc-prata-foco mono">{pfmt(row.prataFoco)}</td>}
                  <td className="poc-vol mono">{pfmt(row.vol)}</td>
                  <td className="poc-atual">{row.atual}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrecilienTable({ rows, onInfo }) {
  const [openId, setOpenId] = useStateP(null);
  const COLS = 9;
  return (
    <div className="card bm-table-card">
      <div className="bm-scroll">
        <table className="bm-table poc-table">
          <thead>
            <tr>
              <th>Poção</th>
              <th>Tier</th>
              <th>Cidade de venda</th>
              <th className="poc-r">Custo ingred.</th>
              <th>Teleporte</th>
              <th className="poc-r bm-sort">Lucro/batch <window.ICONS.arrowDown size={10}/></th>
              <th className="poc-r">Lucro/unid.</th>
              <th className="poc-r">%</th>
              <th className="poc-r">Vol./dia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const neg = row.lucroBatch < 0;
              const lucroCls = neg ? 'neg' : 'pos';
              const open = openId === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr className={`poc-row-clickable ${open ? 'poc-row-open' : ''} ${neg ? 'poc-row-neg' : ''}`}
                      onClick={() => setOpenId(open ? null : row.id)}>
                    <td className="poc-cell-item">
                      <div className="poc-item-inner">
                        <span className="poc-expand-chev"><window.ICONS.chevronRight size={14}/></span>
                        <PotionIcon color={row.potion.color}/>
                        <span className="poc-item-name">{row.potion.name}</span>
                        <button className="poc-info" title="Ver receita"
                                onClick={(e) => { e.stopPropagation(); onInfo(row); }}>
                          <window.ICONS.info size={15}/>
                        </button>
                      </div>
                    </td>
                    <td><PTierBadge tier={row.tier}/></td>
                    <td><CityLabel short={row.sellCity}/></td>
                    <td className="poc-cost mono">{pfmt(row.custo)}</td>
                    <td>
                      {row.teleporte
                        ? <span className="poc-tele-yes"><window.ICONS.bolt size={11}/>SIM</span>
                        : <span className="poc-tele-no mono">—</span>}
                    </td>
                    <td className={`poc-lucro mono ${lucroCls}`}>
                      {(row.lucroBatch >= 0 ? '+' : '') + pfmt(row.lucroBatch)}
                    </td>
                    <td className={`poc-unid mono ${lucroCls}`}>
                      {(row.lucroUnid >= 0 ? '+' : '') + pfmt(row.lucroUnid)}
                    </td>
                    <td className={`poc-pct mono ${neg ? 'neg' : 'pos'}`}>{pfmtPct(row.pct)}</td>
                    <td className="poc-vol mono">{pfmt(row.vol)}</td>
                  </tr>
                  {open && <BrecilienDetail row={row} colSpan={COLS}/>}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function PotionsPage() {
  const [foco,     setFoco]     = useStateP(false);
  const [bonus,    setBonus]    = useStateP(0);
  const [taxa,     setTaxa]     = useStateP(6.5);
  const [mode,     setMode]     = useStateP('mesma');     // 'mesma' | 'brecilien'
  const [cat,      setCat]      = useStateP('todas');
  const [cidade,   setCidade]   = useStateP('todas');
  const [soLucro,  setSoLucro]  = useStateP(true);
  const [loading,  setLoading]  = useStateP(false);
  const [modalRow, setModalRow] = useStateP(null);
  const [specs,    setSpecs]    = useStateP({ 2: 100, 3: 100, 4: 80, 5: 60, 6: 47, 7: 30, 8: 0 });

  const setSpec = (t, v) => setSpecs((s) => ({ ...s, [t]: v }));

  const sameRows = useMemoP(() => makeSameCityRows(taxa, bonus, specs),
    [taxa, bonus, specs]);
  const brecRows = useMemoP(() => makeBrecilienRows(taxa, bonus),
    [taxa, bonus]);

  const baseRows = mode === 'mesma' ? sameRows : brecRows;
  const filtered = useMemoP(() => baseRows.filter((r) => {
    if (cat !== 'todas' && r.potion.cat !== cat) return false;
    if (mode === 'mesma' && cidade !== 'todas' && r.cityShort !== cidade) return false;
    if (soLucro && r.lucroBatch <= 0) return false;
    return true;
  }), [baseRows, cat, cidade, soLucro, mode]);

  const onAnalisar = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 750);
  };

  const ruleText = mode === 'mesma'
    ? 'compra ingredientes e vende poções na mesma cidade.'
    : 'craft no Brecilien (bônus de produção 15%) e venda em Caerleon ou Brecilien.';

  return (
    <div className="page-inner page-inner-wide">
      {/* Filter bar */}
      <div className="bm-filters">
        <span className="poc-label">Poções</span>
        <div className="cfgbar-sep"/>
        <PCheckbox label="Foco" checked={foco} onChange={setFoco}/>
        <label className="bm-field">
          <span className="bm-field-lbl">Bônus Diário</span>
          <select className="bm-select" style={{ width: 90 }} value={bonus}
                  onChange={(e) => setBonus(Number(e.target.value))}>
            <option value={0}>0%</option>
            <option value={10}>10%</option>
            <option value={20}>20%</option>
          </select>
        </label>
        <label className="bm-field">
          <span className="bm-field-lbl">Taxa Venda</span>
          <span className="poc-num-wrap">
            <input type="number" step="0.5" min="0" value={taxa}
                   onChange={(e) => setTaxa(parseFloat(e.target.value) || 0)}/>
            <span className="poc-num-suffix">%</span>
          </span>
        </label>
        <div className="bm-spacer"/>
        <PPrimaryButton onClick={onAnalisar} loading={loading} progress={[0, 4]}>
          Analisar
        </PPrimaryButton>
      </div>

      {/* Foco spec panel (revealed when Foco is checked) */}
      {foco && (
        <div className={`pnl pnl-open poc-foco-panel`}>
          <div className="pnl-body-inner" style={{ padding: '12px 18px 16px' }}>
            <div className="poc-detail-title">Especialização em Alquimia por tier</div>
            <div className="poc-foco-grid">
              {[2, 3, 4, 5, 6, 7, 8].map((t) => (
                <label key={t} className="poc-foco-field">
                  <span className="poc-foco-lbl">T{t}</span>
                  <input type="number" min="0" max="100" value={specs[t]}
                         onChange={(e) => setSpec(t, parseFloat(e.target.value) || 0)}/>
                </label>
              ))}
            </div>
            <div className="poc-foco-hint">
              Spec maior reduz o foco gasto por batch — reflete nas colunas Foco/batch e Prata/foco.
            </div>
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="poc-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'mesma'}
                className={`poc-tab ${mode === 'mesma' ? 'poc-tab-on' : ''}`}
                onClick={() => setMode('mesma')}>
          Mesma Cidade
          <span className="poc-tab-badge mono">{sameRows.filter((r) => r.lucroBatch > 0).length}</span>
        </button>
        <button role="tab" aria-selected={mode === 'brecilien'}
                className={`poc-tab ${mode === 'brecilien' ? 'poc-tab-on' : ''}`}
                onClick={() => setMode('brecilien')}>
          <span className="poc-tab-star"><window.ICONS.star size={13}/></span>
          Via Brecilien
          <span className="poc-tab-badge mono">{brecRows.filter((r) => r.lucroBatch > 0).length}</span>
        </button>
      </div>

      {/* Secondary filters */}
      <div className="poc-subfilters">
        <div className="poc-count">
          <span className="poc-count-n mono">{pfmt(filtered.length)}</span>
          resultado(s) — {ruleText}
        </div>
        <div className="poc-subfilters-right">
          <select className="bm-select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="todas">Todas as poções</option>
            {POC_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {mode === 'mesma' && (
            <select className="bm-select" value={cidade} onChange={(e) => setCidade(e.target.value)}>
              <option value="todas">Todas as cidades</option>
              {POC_CITIES.map((c) => <option key={c.short} value={c.short}>{c.name}</option>)}
            </select>
          )}
          <PCheckbox label="Só lucrativo" checked={soLucro} onChange={setSoLucro}/>
        </div>
      </div>

      {/* Results table */}
      {filtered.length === 0 ? (
        <div className="bm-empty">
          <div className="bm-empty-icon"><window.ICONS.flask size={36}/></div>
          <div className="bm-empty-title">Nenhuma poção lucrativa encontrada</div>
          <div className="bm-empty-body">
            Ajuste os filtros, desative “Só lucrativo” ou revise a taxa de venda.
          </div>
        </div>
      ) : mode === 'mesma' ? (
        <SameCityTable rows={filtered} foco={foco} onInfo={setModalRow}/>
      ) : (
        <BrecilienTable rows={filtered} onInfo={setModalRow}/>
      )}

      {modalRow && (
        <RecipeModal row={modalRow} tier={modalRow.tier} taxa={taxa}
                     onClose={() => setModalRow(null)}/>
      )}
    </div>
  );
}

Object.assign(window, { PotionsPage });
