import { useState } from 'react';
import { validateToken } from '../api.js';
import { ICONS } from './Icons.jsx';
import '../styles/LoginGate.css';

export default function LoginGate({ onSuccess }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setError(err.message || 'Erro ao validar token.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gate">
      <div className={`gate-card${error ? ' gate-card-err' : ''}`}>
        <div className="gate-mark">
          <ICONS.lock size={28} />
        </div>
        <div className="gate-kicker">Calculadora Albion</div>
        <h1 className="gate-title">Acesso <em>restrito</em></h1>
        <p className="gate-sub">Insira o código de acesso para continuar</p>
        <div className="gate-rule" />
        <form onSubmit={handleSubmit} className="gate-form">
          <div className="gate-field-lbl">Código de acesso</div>
          <div className="gate-input-wrap">
            <span className="gate-input-icon"><ICONS.lock size={16} /></span>
            <input
              type="password"
              className="gate-input"
              placeholder="••••••••"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
            />
          </div>
          <p className={`gate-error${error ? ' gate-error-on' : ''}`}>
            {error}
          </p>
          <button
            type="submit"
            className="gate-submit"
            disabled={loading || !token.trim()}
          >
            {loading ? 'Validando…' : 'Entrar'}
          </button>
        </form>
        <p className="gate-foot">Acesso limitado a membros autorizados</p>
      </div>
    </div>
  );
}
