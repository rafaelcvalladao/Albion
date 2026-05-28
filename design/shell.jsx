// shell.jsx — Calculadora Albion app shell
// Toggle-only collapsible sidebar + top bar + page area.

const { useState, useEffect, useMemo } = React;

// ─── Nav structure ─────────────────────────────────────────────────────────
const NAV_TOP = [
  { id: 'hub', label: 'Hub', icon: 'dashboard' },
];
const NAV_REFINERS = [
  { id: 'madeira',  label: 'Madeira',  icon: 'trees' },
  { id: 'tecido',   label: 'Tecido',   icon: 'ripple' },
  { id: 'couro',    label: 'Couro',    icon: 'shield' },
  { id: 'minerio',  label: 'Minério',  icon: 'hammer' },
];
const NAV_MARKET = [
  { id: 'market',  label: 'Market Analyzer', icon: 'candle' },
  { id: 'black',   label: 'Black Market',    icon: 'skull' },
  { id: 'equip',   label: 'Equip Buy',       icon: 'sword' },
  { id: 'pocoes',  label: 'Poções',          icon: 'flask' },
];

const ALL_NAV = [...NAV_TOP, ...NAV_REFINERS, ...NAV_MARKET];
const labelFor = (id) => (ALL_NAV.find((n) => n.id === id) || { label: 'Hub' }).label;

// ─── Theme tokens — warmth & accent variants ──────────────────────────────
const WARMTH = {
  cool:    { base: '#0c0e14', surface: '#12141d', elevated: '#191d28', hover: '#21253355' },
  neutral: { base: '#0d0e12', surface: '#13151c', elevated: '#1a1d27', hover: '#21253344' },
  warm:    { base: '#100f0c', surface: '#181612', elevated: '#211e18', hover: '#2a261d55' },
};
const ACCENTS = {
  muted:    { accent: '#a87f2e', hover: '#bd9039', dim: 'rgba(168,127,46,0.14)' },
  standard: { accent: '#c9963a', hover: '#daa84e', dim: 'rgba(201,150,58,0.15)' },
  bright:   { accent: '#e0b556', hover: '#f0c668', dim: 'rgba(224,181,86,0.18)' },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ expanded, onToggle, current, onNav, activeStyle, logoIdx }) {
  const Logo = window.LOGOS[logoIdx] || window.LOGOS[3];

  return (
    <aside className={`sb ${expanded ? 'sb-open' : 'sb-closed'}`}>
      {/* Logo block */}
      <div className="sb-logo">
        <div className="sb-logo-mark"><Logo size={22} /></div>
        <div className="sb-logo-text" aria-hidden={!expanded}>
          <div className="sb-logo-line1">
            <span className="sb-logo-word">Calculadora</span>
            <span className="sb-logo-cinzel">Albion</span>
          </div>
          <div className="sb-logo-sub">Refino e Mercado</div>
        </div>
      </div>

      <nav className="sb-nav">
        {NAV_TOP.map((item) => (
          <NavItem key={item.id} item={item} active={current === item.id}
                   expanded={expanded} onClick={() => onNav(item.id)}
                   activeStyle={activeStyle}/>
        ))}

        <div className="sb-divider"/>
        <SectionLabel show={expanded}>Refino</SectionLabel>
        {NAV_REFINERS.map((item) => (
          <NavItem key={item.id} item={item} active={current === item.id}
                   expanded={expanded} onClick={() => onNav(item.id)}
                   activeStyle={activeStyle}/>
        ))}

        <div className="sb-divider"/>
        <SectionLabel show={expanded}>Mercado</SectionLabel>
        {NAV_MARKET.map((item) => (
          <NavItem key={item.id} item={item} active={current === item.id}
                   expanded={expanded} onClick={() => onNav(item.id)}
                   activeStyle={activeStyle}/>
        ))}
      </nav>

      <div className="sb-foot">
        <button className="sb-toggle" onClick={onToggle}
                aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
                title={expanded ? 'Recolher menu (Ctrl+B)' : 'Expandir menu (Ctrl+B)'}>
          {expanded
            ? <window.ICONS.chevronLeft size={16}/>
            : <window.ICONS.chevronRight size={16}/>}
          <span className="sb-label">{expanded ? 'Recolher' : 'Menu'}</span>
          {expanded && <kbd className="sb-kbd">⌃ B</kbd>}
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ children, show }) {
  return (
    <div className="sb-section" aria-hidden={!show} style={{ opacity: show ? 1 : 0 }}>
      {children}
    </div>
  );
}

function NavItem({ item, active, expanded, onClick, activeStyle }) {
  const Icon = window.ICONS[item.icon];
  const cls = ['sb-item', active && `sb-item-active sb-active-${activeStyle}`]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={onClick} title={!expanded ? item.label : undefined}>
      <span className="sb-icon"><Icon size={18}/></span>
      <span className="sb-label">{item.label}</span>
    </button>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────
function TopBar({ pageId, style }) {
  const title = labelFor(pageId);
  if (style === 'breadcrumbs') {
    return (
      <header className="tb">
        <div className="tb-crumbs">
          <span className="tb-crumb-muted">Calculadora</span>
          <span className="tb-crumb-sep"><window.ICONS.slash size={14}/></span>
          <span className="tb-crumb-current">{title}</span>
        </div>
      </header>
    );
  }
  if (style === 'search') {
    return (
      <header className="tb">
        <h1 className="tb-title">{title}</h1>
        <div className="tb-search">
          <window.ICONS.search size={14}/>
          <input type="text" placeholder="Buscar item, recurso, encantamento…"/>
          <kbd className="tb-kbd">⌘K</kbd>
        </div>
      </header>
    );
  }
  return (
    <header className="tb">
      <h1 className="tb-title">{title}</h1>
    </header>
  );
}

// ─── Em construção placeholder ────────────────────────────────────────────
function EmConstrucao({ pageId, logoIdx }) {
  const Logo = window.LOGOS[logoIdx] || window.LOGOS[3];
  const label = labelFor(pageId);
  return (
    <div className="page-center">
      <div className="ec">
        <div className="ec-card">
        <div className="ec-mark"><Logo size={56}/></div>
        <div className="ec-kicker">Calculadora Albion · {label}</div>
        <h2 className="ec-title">Em construção</h2>
        <p className="ec-body">
          Esta página ainda está sendo forjada. Use a barra lateral à
          esquerda para navegar entre as outras seções do app.
        </p>
        <div className="ec-rule"/>
        <div className="ec-meta">
          <span className="ec-meta-k">Próximo passo</span>
          <span className="ec-meta-v">Hub · painel de visão geral</span>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [expanded, setExpanded] = useState(false);
  const [pageId, setPageId] = useState('pocoes');
  const [granted, setGranted] = useState(() => window.readGranted());

  // Apply warmth + accent tweaks to CSS vars
  useEffect(() => {
    const w = WARMTH[t.warmth] || WARMTH.neutral;
    const a = ACCENTS[t.accent] || ACCENTS.standard;
    const root = document.documentElement;
    root.style.setProperty('--bg-base', w.base);
    root.style.setProperty('--bg-surface', w.surface);
    root.style.setProperty('--bg-elevated', w.elevated);
    root.style.setProperty('--bg-hover', w.hover);
    root.style.setProperty('--accent', a.accent);
    root.style.setProperty('--accent-hover', a.hover);
    root.style.setProperty('--accent-dim', a.dim);
  }, [t.warmth, t.accent]);

  // Ctrl/⌘ + B toggles the sidebar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setExpanded((x) => !x);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      {!granted && (
        <window.AccessGate logoIdx={t.logoIdx} onUnlock={() => setGranted(true)} />
      )}
      <Sidebar expanded={expanded} onToggle={() => setExpanded((x) => !x)}
               current={pageId} onNav={setPageId}
               activeStyle={t.activeStyle} logoIdx={t.logoIdx}/>
      <main className="main">
        <TopBar pageId={pageId} style={t.topBar}/>
        <div className="page">
          {(() => {
            if (pageId === 'hub') return <window.HubPage/>;
            if (['madeira','tecido','couro','minerio'].includes(pageId)) {
              return <window.RefiningPage resource={pageId}/>;
            }
            if (pageId === 'black') return <window.BlackMarketPage/>;
            if (pageId === 'equip') return <window.EquipBuyPage/>;
            if (pageId === 'pocoes') return <window.PotionsPage/>;
            return <EmConstrucao pageId={pageId} logoIdx={t.logoIdx}/>;
          })()}
        </div>
      </main>

      <TweaksPanel>
        <TweakSection label="Navegação"/>
        <TweakRadio label="Item ativo" value={t.activeStyle}
          options={['hairline', 'tint', 'chip']}
          onChange={(v) => setTweak('activeStyle', v)}/>
        <TweakRadio label="Top bar" value={t.topBar}
          options={['minimal', 'breadcrumbs', 'search']}
          onChange={(v) => setTweak('topBar', v)}/>

        <TweakSection label="Marca"/>
        <TweakRadio label="Glyph" value={String(t.logoIdx)}
          options={['0','1','2','3']}
          onChange={(v) => setTweak('logoIdx', Number(v))}/>

        <TweakSection label="Tema"/>
        <TweakRadio label="Background" value={t.warmth}
          options={['cool', 'neutral', 'warm']}
          onChange={(v) => setTweak('warmth', v)}/>
        <TweakRadio label="Accent" value={t.accent}
          options={['muted', 'standard', 'bright']}
          onChange={(v) => setTweak('accent', v)}/>
      </TweaksPanel>
    </div>
  );
}

Object.assign(window, { App });
