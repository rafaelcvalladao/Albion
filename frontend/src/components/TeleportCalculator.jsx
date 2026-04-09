import { useState, useMemo } from 'react';

const CARGO_TYPES = [
  { value: 'normal', label: 'Item normal', modifier: 1 },
  { value: 'resource', label: 'Recurso / Journal', modifier: 2.25 },
];

const DESTINATIONS = [
  { value: 1, label: 'Cidade Real → Cidade Real' },
  { value: 2, label: 'Cidade Real → Brecilien' },
];

const SILVER_PER_KG = 150;

export default function TeleportCalculator() {
  const [weight, setWeight] = useState('');
  const [cargoType, setCargoType] = useState('resource');
  const [distance, setDistance] = useState(1);

  const modifier = CARGO_TYPES.find((c) => c.value === cargoType)?.modifier ?? 1;

  const cost = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return null;
    return Math.round(SILVER_PER_KG * w * modifier * distance);
  }, [weight, modifier, distance]);

  return (
    <div className="teleport-panel">
      <h2>Calculadora de Teleporte</h2>
      <p className="teleport-hint">
        Fórmula: <code>150 × Peso (kg) × Modificador × Distância</code>
      </p>

      <div className="teleport-form">
        <label className="teleport-label">
          Peso do inventário (kg)
          <input
            type="number"
            min="0"
            step="0.1"
            className="teleport-input"
            placeholder="Ex: 1200"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>

        <label className="teleport-label">
          Tipo de carga
          <select
            className="teleport-select"
            value={cargoType}
            onChange={(e) => setCargoType(e.target.value)}
          >
            {CARGO_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} (×{c.modifier})
              </option>
            ))}
          </select>
        </label>

        <label className="teleport-label">
          Rota
          <select
            className="teleport-select"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cost != null && (
        <div className="teleport-result">
          <span className="teleport-result__label">Custo do teleporte</span>
          <span className="teleport-result__value">
            {cost.toLocaleString('pt-PT')} prata
          </span>
        </div>
      )}
    </div>
  );
}
