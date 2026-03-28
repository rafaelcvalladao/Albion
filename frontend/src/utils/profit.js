/** Classes CSS para valores monetários / lucro: verde se &gt; 0, vermelho se &lt; 0. */
export function profitClass(value) {
  if (!Number.isFinite(value)) return "tabular-nums";
  if (value < 0) return "tabular-nums num-loss";
  if (value > 0) return "tabular-nums num-profit";
  return "tabular-nums";
}
