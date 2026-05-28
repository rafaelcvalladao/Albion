// blackmarket.jsx — Arbitrage opportunities buying in royal cities,
// selling on the Black Market in Caerleon.

const { useState: useStateB, useMemo: useMemoB, useRef: useRefB } = React;

const { Checkbox: BCheckbox, PrimaryButton: BPrimaryButton,
        fmt: bfmt, fmtPct: bfmtPct } = window;

// ─── Mock data ────────────────────────────────────────────────────────────
const QUALITIES = ['Normal', 'Bom', 'Excepcional', 'Excelente', 'Obra-prima'];
const ITEM_TYPES = [
  { name: 'Capa',                weight: 3.8, color: 'var(--fiber)' },
  { name: 'Casaco de Assassino', weight: 17.1, color: 'var(--leather)' },
  { name: 'Besta Pesada',        weight: 34.2, color: 'var(--metal)' },
  { name: 'Capa de Brecilien',   weight: 3.8,  color: 'var(--fiber)' },
  { name: 'Botas de Guarda-tumbas', weight: 8.5, color: 'var(--leather)' },
  { name: 'Capa Morta-Viva',     weight: 3.8,  color: 'var(--fiber)' },
  { name: 'Capa Protetora',      weight: 3.8,  color: 'var(--fiber)' },
  { name: 'Casaco Real',         weight: 5.1,  color: 'var(--leather)' },
  { name: 'Arco de Guerra',      weight: 10.1, color: 'var(--wood)' },
  { name: 'Cajado Místico',      weight: 8.2,  color: 'var(--wood)' },
  { name: 'Adaga Sombria',       weight: 5.4,  color: 'var(--metal)' },
  { name: 'Maça Real',           weight: 22.4, color: 'var(--metal)' },
  { name: 'Capacete de Cavaleiro', weight: 11.3, color: 'var(--metal)' },
  { name: 'Foice Sangrenta',     weight: 18.9, color: 'var(--metal)' },
  { name: 'Sapatilhas do Mago',  weight: 4.2,  color: 'var(--fiber)' },
  { name: 'Lança Cravejada',     weight: 14.6, color: 'var(--wood)' },
  { name: 'Escudo Real',         weight: 19.7, color: 'var(--metal)' },
  { name: 'Túnica Sagrada',      weight: 5.1,  color: 'var(--fiber)' },
];
const TIER_SUFFIX = { 4: 'do Adepto', 5: 'do Perito', 6: 'do Mestre', 7: 'do Grão-Mestre', 8: 'do Ancião' };
const SOURCE_CITIES = ['Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Bridgewatch'];
const TIME_AGOS = ['9h atrás', '2h atrás', '4h atrás', '5h atrás', '6h atrás', '47m atrás', '52m atrás', '3h atrás', '1h atrás'];
const BM_TIMES = ['42m atrás', '9h atrás', '3h atrás', '47m atrás', '52m atrás', '1h atrás', '12m atrás', '2h atrás'];

function bseed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
const bvar = (s, lo, hi) => lo + bseed(s) * (hi - lo);

function buildOpportunities() {
  const rows = [];
  ITEM_TYPES.forEach((it, idx) => {
    const tier = 4 + (idx % 5);
    const enc  = (idx + 1) % 4;
    const quality = QUALITIES[idx % QUALITIES.length];
    const key = `${it.name}-${tier}-${enc}-${quality}`;
    const compraBase = Math.round(80000 * Math.pow(2.05, tier - 4) * (1 + enc * 0.55)
                                  * bvar(key + 'c', 0.7, 1.15));
    const bmMul = bvar(key + 'b', 1.18, 1.45);
    const bmPrice = Math.round(compraBase * bmMul);
    const lucro = Math.round((bmPrice - compraBase) * 0.97);   // taxa 3%
    const pct   = parseFloat(((lucro / compraBase) * 100).toFixed(1));
    const vol   = parseFloat((bvar(key + 'v', 0.6, 28)).toFixed(1));
    const desvio = parseFloat((bvar(key + 'd', -10, 16)).toFixed(1));
    const desvioBase = Math.round(bmPrice * bvar(key + 'db', 0.85, 1.08));
    const coef = Math.round(lucro * vol / it.weight);
    rows.push({
      id: key,
      name: it.name + ' ' + TIER_SUFFIX[tier],
      tier, enc, quality,
      iconColor: it.color,
      weight: it.weight,
      compraCity: SOURCE_CITIES[idx % SOURCE_CITIES.length],
      compraTime: TIME_AGOS[idx % TIME_AGOS.length],
      compraPrice: compraBase,
      bmTime: BM_TIMES[idx % BM_TIMES.length],
      bmPrice,
      lucro, pct, vol, desvio, desvioBase,
      coef,
    });
  });
  rows.sort((a, b) => b.lucro - a.lucro);
  return rows;
}

const ALL_OPPS = buildOpportunities();
const MAX_COEF = Math.max(...ALL_OPPS.map((r) => r.coef));

// ─── Sub-components ───────────────────────────────────────────────────────
function BMItemIcon({ color, enc }) {
  const halo = window.ENCHANT_HALO ? window.ENCHANT_HALO[enc] : null;
  return (
    <div className="bm-icon" style={halo ? {
      borderColor: halo,
      boxShadow: `0 0 0 1px ${halo}33, 0 0 8px ${halo}44`,
    } : {}}>
      <svg width="16" height="16" viewBox="0 0 16 16" style={{ color }}>
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5"
              fill="none" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="5" y="5" width="6" height="6" fill="currentColor" opacity="0.55"/>
      </svg>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useStateB(false);
  const onCopy = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  };
  return (
    <span className="bm-copy-wrap">
      <button className="bm-copy" onClick={onCopy} aria-label={`Copiar ${text}`}
              title="Copiar nome">
        <window.ICONS.copy size={12}/>
      </button>
      {copied && <span className="bm-copy-tip">Copiado!</span>}
    </span>
  );
}

function CoefBar({ value, weight }) {
  const pct = Math.min(100, Math.max(4, (value / MAX_COEF) * 100));
  return (
    <div className="coef-wrap">
      <div className="coef-pill">
        <div className="coef-fill" style={{ width: `${pct}%` }}/>
        <span className="coef-num mono">{bfmt(value)}</span>
      </div>
      <div className="coef-weight mono">{weight.toFixed(1).replace('.', ',')} kg</div>
    </div>
  );
}

function BMRow({ row, idx }) {
  const isNeg = row.lucro < 0;
  return (
    <tr className={`bm-row ${isNeg ? 'bm-row-neg' : ''}`}
        style={{ animationDelay: `${Math.min(idx, 18) * 28}ms` }}>
      <td className="bm-num mono">{idx + 1}</td>
      <td className="bm-item">
        <div className="bm-item-inner">
          <BMItemIcon color={row.iconColor} enc={row.enc}/>
          <div className="bm-item-text">
            <div className="bm-item-l1">
              <span className="bm-item-name">{row.name}</span>
              <CopyButton text={row.name}/>
            </div>
            <div className="bm-item-l2">
              <span className="bm-tag-tier mono">[T{row.tier}]</span>
              {row.enc > 0 && <span className="bm-tag-enc mono">.{row.enc}</span>}
              <span className="bm-tag-quality">{row.quality}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="bm-money">
        <div className="mono bm-money-v">{bfmt(row.compraPrice)}</div>
        <div className="bm-money-s">{row.compraCity} · <span className="bm-time">{row.compraTime}</span></div>
      </td>
      <td className="bm-money">
        <div className="mono bm-money-v">{bfmt(row.bmPrice)}</div>
        <div className="bm-money-s">Black Market · <span className="bm-time">{row.bmTime}</span></div>
      </td>
      <td className="bm-lucro mono pos">{bfmt(row.lucro)}</td>
      <td className="bm-pct mono pos">{row.pct.toFixed(1).replace('.', ',')}%</td>
      <td className="bm-vol mono">{row.vol.toFixed(1).replace('.', ',')}</td>
      <td className="bm-desvio">
        <div className={`mono ${row.desvio >= 0 ? 'pos' : 'neg'}`}>
          {(row.desvio >= 0 ? '+' : '') + row.desvio.toFixed(1).replace('.', ',')}%
        </div>
        <div className="bm-money-s mono">{bfmt(row.desvioBase)}</div>
      </td>
      <td className="bm-coef">
        <CoefBar value={row.coef} weight={row.weight}/>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
function BlackMarketPage() {
  const [volMin,    setVolMin]    = useStateB(0.75);
  const [city,      setCity]      = useStateB('todas');
  const [caerleon,  setCaerleon]  = useStateB(false);
  const [loading,   setLoading]   = useStateB(false);
  const [results,   setResults]   = useStateB(ALL_OPPS);
  const [revision,  setRevision]  = useStateB(0);  // to retrigger row stagger

  const filtered = useMemoB(() => {
    return results.filter((r) => {
      if (r.vol < volMin) return false;
      if (city !== 'todas' && r.compraCity !== city) return false;
      return true;
    });
  }, [results, volMin, city]);

  const onBuscar = () => {
    setLoading(true);
    setResults([]);
    setTimeout(() => {
      setResults(ALL_OPPS);
      setRevision((r) => r + 1);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="page-inner">
      {/* Section header */}
      <div className="bm-header">
        <h2 className="bm-title">Black Market — Arbitragem para o Mercado Negro</h2>
      </div>

      {/* Filter bar */}
      <div className="bm-filters">
        <div className="bm-static">
          <span>Dados ≤ 24h</span>
          <span className="bm-dot">·</span>
          <span>Taxa 3%</span>
        </div>
        <label className="bm-field">
          <span className="bm-field-lbl">Vol. mín./dia</span>
          <input type="number" step="0.05" min="0" value={volMin}
                 onChange={(e) => setVolMin(parseFloat(e.target.value) || 0)}
                 className="bm-num-input"/>
        </label>
        <label className="bm-field">
          <span className="bm-field-lbl">Cidade</span>
          <select className="bm-select" value={city}
                  onChange={(e) => setCity(e.target.value)}>
            <option value="todas">Todas</option>
            {SOURCE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <BCheckbox label="Caerleon (avg)" checked={caerleon} onChange={setCaerleon}/>
        <div className="bm-spacer"/>
        <BPrimaryButton onClick={onBuscar} loading={loading} progress={[0, 4]}>
          Buscar
        </BPrimaryButton>
      </div>

      {/* Result count */}
      <div className="bm-count">
        <span className="bm-count-n mono">{bfmt(filtered.length)}</span>
        <span> oportunidades encontradas</span>
      </div>

      {/* Results table or empty state */}
      {filtered.length === 0 ? (
        <div className="bm-empty">
          <div className="bm-empty-icon"><window.ICONS.skull size={36}/></div>
          <div className="bm-empty-title">Nenhuma oportunidade encontrada</div>
          <div className="bm-empty-body">
            Tente ajustar o volume mínimo ou trocar a cidade de origem.
          </div>
        </div>
      ) : (
        <div className="card bm-table-card">
          <div className="bm-scroll">
            <table className="bm-table">
              <thead>
                <tr>
                  <th className="bm-num">#</th>
                  <th>Item</th>
                  <th>Compra (Cidade)</th>
                  <th>Buy Order BM</th>
                  <th className="ff-right bm-sort">
                    Lucro <window.ICONS.arrowDown size={10}/>
                  </th>
                  <th className="ff-right">%</th>
                  <th className="ff-right">Vol/Dia</th>
                  <th className="ff-right">Desvio</th>
                  <th className="ff-right">Coef.</th>
                </tr>
              </thead>
              <tbody key={revision}>
                {filtered.map((row, i) => (
                  <BMRow key={row.id} row={row} idx={i}/>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BlackMarketPage });
// Expose ENCHANT_HALO if defined elsewhere — used by BMItemIcon
