// refining.jsx — Canonical layout for the four resource refining pages
// (Madeira, Tecido, Couro, Minério). Parameterized by resource key.

const { useState: useStateR, useMemo: useMemoR } = React;

// Reach into shared helpers exposed by hub.jsx
const { Checkbox: RCheckbox, PrimaryButton: RPrimaryButton,
        EnchSup: REnchSup, TierBadge: RTierBadge,
        fmt: rfmt, fmtCompact: rfmtCompact, fmtPct: rfmtPct } = window;

// ─── Per-resource config ──────────────────────────────────────────────────
const REFINING_META = {
  madeira: { city: 'Fort Sterling', cityShort: 'FS', iconKey: 'trees',
             color: 'var(--wood)',    label: 'Madeira', item: 'Tábuas' },
  tecido:  { city: 'Lymhurst',      cityShort: 'LY', iconKey: 'ripple',
             color: 'var(--fiber)',   label: 'Tecido',  item: 'Tecido' },
  couro:   { city: 'Martlock',      cityShort: 'ML', iconKey: 'shield',
             color: 'var(--leather)', label: 'Couro',   item: 'Couro' },
  minerio: { city: 'Thetford',      cityShort: 'TF', iconKey: 'hammer',
             color: 'var(--metal)',   label: 'Minério', item: 'Lingote' },
};

const CITIES = [
  { name: 'Fort Sterling', short: 'FS' },
  { name: 'Lymhurst',      short: 'LY' },
  { name: 'Martlock',      short: 'ML' },
  { name: 'Thetford',      short: 'TF' },
  { name: 'Bridgewatch',   short: 'BW' },
];

// Deterministic pseudo-random for stable mock data
function rseed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
const variation = (seed, lo, hi) => lo + rseed(seed) * (hi - lo);

// ─── Result row generator ─────────────────────────────────────────────────
function makeRow(resource, tier, enc) {
  const tierMul = Math.pow(2.05, tier - 4);
  const encMul  = enc === 0 ? 1 : 1 + enc * 0.55;
  const baseLucro = 2400 * tierMul * encMul * variation(`${resource}-${tier}-${enc}-l`, 0.92, 1.08);
  const lucro = Math.round(baseLucro);
  const pct   = parseFloat((2 + tier * 0.6 + enc * 1.6 +
                            variation(`${resource}-${tier}-${enc}-p`, -2, 2)).toFixed(1));
  const vol   = Math.round(14000 / (tierMul * encMul) *
                            variation(`${resource}-${tier}-${enc}-v`, 0.7, 1.3));

  // Per-city breakdown
  const cities = CITIES.map((c, i) => {
    const cmul = variation(`${resource}-${tier}-${enc}-${c.short}-l`, 0.65, 1.15);
    return {
      ...c,
      lucro: Math.round(baseLucro * cmul),
      vol:   Math.round(vol * variation(`${resource}-${tier}-${enc}-${c.short}-v`, 0.4, 1.1)),
      precoMedio: Math.round(baseLucro * 12 * variation(`${resource}-${tier}-${enc}-${c.short}-pm`, 0.9, 1.15)),
    };
  });

  // "Melhor preço" — optimal cross-city combo
  const bestLucro = Math.round(baseLucro * 1.35);
  const ingredientCities = [
    { short: 'BW', tag: '22h' },
    { short: 'LY', tag: '18h' },
    { short: 'ML', tag: '14h' },
  ];
  const calloutPrata = Math.round(baseLucro * 0.022);

  return { tier, enc, lucro, pct, vol, cities, bestLucro, ingredientCities, calloutPrata };
}

function makeTierRows(resource, tier) {
  return [0, 1, 2, 3].map((enc) => makeRow(resource, tier, enc));
}

// Indicações (right panel) — 8 ranked items mixing tiers/enchants
function makeIndicacoes(resource, mode) {
  const meta = REFINING_META[resource];
  const pool = [];
  for (let t = 5; t <= 8; t++) {
    for (let e = 0; e <= 3; e++) {
      pool.push({ tier: t, enc: e, row: makeRow(resource, t, e) });
    }
  }
  const scored = pool.map((p) => {
    let score;
    if (mode === 'foco') score = p.row.lucro * 4 * variation(`${resource}-${p.tier}-${p.enc}-foco`, 0.8, 1.2);
    else if (mode === 'fama') score = (p.row.lucro * 0.4) * variation(`${resource}-${p.tier}-${p.enc}-fama`, 0.5, 1.6);
    else score = p.row.lucro;
    return { ...p, score: Math.round(score) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((p, i) => ({
    label: `${meta.item} T${p.tier}.${p.enc}`,
    tier: p.tier,
    enc: p.enc,
    value: p.score,
    pct: p.row.pct,
    vol: p.row.vol,
    pico: ['18h–22h', '19h–01h', '17h–23h', '20h–02h', '15h–21h'][i % 5],
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────
function CityFlag({ city }) {
  return (
    <span className="city-flag">
      <window.ICONS.flag size={14}/>
      <span>{city}</span>
    </span>
  );
}

function TierSelector({ tier, onChange }) {
  return (
    <div className="tier-seg" role="tablist">
      {[4, 5, 6, 7, 8].map((t) => (
        <button key={t} role="tab" aria-selected={t === tier}
                className={`tier-seg-opt ${t === tier ? 'tier-seg-on' : ''}`}
                onClick={() => onChange(t)}>T{t}</button>
      ))}
    </div>
  );
}

function ConfigBar({ resource, tier, setTier, opts, setOpt, loading, progress, onRefresh }) {
  const meta = REFINING_META[resource];
  return (
    <div className="cfgbar">
      <CityFlag city={meta.city}/>
      <div className="cfgbar-sep"/>
      <TierSelector tier={tier} onChange={setTier}/>
      <div className="cfgbar-sep"/>
      <div className="cfgbar-checks">
        <RCheckbox label="Comprar via buy order" checked={opts.buyOrder}
                   onChange={(v) => setOpt('buyOrder', v)}/>
        <RCheckbox label="Usar foco" checked={opts.foco}
                   onChange={(v) => setOpt('foco', v)}/>
        <RCheckbox label="Bônus diário 10%" checked={opts.b10}
                   onChange={(v) => setOpt('b10', v)}/>
        <RCheckbox label="Bônus diário 20%" checked={opts.b20}
                   onChange={(v) => setOpt('b20', v)}/>
      </div>
      <div className="cfgbar-spacer"/>
      <RPrimaryButton onClick={onRefresh} loading={loading} progress={progress}>
        {loading ? 'Carregando…' : 'Refresh preços'}
      </RPrimaryButton>
    </div>
  );
}

// Generic collapsible panel
function Panel({ open, onToggle, label, summary, summaryEl, children }) {
  return (
    <div className={`pnl ${open ? 'pnl-open' : ''}`}>
      <button className="pnl-head" onClick={onToggle} aria-expanded={open}>
        <span className="pnl-label">{label}</span>
        {summary && <span className="pnl-summary">{summary}</span>}
        {summaryEl}
        <span className="pnl-chev">
          <window.ICONS.chevronRight size={14}/>
        </span>
      </button>
      <div className="pnl-body" aria-hidden={!open}>
        <div className="pnl-body-inner">{children}</div>
      </div>
    </div>
  );
}

function SpecsPanel({ open, onToggle, specs, setSpecs, taxa, setTaxa }) {
  const summary = `T6: ${specs[6]}% · T7: ${specs[7]}% · Taxa: ${taxa}%`;
  return (
    <Panel open={open} onToggle={onToggle}
           label="Especialização e Taxa" summary={summary}>
      <div className="specs-row">
        <label className="specs-field">
          <span className="specs-lbl">Taxa de venda</span>
          <div className="specs-input-wrap" style={{ width: 80 }}>
            <input type="number" value={taxa} min="0" max="100"
                   onChange={(e) => setTaxa(parseFloat(e.target.value) || 0)}/>
            <span className="specs-suffix">%</span>
          </div>
        </label>
      </div>
      <div className="specs-row">
        <span className="specs-lbl">Especialização por tier</span>
        <div className="specs-tier-grid">
          {[4, 5, 6, 7, 8].map((t) => (
            <label key={t} className="specs-tier-field">
              <span className="specs-tier-lbl">T{t}</span>
              <input type="number" value={specs[t]} min="0" max="100"
                     onChange={(e) => setSpecs({ ...specs, [t]: parseFloat(e.target.value) || 0 })}/>
            </label>
          ))}
        </div>
      </div>
      <div className="specs-actions">
        <button className="btn-secondary">
          <window.ICONS.save size={13}/>
          <span>Salvar</span>
        </button>
      </div>
    </Panel>
  );
}

function FarmFamaPanel({ open, onToggle, resource }) {
  const [ffTier, setFfTier] = useStateR(6);

  // For the selected tier, generate 5 enchant rows and sort by Fama/Prata desc.
  const rows = useMemoR(() => {
    const out = [0, 1, 2, 3, 4].map((enc) => {
      // Lower enchants tend to be more fama-efficient (less material cost).
      const base = 0.5 * Math.pow(0.45, ffTier - 4);
      const encDecay = Math.pow(0.62, enc);
      const noise = variation(`${resource}-${ffTier}-${enc}-fp`, 0.82, 1.18);
      const famaPrata = base * encDecay * noise;
      const vol = Math.round(60000 / Math.pow(2.1, ffTier - 4) / (1 + enc * 0.9) *
                              variation(`${resource}-${ffTier}-${enc}-fv`, 0.5, 1.4));
      return { enc, famaPrata, vol };
    });
    out.sort((a, b) => b.famaPrata - a.famaPrata);
    return out;
  }, [resource, ffTier]);

  const best = rows[0];
  const summary = `T${ffTier} · Melhor .${best.enc} · ${best.famaPrata.toFixed(4).replace('.', ',')} fama/prata`;

  return (
    <Panel open={open} onToggle={onToggle}
           label="Farm Fama"
           summary={summary}>
      <div className="ff2-tier-wrap">
        <span className="ff2-tier-lbl">Tier</span>
        <TierSelector tier={ffTier} onChange={setFfTier}/>
        <span className="ff2-hint">Mostrando todos os enchantments do T{ffTier}, ordenado por melhor fama/prata.</span>
      </div>
      <table className="ff2-table">
        <thead>
          <tr>
            <th>Item</th>
            <th className="ff-right">Fama/Prata ↓</th>
            <th className="ff-right">Vol. 24h</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.enc}>
              <td>
                <div className="ff2-item">
                  <EnchSquare resource={resource} enc={r.enc}/>
                  <span className="ff2-label mono">T{ffTier}.{r.enc}</span>
                </div>
              </td>
              <td className="ff-right mono ff2-fp">{r.famaPrata.toFixed(4).replace('.', ',')}</td>
              <td className="ff-right mono acc-muted">{rfmt(r.vol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// Enchantment color halo around a placeholder square.
// .0 = no halo, .1 cyan, .2 green, .3 blue, .4 purple
const ENCHANT_HALO = {
  0: null,
  1: '#5fc4d9',  // cyan
  2: '#6dcf75',  // green
  3: '#5b8fd5',  // blue
  4: '#a87edb',  // purple
};

function EnchSquare({ resource, enc }) {
  const meta = REFINING_META[resource];
  const halo = ENCHANT_HALO[enc];
  const style = halo
    ? { borderColor: halo,
        boxShadow: `0 0 0 1px ${halo}33, 0 0 10px ${halo}55, inset 0 0 6px ${halo}22` }
    : {};
  return (
    <div className="ench-sq" style={style}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
           style={{ color: meta.color }}>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5"
              stroke="currentColor" strokeWidth="1.2"/>
        <rect x="5" y="5" width="6" height="6" fill="currentColor" opacity="0.55"/>
      </svg>
      {enc > 0 && <span className="ench-sup mono">.{enc}</span>}
    </div>
  );
}

// Placeholder ingredient square (no real game assets)
function IngSquare({ color, qty, dim }) {
  return (
    <div className="ing-sq" style={dim ? { opacity: 0.55 } : {}}>
      <div className="ing-mark" style={{ color }}>
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

function IngredientStack({ resource, tier }) {
  const meta = REFINING_META[resource];
  // Three squares: raw ×4 (resource color), subproduct ×1 (muted), output ×1 (accent tint)
  return (
    <div className="ing-stack">
      <IngSquare color={meta.color} qty={4}/>
      <IngSquare color="var(--text-tertiary)" qty={1} dim/>
      <IngSquare color="var(--accent)" qty={1}/>
    </div>
  );
}

function AccordionRow({ row, open, onToggle, resource }) {
  const meta = REFINING_META[resource];
  const label = `T${row.tier}.${row.enc}`;
  const pctClass = row.pct >= 0 ? 'pos' : 'neg';
  const isEnc = row.enc > 0;

  return (
    <div className={`acc ${open ? 'acc-open' : ''}`}>
      <button className="acc-head" onClick={onToggle} aria-expanded={open}>
        <span className={`acc-tier mono ${isEnc ? 'acc-tier-enc' : ''}`}>{label}</span>
        <IngredientStack resource={resource} tier={row.tier}/>
        <div className="acc-stat">
          <span className="acc-stat-k">Lucro</span>
          <span className="acc-stat-v mono pos">{rfmt(row.lucro)}</span>
        </div>
        <div className="acc-stat">
          <span className="acc-stat-k">%</span>
          <span className={`acc-stat-v mono ${pctClass}`}>{rfmtPct(row.pct)}</span>
        </div>
        <div className="acc-stat">
          <span className="acc-stat-k">Vol. 24h</span>
          <span className="acc-stat-v mono acc-stat-muted">{rfmtCompact(row.vol)}</span>
        </div>
        <span className="acc-chev"><window.ICONS.chevronRight size={14}/></span>
      </button>

      <div className="acc-body">
        <div className="acc-body-inner">
          <table className="acc-table">
            <thead>
              <tr>
                <th>Cidade</th>
                <th>Ingredientes</th>
                <th className="ff-right">Lucro</th>
                <th className="ff-right">Vol. 24h</th>
                <th className="ff-right">Preço Médio</th>
              </tr>
            </thead>
            <tbody>
              {row.cities.map((c) => {
                const cClass = c.lucro >= 0 ? 'pos' : 'neg';
                return (
                  <tr key={c.short}>
                    <td>
                      <span className="city-cell">
                        <window.ICONS.building size={14}/>
                        <span>{c.name}</span>
                      </span>
                    </td>
                    <td>
                      <div className="ing-stack ing-stack-sm">
                        <IngSquare color={meta.color} qty={4}/>
                        <IngSquare color="var(--text-tertiary)" qty={1} dim/>
                        <IngSquare color="var(--accent)" qty={1}/>
                      </div>
                    </td>
                    <td className={`ff-right mono ${cClass}`}>{rfmt(c.lucro)}</td>
                    <td className="ff-right mono acc-muted">{rfmtCompact(c.vol)}</td>
                    <td className="ff-right mono acc-muted">{rfmt(c.precoMedio)}</td>
                  </tr>
                );
              })}
              {/* Melhor preço row */}
              <tr className="acc-best">
                <td>
                  <span className="acc-best-tag">Melhor preço</span>
                </td>
                <td>
                  <div className="ing-stack ing-stack-sm">
                    {row.ingredientCities.map((ic, i) => (
                      <div key={i} className="ing-with-tag">
                        <IngSquare color={meta.color} qty={i === 0 ? 4 : 1}
                                   dim={i === 1}/>
                        <span className="ing-city-tag">{ic.short} · {ic.tag}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="ff-right mono pos">{rfmt(row.bestLucro)}</td>
                <td className="ff-right mono acc-muted">—</td>
                <td className="ff-right mono acc-muted">—</td>
              </tr>
            </tbody>
          </table>
          <div className="acc-callout">
            Otimizado FS-L
            <span className="acc-callout-v mono"> {rfmt(row.calloutPrata)} prata</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ resource, tier, rows }) {
  const [openEnc, setOpenEnc] = useStateR(null);
  return (
    <div className="card results-card">
      <div className="results-head">
        <h2 className="results-title">Resultados</h2>
        <div className="results-status">
          <span className="status-chip">
            SELL ORDER · <span className="mono">RRR 36,7%</span>
          </span>
        </div>
      </div>
      <div className="results-list">
        {rows.map((row) => (
          <AccordionRow key={`${tier}-${row.enc}`} row={row} resource={resource}
                        open={openEnc === row.enc}
                        onToggle={() => setOpenEnc((e) => (e === row.enc ? null : row.enc))}/>
        ))}
      </div>
    </div>
  );
}

// ─── Indicações (right sticky panel) ──────────────────────────────────────
function IndicacoesPanel({ resource }) {
  const [mode, setMode] = useStateR('lucro');
  const items = useMemoR(() => makeIndicacoes(resource, mode), [resource, mode]);
  const meta = REFINING_META[resource];
  const modeLabel = mode === 'lucro' ? `Top Lucro · ${meta.cityShort}`
                  : mode === 'foco'  ? 'Top Lucro / Foco'
                                     : 'Top Farm Fama';
  const valueLabel = mode === 'fama' ? 'Fama/prata' : 'Lucro';

  return (
    <aside className="ind">
      <div className="ind-head">
        <h3 className="ind-title">Indicações</h3>
        <div className="ind-sub">Top 8 com volume · todas as tiers</div>
      </div>
      <select className="ind-select" value={mode}
              onChange={(e) => setMode(e.target.value)}>
        <option value="lucro">Lucro {meta.cityShort}</option>
        <option value="foco">Lucro / Foco</option>
        <option value="fama">Farm Fama</option>
      </select>
      <div className="ind-mode-bar">{modeLabel}</div>
      <ul className="ind-list">
        {items.map((it, i) => (
          <li key={i} className="ind-item">
            <IngSquare color={meta.color}/>
            <div className="ind-item-mid">
              <div className="ind-item-l1">
                <span className="ind-item-name mono">
                  T{it.tier}.{it.enc}
                </span>
                <span className={`mono ${it.value >= 0 ? 'pos' : 'neg'} ind-item-val`}>
                  {mode === 'fama' ? it.value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : rfmt(it.value)}
                </span>
              </div>
              <div className="ind-item-l2">
                <span className={`mono ${it.pct >= 0 ? 'pos' : 'neg'}`}>{rfmtPct(it.pct)}</span>
                <span className="ind-item-vol mono">{rfmtCompact(it.vol)}</span>
                <span className="ind-item-pico">{it.pico}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
function RefiningPage({ resource }) {
  const [tier,    setTier]    = useStateR(6);
  const [opts,    setOpts]    = useStateR({ buyOrder: false, foco: true, b10: false, b20: false });
  const [specsOpen, setSpecsOpen] = useStateR(false);
  const [famaOpen,  setFamaOpen]  = useStateR(false);
  const [specs,   setSpecs]   = useStateR({ 4: 100, 5: 100, 6: 47, 7: 52, 8: 0 });
  const [taxa,    setTaxa]    = useStateR(3);
  const [loading, setLoading] = useStateR(false);
  const [progress,setProgress]= useStateR([0, 4]);

  const setOpt = (k, v) => setOpts((o) => ({ ...o, [k]: v }));

  const rows = useMemoR(() => makeTierRows(resource, tier), [resource, tier]);

  const onRefresh = () => {
    setLoading(true);
    setProgress([0, 4]);
    let i = 0;
    const tick = () => {
      i += 1;
      setProgress([i, 4]);
      if (i < 4) setTimeout(tick, 420);
      else setTimeout(() => setLoading(false), 320);
    };
    setTimeout(tick, 420);
  };

  return (
    <div className="page-inner page-inner-wide">
      <div className="ref-layout">
        <div className="ref-main">
          <ConfigBar resource={resource} tier={tier} setTier={setTier}
                     opts={opts} setOpt={setOpt}
                     loading={loading} progress={progress}
                     onRefresh={onRefresh}/>
          <div className="ref-panels">
            <SpecsPanel open={specsOpen} onToggle={() => setSpecsOpen((x) => !x)}
                        specs={specs} setSpecs={setSpecs}
                        taxa={taxa} setTaxa={setTaxa}/>
            <FarmFamaPanel open={famaOpen} onToggle={() => setFamaOpen((x) => !x)}
                           resource={resource}/>
          </div>
          <ResultsTable resource={resource} tier={tier} rows={rows}/>
        </div>
        <IndicacoesPanel resource={resource}/>
      </div>
    </div>
  );
}

Object.assign(window, { RefiningPage, ENCHANT_HALO });
