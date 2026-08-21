/** Funciones auxiliares para cálculos monetarios. Los resultados son previsualizaciones; el backend recalcula y guarda los valores definitivos. Los importes se procesan como enteros para evitar pérdidas de precisión.
Límite máximo admitido para los importes almacenados. */
export const BIGINT_MAX = 9_223_372_036_854_775_807n;

export const CURRENCY_MINOR_UNITS = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  JPY: 0,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_MINOR_UNITS;

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_MINOR_UNITS) as CurrencyCode[];

/** Error utilizado cuando se recibe un valor monetario no válido. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in CURRENCY_MINOR_UNITS;
}

/** Normaliza y valida el código ISO de la moneda. */
export function validateCurrency(currency: string): CurrencyCode {
  if (typeof currency !== 'string') {
    throw new MoneyError('Currency must be a string.');
  }
  const normalized = currency.trim().toUpperCase();
  if (!isCurrencyCode(normalized)) {
    throw new MoneyError(`Unsupported currency: ${currency}`);
  }
  return normalized;
}

export function minorUnits(currency: string): number {
  return CURRENCY_MINOR_UNITS[validateCurrency(currency)];
}

function checkMinorAmount(amountMinor: bigint): bigint {
  if (amountMinor < 0n || amountMinor > BIGINT_MAX) {
    throw new MoneyError('Minor-unit amount is outside the non-negative bigint range.');
  }
  return amountMinor;
}

/** Genera la expresión de validación según los decimales permitidos por cada moneda. Rechaza formatos incompletos o con más decimales de los admitidos.
 */
export function decimalPattern(currency: string): RegExp {
  const digits = minorUnits(currency);
  return digits === 0 ? /^(?:0|[0-9]+)$/ : new RegExp(`^(?:0|[0-9]+)(?:\\.[0-9]{1,${digits}})?$`);
}

export function isValidDecimalString(value: string, currency: string): boolean {
  if (typeof value !== 'string') return false;
  try {
    return decimalPattern(currency).test(value);
  } catch {
    return false;
  }
}

/** Convierte un importe decimal no negativo en unidades monetarias mínimas. */
export function decimalToMinor(value: string, currency: string): bigint {
  const digits = minorUnits(currency);
  if (typeof value !== 'string') {
    throw new MoneyError('Money input must be a decimal string.');
  }
  if (!decimalPattern(currency).test(value)) {
    throw new MoneyError('Invalid decimal money string.');
  }

  const separatorIndex = value.indexOf('.');
  const hasSeparator = separatorIndex !== -1;
  const whole = hasSeparator ? value.slice(0, separatorIndex) : value;
  const fraction = hasSeparator ? value.slice(separatorIndex + 1) : '';
  const paddedFraction = hasSeparator ? fraction.padEnd(digits, '0') : '0'.repeat(digits);

  const scale = 10n ** BigInt(digits);
  const amountMinor = BigInt(whole) * scale + BigInt(paddedFraction || '0');
  return checkMinorAmount(amountMinor);
}

/** Convierte las unidades monetarias mínimas en una cadena decimal con el número de decimales correspondiente. */
export function minorToDecimal(amountMinor: bigint | string, currency: string): string {
  const digits = minorUnits(currency);
  const amount = checkMinorAmount(toBigInt(amountMinor));
  if (digits === 0) {
    return amount.toString();
  }
  const scale = 10n ** BigInt(digits);
  const whole = amount / scale;
  const fraction = amount % scale;
  return `${whole}.${fraction.toString().padStart(digits, '0')}`;
}

/** Formatea el importe mostrando primero el código de moneda. Si el backend proporciona el valor formateado, se utiliza preferentemente.
 */
export function formatDisplay(amountMinor: bigint | string, currency: string): string {
  const normalized = validateCurrency(currency);
  return `${normalized} ${minorToDecimal(amountMinor, normalized)}`;
}

export function toBigInt(value: bigint | string | number): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new MoneyError('Only safe integers can be converted to minor units.');
    }
    return BigInt(value);
  }
  if (typeof value !== 'string' || !/^-?[0-9]+$/.test(value)) {
    throw new MoneyError(`Expected an integer string, received: ${String(value)}`);
  }
  return BigInt(value);
}

/** Compara si el importe supera estrictamente el límite definido para generar un aviso. */
export function isGreaterThanMinor(left: bigint | string, right: bigint | string): boolean {
  return toBigInt(left) > toBigInt(right);
}

export function sumMinor(values: Array<bigint | string>): bigint {
  return values.reduce<bigint>((total, value) => total + toBigInt(value), 0n);
}

/** Redondea una fracción positiva al entero más cercano, redondeando hacia arriba en caso de empate.
 */
export function roundHalfUpPositive(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new MoneyError('Expected a non-negative numerator and positive denominator.');
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return quotient + (remainder * 2n >= denominator ? 1n : 0n);
}

export const MAX_TAX_RATE_BPS = 10_000;

export function checkTaxRateBps(rateBps: number): bigint {
  if (!Number.isInteger(rateBps)) {
    throw new MoneyError('Tax rate basis points must be an integer.');
  }
  if (rateBps < 0 || rateBps > MAX_TAX_RATE_BPS) {
    throw new MoneyError('Tax rate basis points must be between 0 and 10000.');
  }
  return BigInt(rateBps);
}

export type TaxCalculation = {
  netMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
};

/** `amountMinor` representa el importe neto, al que se añade el impuesto. */
export function calculateTaxExcluded(netMinor: bigint | string, rateBps: number): TaxCalculation {
  const net = checkMinorAmount(toBigInt(netMinor));
  const rate = checkTaxRateBps(rateBps);
  const taxMinor = roundHalfUpPositive(net * rate, 10_000n);
  const totalMinor = checkMinorAmount(net + taxMinor);
  return { netMinor: net, taxMinor, totalMinor };
}

/** `amountMinor` representa el importe total, del que se extrae el impuesto. */
export function calculateTaxIncluded(totalMinor: bigint | string, rateBps: number): TaxCalculation {
  const total = checkMinorAmount(toBigInt(totalMinor));
  const rate = checkTaxRateBps(rateBps);
  const taxMinor = roundHalfUpPositive(total * rate, 10_000n + rate);
  return { netMinor: total - taxMinor, taxMinor, totalMinor: total };
}

export function calculateTax(
  amountMinor: bigint | string,
  rateBps: number,
  taxIncluded: boolean
): TaxCalculation {
  return taxIncluded
    ? calculateTaxIncluded(amountMinor, rateBps)
    : calculateTaxExcluded(amountMinor, rateBps);
}

export type WarningSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

/** Datos necesarios de una regla para evaluar los avisos localmente. */
export type WarningRuleLike = {
  id: string;
  currency: string;
  thresholdMinor: string;
  severity: WarningSeverity;
  message: string;
  active: boolean;
  categoryId: string | null;
};

export type LocalWarning = {
  severity: WarningSeverity;
  message: string;
  ruleId: string;
};

/** Evalúa localmente las reglas de aviso siguiendo la misma lógica que el backend. Una regla se aplica si está activa, coincide la moneda y el importe supera su límite.
 */
export function evaluateWarningsLocally(
  rules: readonly WarningRuleLike[],
  input: { currency: string; categoryId: string | null; amountMinor: bigint | string }
): LocalWarning[] {
  const amount = toBigInt(input.amountMinor);
  return rules
    .filter((rule) => rule.active)
    .filter((rule) => rule.currency === input.currency)
    .filter((rule) => amount > toBigInt(rule.thresholdMinor))
    .filter((rule) => rule.categoryId === null || rule.categoryId === input.categoryId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((rule) => ({ severity: rule.severity, message: rule.message, ruleId: rule.id }));
}

const SEVERITY_ORDER: Record<WarningSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  BLOCKING: 2,
};

export function highestSeverity(
  warnings: ReadonlyArray<{ severity: WarningSeverity }>
): WarningSeverity | null {
  return warnings.reduce<WarningSeverity | null>((worst, warning) => {
    if (worst === null || SEVERITY_ORDER[warning.severity] > SEVERITY_ORDER[worst]) {
      return warning.severity;
    }
    return worst;
  }, null);
}

export function hasBlockingWarning(
  warnings: ReadonlyArray<{ severity: WarningSeverity }>
): boolean {
  return warnings.some((warning) => warning.severity === 'BLOCKING');
}

/** Convierte los puntos básicos a un porcentaje legible, por ejemplo 2100 → "21%". */
export function formatRateBps(rateBps: number): string {
  const whole = Math.trunc(rateBps / 100);
  const fraction = Math.abs(rateBps % 100);
  if (fraction === 0) return `${whole}%`;
  const padded = fraction.toString().padStart(2, '0').replace(/0$/, '');
  return `${whole}.${padded}%`;
}
