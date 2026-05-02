import { useState, useEffect, lazy, Suspense } from 'react';
import ResourceMaster from './components/ResourceMaster.jsx';
import LoginGate from './components/LoginGate.jsx';
import { loadEquipmentHierarchy } from './data/equipmentHierarchy.js';
import {
  calculateWood,
  strategyWood,
  calculateFiber,
  strategyFiber,
  calculateLeather,
  strategyLeather,
  calculateMetal,
  strategyMetal,
} from './api.js';
import './App.css';

const MarketAnalyzer = lazy(() => import('./components/MarketAnalyzer.jsx'));
const EquipBuy = lazy(() => import('./components/EquipBuy.jsx'));
const RefinementHub = lazy(() => import('./components/RefinementHub.jsx'));

export default function App() {
  const [tab, setTab] = useState('hub');
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('albion_token') != null,
  );
  const [equipmentReady, setEquipmentReady] = useState(false);

  // Carregar hierarquia de equipamentos do backend ao inicializar
  useEffect(() => {
    loadEquipmentHierarchy()
      .then(() => {
        console.log('✓ Equipamentos carregados');
        setEquipmentReady(true);
      })
      .catch(err => {
        console.error('Erro ao carregar equipamentos:', err);
        setEquipmentReady(true); // Use fallback mesmo com erro
      });
  }, []);

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
            className={tab === 'hub' ? 'tab active' : 'tab'}
            onClick={() => setTab('hub')}
          >
            Hub
          </button>
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
            className={tab === 'market' ? 'tab active' : 'tab'}
            onClick={() => setTab('market')}
          >
            Market Analyzer
          </button>
          <button
            type="button"
            className={tab === 'equipbuy' ? 'tab active' : 'tab'}
            onClick={() => setTab('equipbuy')}
          >
            Equip Buy
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'hub' && (
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Carregando...</div>}>
            <RefinementHub />
          </Suspense>
        )}
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
        {tab === 'market' && (
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Carregando...</div>}>
            <MarketAnalyzer />
          </Suspense>
        )}
        {tab === 'equipbuy' && (
          equipmentReady ? (
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Carregando...</div>}>
              <EquipBuy />
            </Suspense>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              Carregando base de dados de equipamentos...
            </div>
          )
        )}
      </main>
    </div>
  );
}
