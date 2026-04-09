import { useState } from 'react';
import ResourceMaster from './components/ResourceMaster.jsx';
import MarketAnalyzer from './components/MarketAnalyzer.jsx';
import TeleportCalculator from './components/TeleportCalculator.jsx';
import LoginGate from './components/LoginGate.jsx';
import {
  calculateWood,
  strategyWood,
  calculateFiber,
  strategyFiber,
  calculateLeather,
  strategyLeather,
  calculateMetal,
  strategyMetal,
  calculateStone,
  strategyStone,
} from './api.js';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('wood');
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('albion_token') != null,
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
            className={tab === 'wood' ? 'tab active' : 'tab'}
            onClick={() => setTab('wood')}
          >
            Madeira
          </button>
          <button
            type="button"
            className={tab === 'fiber' ? 'tab active' : 'tab'}
            onClick={() => setTab('fiber')}
          >
            Tecido
          </button>
          <button
            type="button"
            className={tab === 'leather' ? 'tab active' : 'tab'}
            onClick={() => setTab('leather')}
          >
            Couro
          </button>
          <button
            type="button"
            className={tab === 'metal' ? 'tab active' : 'tab'}
            onClick={() => setTab('metal')}
          >
            Minério
          </button>
          <button
            type="button"
            className={tab === 'stone' ? 'tab active' : 'tab'}
            onClick={() => setTab('stone')}
          >
            Pedra
          </button>
          <button
            type="button"
            className={tab === 'market' ? 'tab active' : 'tab'}
            onClick={() => setTab('market')}
          >
            Market Analyzer
          </button>
          <button
            type="button"
            className={tab === 'teleport' ? 'tab active' : 'tab'}
            onClick={() => setTab('teleport')}
          >
            Teleporte
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'wood' && (
          <ResourceMaster resource="wood" calculateFn={calculateWood} strategyFn={strategyWood} />
        )}
        {tab === 'fiber' && (
          <ResourceMaster
            resource="fiber"
            calculateFn={calculateFiber}
            strategyFn={strategyFiber}
          />
        )}
        {tab === 'leather' && (
          <ResourceMaster
            resource="leather"
            calculateFn={calculateLeather}
            strategyFn={strategyLeather}
          />
        )}
        {tab === 'metal' && (
          <ResourceMaster
            resource="metal"
            calculateFn={calculateMetal}
            strategyFn={strategyMetal}
          />
        )}
        {tab === 'stone' && (
          <ResourceMaster
            resource="stone"
            calculateFn={calculateStone}
            strategyFn={strategyStone}
          />
        )}
        {tab === 'market' && <MarketAnalyzer />}
        {tab === 'teleport' && <TeleportCalculator />}
      </main>
    </div>
  );
}
