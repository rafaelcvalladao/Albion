// gate.jsx — access-code home screen for Calculadora Albion.
// Redesigned to match the app's forge aesthetic (amber accent, Cinzel, dark surfaces).

// ── Access configuration ──────────────────────────────────────────────────
// Change ACCESS_CODE to whatever code you hand out. Comparison is
// case-insensitive and ignores surrounding whitespace.
const ACCESS_CODE = 'ALBION';
const GATE_STORAGE_KEY = 'ca-access-granted';

function normalize(s) {
  return String(s || '').trim().toUpperCase();
}

// Read once at module load so a returning user skips the gate.
function readGranted() {
  try { return localStorage.getItem(GATE_STORAGE_KEY) === '1'; }
  catch (e) { return false; }
}

function AccessGate({ logoIdx, onUnlock }) {
  const Logo = window.LOGOS[logoIdx] || window.LOGOS[0];
  const Lock = window.ICONS.lock;
  const ArrowDown = window.ICONS.arrowDown;
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (normalize(code) === normalize(ACCESS_CODE)) {
      try { localStorage.setItem(GATE_STORAGE_KEY, '1'); } catch (err) {}
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  const onChange = (e) => {
    setCode(e.target.value);
    if (error) setError(false);
  };

  return (
    <div className="gate" data-screen-label="Acesso">
      <div className={`gate-card ${error ? 'gate-card-err' : ''} ${shake ? 'gate-shake' : ''}`}>
        <div className="gate-mark"><Logo size={34} /></div>

        <div className="gate-kicker">Refino e Mercado</div>
        <h1 className="gate-title">Calculadora <em>Albion</em></h1>
        <p className="gate-sub">Insira o código de acesso para entrar no painel.</p>

        <div className="gate-rule" />

        <form className="gate-form" onSubmit={submit} noValidate>
          <span className="gate-field-lbl">Código de acesso</span>
          <div className="gate-input-wrap">
            <span className="gate-input-icon"><Lock size={16} /></span>
            <input
              ref={inputRef}
              className="gate-input"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck="false"
              placeholder="Digite seu código"
              value={code}
              onChange={onChange}
              aria-invalid={error}
              aria-label="Código de acesso"
            />
          </div>

          <div className={`gate-error ${error ? 'gate-error-on' : ''}`} role="alert">
            {error && (
              <React.Fragment>
                <window.ICONS.info size={13} />
                Código inválido. Verifique e tente novamente.
              </React.Fragment>
            )}
          </div>

          <button className="gate-submit" type="submit" disabled={!code.trim()}>
            Entrar
            <ArrowDown size={15} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </form>

        <div className="gate-foot">
          Não tem um código? <a className="gate-foot-link" href="#" onClick={(e) => e.preventDefault()}>Fale com a guilda</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AccessGate, readGranted });
