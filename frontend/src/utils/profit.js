/** Classes CSS para valores monetários / lucro: verde se &gt; 0, vermelho se &lt; 0. */
export function profitClass(value) {
  if (!Number.isFinite(value)) return 'tabular-nums';
  if (value < 0) return 'tabular-nums num-loss';
  if (value > 0) return 'tabular-nums num-profit';
  return 'tabular-nums';
}
/** Classes CSS para fama: verde se lucro > 0 (ganha), laranja se lucro < 0 (gasta). */
export function famaClass(lucro) {
  if (!Number.isFinite(lucro)) return 'tabular-nums';
  if (lucro < 0) return 'tabular-nums fama-spent';
  if (lucro > 0) return 'tabular-nums fama-gain';
  return 'tabular-nums';
}
