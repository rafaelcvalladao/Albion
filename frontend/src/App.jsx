import { useState } from "react";
import WoodMaster from "./components/WoodMaster.jsx";
import FiberMaster from "./components/FiberMaster.jsx";
import LeatherMaster from "./components/LeatherMaster.jsx";
import MetalMaster from "./components/MetalMaster.jsx";
import StoneMaster from "./components/StoneMaster.jsx";
import MarketAnalyzer from "./components/MarketAnalyzer.jsx";
import LoginGate from "./components/LoginGate.jsx";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("wood");
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("albion_token") != null
  );

  if (!authenticated) {
    return <LoginGate onSuccess={() => setAuthenticated(true)} />;
  }

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
            className={tab === "fiber" ? "tab active" : "tab"}
            onClick={() => setTab("fiber")}
          >
            Tecido
          </button>
          <button
            type="button"
            className={tab === "leather" ? "tab active" : "tab"}
            onClick={() => setTab("leather")}
          >
            Couro
          </button>
          <button
            type="button"
            className={tab === "metal" ? "tab active" : "tab"}
            onClick={() => setTab("metal")}
          >
            Minério
          </button>
          <button
            type="button"
            className={tab === "stone" ? "tab active" : "tab"}
            onClick={() => setTab("stone")}
          >
            Pedra
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
        {tab === "fiber" && <FiberMaster />}
        {tab === "leather" && <LeatherMaster />}
        {tab === "metal" && <MetalMaster />}
        {tab === "stone" && <StoneMaster />}
        {tab === "market" && <MarketAnalyzer />}
      </main>
    </div>
  );
}
