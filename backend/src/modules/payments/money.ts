/**
 * Conversión de montos a centavos para Wompi.
 *
 * MySQL devuelve DECIMAL(10,2) como string cuando el valor no cabe en un
 * double sin pérdida, y como number en otros casos. Multiplicar directamente
 * por 100 produce errores clásicos de coma flotante (450000.05 * 100 =
 * 45000004.999...), que Wompi rechaza por no ser entero.
 *
 * El COP no usa decimales en la práctica, pero la columna sí los admite, así
 * que la conversión se hace sobre la representación en texto.
 */
export function toCents(amount: number | string): number {
  const raw = typeof amount === 'string' ? amount.trim() : String(amount);

  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Monto no numérico: ${raw}`);
  }

  const negative = raw.startsWith('-');
  const [whole, fraction = ''] = raw.replace('-', '').split('.');
  const cents =
    BigInt(whole || '0') * 100n + BigInt((fraction + '00').slice(0, 2).padEnd(2, '0'));

  const value = Number(negative ? -cents : cents);

  if (!Number.isSafeInteger(value)) {
    throw new Error(`Monto fuera de rango seguro: ${raw}`);
  }

  return value;
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}
