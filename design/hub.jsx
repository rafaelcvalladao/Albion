// hub.jsx — Hub landing page. Ranking table across all four refining resources.

const { useState: useStateH } = React;

// ─── Mock data ────────────────────────────────────────────────────────────
// Realistic-ish refined items across resources/tiers. Profit descending.
// enc = enchantment level (0–3); rendered as superscript in amber for >0.

const HUB_ROWS = [
  { item: 'Tábuas de Carvalho-Sangue', res: 'wood',    tier: 8, enc: 2, lucro: 42180, lucroFoco: 168720, pct:  18.4, vol: 12400, pico: '18h–22h' },
  { item: 'Couro Resplandecente',      res: 'leather', tier: 8, enc: 1, lucro: 38250, lucroFoco: 152500, pct:  15.2, vol:  8740, pico: '19h–01h' },
  { item: 'Tecido Etéreo',             res: 'fiber',   tier: 8, enc: 0, lucro: 31420, lucroFoco: 125680, pct:  12.8, vol:  6280, pico: '20h–02h' },
  { item: 'Lingote Adamantino',        res: 'metal',   tier: 8, enc: 1, lucro: 28940, lucroFoco: 113760, pct:  11.6, vol: 14820, pico: '18h–13h' },
  { item: 'Couro Curtido',             res: 'leather', tier: 7, enc: 2, lucro: 24180, lucroFoco:  96720, pct:   9.8, vol: 18430, pico: '17h–23h' },
  { item: 'Tábuas de Cedro',           res: 'wood',    tier: 7, enc: 1, lucro: 21750, lucroFoco:  87000, pct:   8.4, vol: 22150, pico: '18h–22h' },
  { item: 'Lingote Meteorítico',       res: 'metal',   tier: 7, enc: 0, lucro: 19840, lucroFoco:  79360, pct:   7.6, vol: 26800, pico: '19h–00h' },
  { item: 'Tecido Ornamental',         res: 'fiber',   tier: 7, enc: 1, lucro: 17420, lucroFoco:  69680, pct:   6.2, vol: 11280, pico: '20h–01h' },
  { item: 'Couro Trabalhado',          res: 'leather', tier: 6, enc: 0, lucro: 14180, lucroFoco:  56720, pct:   5.4, vol: 31420, pico: '16h–22h' },
  { item: 'Tábuas de Pinho',           res: 'wood',    tier: 6, enc: 3, lucro: 12940, lucroFoco:  51760, pct:   4.9, vol:  8420, pico: '18h–23h' },
  { item: 'Lingote de Rúnico',         res: 'metal',   tier: 6, enc: 1, lucro: 11280, lucroFoco:  45120, pct:   4.1, vol: 38200, pico: '19h–01h' },
  { item: 'Tecido Fino',               res: 'fiber',   tier: 6, enc: 0, lucro:  9420, lucroFoco:  37680, pct:   3.2, vol: 18740, pico: '20h–00h' },
  { item: 'Couro Espesso',             res: 'leather', tier: 5, enc: 0, lucro:  6840, lucroFoco:  27360, pct:   2.4, vol: 42180, pico: '15h–21h' },
  { item: 'Tábuas de Castanho',        res: 'wood',    tier: 5, enc: 1, lucro:  4280, lucroFoco:  17120, pct:  -1.2, vol: 28400, pico: '17h–22h' },
  { item: 'Lingote de Titânio',        res: 'metal',   tier: 5, enc: 0, lucro:  2140, lucroFoco:   8560, pct:  -3.4, vol: 56800, pico: '18h–00h' },
];

const RESOURCE_META = {
  wood:    { label: 'Madeira', color: 'var(--wood)',    iconKey: 'trees' },
  fiber:   { label: 'Tecido',  color: 'var(--fiber)',   iconKey: 'ripple' },
  leather: { label: 'Couro',   color: 'var(--leather)', iconKey: 'shield' },
  metal:   { label: 'Minério', color: 'var(--metal)',   iconKey: 'hammer' },
};

const fmt = (n) => n.toLocaleString('pt-BR');
const fmtCompact = (n) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
  return String(n);
};
const fmtPct = (n) => (n > 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + '%';

// ─── Sub-components ───────────────────────────────────────────────────────
function Checkbox({ label, checked, onChange }) {
  return (
    <label className={`cb ${checked ? 'cb-on' : ''}`}>
      <span className="cb-box">
        {checked && <window.ICONS.check size={12}/>}
      </span>
      <input type="checkbox" checked={checked}
             onChange={(e) => onChange(e.target.checked)}/>
      <span className="cb-label">{label}</span>
    </label>
  );
}

function PrimaryButton({ children, onClick, loading, progress }) {
  return (
    <button className={`btn-primary ${loading ? 'is-loading' : ''}`} onClick={onClick} disabled={loading}>
      <span className={`btn-icon ${loading ? 'spin' : ''}`}><window.ICONS.refresh size={15}/></span>
      <span>{children}</span>
      {loading && <span className="btn-progress">{progress[0]}/{progress[1]}</span>}
    </button>
  );
}

function ModePill({ value, onChange }) {
  return (
    <div className="pill" role="tablist">
      <button role="tab" aria-selected={value === 'sem'}
              className={`pill-opt ${value === 'sem' ? 'pill-on' : ''}`}
              onClick={() => onChange('sem')}>Sem Foco</button>
      <button role="tab" aria-selected={value === 'com'}
              className={`pill-opt ${value === 'com' ? 'pill-on' : ''}`}
              onClick={() => onChange('com')}>Com Foco</button>
    </div>
  );
}

function ResourceBadge({ res }) {
  const meta = RESOURCE_META[res];
  return (
    <span className="rbadge" style={{
      borderLeftColor: meta.color,
      background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
    }}>
      {meta.label}
    </span>
  );
}

function TierBadge({ tier }) {
  return <span className="tbadge">T{tier}</span>;
}

function EnchSup({ enc }) {
  if (!enc) return null;
  return <sup className="enc">.{enc}</sup>;
}

function ItemCell({ item, enc, res }) {
  const meta = RESOURCE_META[res];
  const Icon = window.ICONS[meta.iconKey];
  return (
    <div className="item-cell">
      <div className="item-icon" style={{ color: meta.color }}>
        <Icon size={18}/>
      </div>
      <span className="item-name">
        {item}<EnchSup enc={enc}/>
      </span>
    </div>
  );
}

// ─── Hub page ─────────────────────────────────────────────────────────────
function HubPage() {
  const [buyOrder, setBuyOrder] = useStateH(false);
  const [bonus10,  setBonus10]  = useStateH(false);
  const [bonus20,  setBonus20]  = useStateH(false);
  const [mode,     setMode]     = useStateH('sem');
  const [loading,  setLoading]  = useStateH(false);
  const [progress, setProgress] = useStateH([0, 4]);

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

  const title = mode === 'sem' ? 'TOP 15 — LUCRO LOCAL' : 'TOP 15 — LUCRO / FOCO';
  const lucroCol = mode === 'sem' ? 'Lucro' : 'Lucro/Foco';

  return (
    <div className="page-inner">
      {/* Top controls card */}
      <div className="card hub-controls">
        <div className="hub-checks">
          <Checkbox label="Comprar via buy order" checked={buyOrder} onChange={setBuyOrder}/>
          <Checkbox label="Bônus diário 10%"      checked={bonus10}  onChange={setBonus10}/>
          <Checkbox label="Bônus diário 20%"      checked={bonus20}  onChange={setBonus20}/>
        </div>
        <PrimaryButton onClick={onRefresh} loading={loading} progress={progress}>
          Atualizar
        </PrimaryButton>
      </div>

      {/* Mode toggle */}
      <div className="hub-mode-wrap">
        <ModePill value={mode} onChange={setMode}/>
      </div>

      {/* Ranking table */}
      <div className="card hub-table-card">
        <div className="hub-table-head">
          <h2 className="hub-table-title">{title}</h2>
          <div className="hub-table-sub">
            Atualizado há 4 min · <span className="mono">Bridgewatch</span>
          </div>
        </div>
        <div className="hub-table-scroll">
          <table className="rt">
            <thead>
              <tr>
                <th className="rt-num">#</th>
                <th className="rt-item">Item</th>
                <th className="rt-res">Recurso</th>
                <th className="rt-tier">Tier</th>
                <th className="rt-lucro rt-sort">
                  <span>{lucroCol}</span>
                  <window.ICONS.arrowDown size={11}/>
                </th>
                <th className="rt-pct">%</th>
                <th className="rt-vol">Vol. 24h</th>
                <th className="rt-pico">Pico (UTC-3)</th>
              </tr>
            </thead>
            <tbody>
              {HUB_ROWS.map((r, i) => {
                const rank = i + 1;
                const topClass = rank <= 3 ? `rt-top rt-top-${rank}` : '';
                const lucroVal = mode === 'sem' ? r.lucro : r.lucroFoco;
                const pctClass = r.pct >= 0 ? 'pos' : 'neg';
                return (
                  <tr key={r.item + r.enc} className={topClass}>
                    <td className="rt-num">{String(rank).padStart(2, '0')}</td>
                    <td className="rt-item">
                      <ItemCell item={r.item} enc={r.enc} res={r.res}/>
                    </td>
                    <td className="rt-res"><ResourceBadge res={r.res}/></td>
                    <td className="rt-tier"><TierBadge tier={r.tier}/></td>
                    <td className={`rt-lucro mono ${pctClass}`}>{fmt(lucroVal)}</td>
                    <td className={`rt-pct mono ${pctClass}`}>{fmtPct(r.pct)}</td>
                    <td className="rt-vol mono">{fmtCompact(r.vol)}</td>
                    <td className="rt-pico mono">{r.pico}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HubPage,
  // shared helpers for refining pages
  Checkbox, PrimaryButton, EnchSup, TierBadge,
  fmt, fmtCompact, fmtPct,
});
