import { useState, useRef, useEffect } from 'react';
import { validateToken } from '../api.js';
import { ICONS } from './Icons.jsx';
import '../styles/LoginGate.css';

function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.5"
         strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'block' }}>
      <path d="M3 9l9-6 9 6-9 12z"/>
      <path d="M3 9h18"/>
    </svg>
  );
}

export default function LoginGate({ onSuccess }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await validateToken(token.trim());
      if (res.valid) {
        sessionStorage.setItem('albion_token', token.trim());
        onSuccess();
      }
    } catch (err) {
      console.error('[LoginGate] Erro na validação:', err);
      const msg = err.message || 'Erro ao validar token.';
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 420);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setToken(e.target.value);
    if (error) setError('');
  }

  return (
    <div className="gate" data-screen-label="Acesso">
      <div className={`gate-card${error ? ' gate-card-err' : ''}${shake ? ' gate-shake' : ''}`}>
        <div className="gate-mark">
          <LogoMark size={34} />
        </div>

        <div className="gate-kicker">Refino e Mercado</div>
        <h1 className="gate-title">Calculadora <em>Albion</em></h1>
        <p className="gate-sub">Insira o código de acesso para entrar no painel.</p>

        <div className="gate-rule" />

        <form className="gate-form" onSubmit={handleSubmit} noValidate>
          <span className="gate-field-lbl">Código de acesso</span>
          <div className="gate-input-wrap">
            <span className="gate-input-icon"><ICONS.lock size={16} /></span>
            <input
              ref={inputRef}
              className="gate-input"
              type="password"
              autoComplete="off"
              spellCheck="false"
              placeholder="••••••••"
              value={token}
              onChange={handleChange}
              aria-invalid={!!error}
              aria-label="Código de acesso"
            />
          </div>

          <div className={`gate-error${error ? ' gate-error-on' : ''}`} role="alert">
            {error && (
              <>
                <ICONS.info size={13} />
                {error}
              </>
            )}
          </div>

          <button
            className="gate-submit"
            type="submit"
            disabled={loading || !token.trim()}
          >
            {loading ? 'Validando…' : 'Entrar'}
            {!loading && (
              <ICONS.arrowDown size={15} style={{ transform: 'rotate(-90deg)' }} />
            )}
          </button>
        </form>

        <div className="gate-foot">
          Acesso limitado a membros autorizados
        </div>
      </div>
    </div>
  );
}
