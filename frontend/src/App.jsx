import { useState } from "react";
import WoodMaster from "./components/WoodMaster.jsx";
import MarketAnalyzer from "./components/MarketAnalyzer.jsx";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("wood");

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <h1>Calculadora Albion</h1>
          <p className="app-tagline">Refino e mercado</p>
        </div>
        <nav className="tabs" aria-label="Secções">
          <button
            type="button"
            className={tab === "wood" ? "tab active" : "tab"}
            onClick={() => setTab("wood")}
          >
            Madeira
          </button>
          <button
            type="button"
            className={tab === "market" ? "tab active" : "tab"}
            onClick={() => setTab("market")}
          >
            Market Analyzer
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === "wood" && <WoodMaster />}
        {tab === "market" && <MarketAnalyzer />}
      </main>
    </div>
  );
}
