import { useState } from "react";
import { validateToken } from "../api.js";
import "../styles/LoginGate.css";

export default function LoginGate({ onSuccess }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await validateToken(token.trim());
      if (res.valid) {
        sessionStorage.setItem("albion_token", token.trim());
        onSuccess();
      }
    } catch (err) {
      console.error("[LoginGate] Erro na validação:", err);
      setError(err.message || "Erro ao validar token.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-gate">
      <div className="login-card">
        <div className="login-icon">⚔️</div>
        <h1 className="login-title">Calculadora Albion</h1>
        <p className="login-subtitle">Insira o código de acesso para continuar</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            className="login-input"
            placeholder="Código de acesso"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={loading || !token.trim()}>
            {loading ? "Validando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
