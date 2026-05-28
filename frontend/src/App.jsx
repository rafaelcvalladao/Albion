import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
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
import { useState } from 'react';
import './App.css';

const MarketAnalyzer = lazy(() => import('./components/MarketAnalyzer.jsx'));
const BlackMarketAnalyzer = lazy(() => import('./components/BlackMarketAnalyzer.jsx'));
const EquipBuy = lazy(() => import('./components/EquipBuy.jsx'));
const RefinementHub = lazy(() => import('./components/RefinementHub.jsx'));
const PotionAnalyzer = lazy(() => import('./components/PotionAnalyzer.jsx'));

const fallback = <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Carregando...</div>;

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('albion_token') != null,
  );
  const [equipmentReady, setEquipmentReady] = useState(false);

  useEffect(() => {
    loadEquipmentHierarchy()
      .then(() => {
        console.log('✓ Equipamentos carregados');
        setEquipmentReady(true);
      })
      .catch(err => {
        console.error('Erro ao carregar equipamentos:', err);
        setEquipmentReady(true);
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
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/hub">Hub</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/wood">Madeira</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/fiber">Tecido</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/leather">Couro</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/metal">Minério</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/market">Market Analyzer</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/blackmarket">Black Market</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/equipbuy">Equip Buy</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'tab active' : 'tab'} to="/potions">Poções</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Suspense fallback={fallback}>
          <Routes>
            <Route path="/" element={<Navigate to="/hub" replace />} />
            <Route path="/hub" element={<RefinementHub />} />
            <Route path="/wood" element={<ResourceMaster resource="wood" calculateFn={calculateWood} strategyFn={strategyWood} />} />
            <Route path="/fiber" element={<ResourceMaster resource="fiber" calculateFn={calculateFiber} strategyFn={strategyFiber} />} />
            <Route path="/leather" element={<ResourceMaster resource="leather" calculateFn={calculateLeather} strategyFn={strategyLeather} />} />
            <Route path="/metal" element={<ResourceMaster resource="metal" calculateFn={calculateMetal} strategyFn={strategyMetal} />} />
            <Route path="/market" element={<MarketAnalyzer />} />
            <Route path="/blackmarket" element={<BlackMarketAnalyzer />} />
            <Route
              path="/equipbuy"
              element={
                equipmentReady
                  ? <EquipBuy />
                  : <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Carregando base de dados de equipamentos...</div>
              }
            />
            <Route path="/potions" element={<PotionAnalyzer />} />
            <Route path="*" element={<Navigate to="/hub" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
