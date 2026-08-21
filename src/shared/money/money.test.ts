import { describe, expect, it } from 'vitest';

import {
  BIGINT_MAX,
  MoneyError,
  calculateTax,
  calculateTaxExcluded,
  calculateTaxIncluded,
  decimalToMinor,
  evaluateWarningsLocally,
  formatDisplay,
  formatRateBps,
  hasBlockingWarning,
  highestSeverity,
  isGreaterThanMinor,
  isValidDecimalString,
  minorToDecimal,
  roundHalfUpPositive,
  sumMinor,
  validateCurrency,
  type WarningRuleLike,
} from './money';

describe('validateCurrency', () => {
  it('normalizes case and surrounding whitespace', () => {
    expect(validateCurrency(' eur ')).toBe('EUR');
    expect(validateCurrency('jpy')).toBe('JPY');
  });

  it('rejects currencies the backend does not support', () => {
    expect(() => validateCurrency('CHF')).toThrow(MoneyError);
    expect(() => validateCurrency('')).toThrow(MoneyError);
  });
});

describe('decimalToMinor', () => {
  it('converts two-decimal currencies', () => {
    expect(decimalToMinor('123.45', 'EUR')).toBe(12345n);
    expect(decimalToMinor('0.01', 'EUR')).toBe(1n);
    expect(decimalToMinor('0', 'EUR')).toBe(0n);
  });

  it('right-pads a short or missing fraction instead of rounding', () => {
    expect(decimalToMinor('10', 'EUR')).toBe(1000n);
    expect(decimalToMinor('10.5', 'EUR')).toBe(1050n);
  });

  it('treats JPY as a zero-decimal currency', () => {
    expect(decimalToMinor('1000', 'JPY')).toBe(1000n);
    expect(() => decimalToMinor('1000.5', 'JPY')).toThrow(MoneyError);
  });

  it('rejects more decimal places than the currency allows', () => {
    expect(() => decimalToMinor('123.456', 'EUR')).toThrow(MoneyError);
  });

  it('rejects malformed strings', () => {
    for (const bad of ['', '123.', '.45', '-1.00', '1,00', 'abc', ' 1.00', '1.00 ', '+1.00']) {
      expect(() => decimalToMinor(bad, 'EUR')).toThrow(MoneyError);
    }
  });

  it('never loses precision above Number.MAX_SAFE_INTEGER', () => {
    // 90,071,992,547,409.93 EUR exceeds the float64 safe integer range in minor units.
    expect(decimalToMinor('90071992547409.93', 'EUR')).toBe(9007199254740993n);
  });

  it('rejects amounts beyond the bigint column range', () => {
    expect(() => decimalToMinor('99999999999999999999', 'EUR')).toThrow(MoneyError);
  });
});

describe('minorToDecimal', () => {
  it('renders a fixed scale for two-decimal currencies', () => {
    expect(minorToDecimal(12345n, 'EUR')).toBe('123.45');
    expect(minorToDecimal(5n, 'EUR')).toBe('0.05');
    expect(minorToDecimal(0n, 'EUR')).toBe('0.00');
  });

  it('renders zero-decimal currencies without a separator', () => {
    expect(minorToDecimal(1000n, 'JPY')).toBe('1000');
  });

  it('accepts the string minor units the API returns', () => {
    expect(minorToDecimal('14937', 'EUR')).toBe('149.37');
  });

  it('round-trips with decimalToMinor', () => {
    for (const value of ['0.00', '0.01', '9.99', '123.45', '1000000.00']) {
      expect(minorToDecimal(decimalToMinor(value, 'EUR'), 'EUR')).toBe(value);
    }
  });
});

describe('formatDisplay', () => {
  it('matches the backend format, which puts the code first', () => {
    expect(formatDisplay(12345n, 'EUR')).toBe('EUR 123.45');
    expect(formatDisplay('1000', 'JPY')).toBe('JPY 1000');
  });
});

describe('roundHalfUpPositive', () => {
  it('rounds ties upward rather than to even', () => {
    expect(roundHalfUpPositive(5n, 10n)).toBe(1n);
    expect(roundHalfUpPositive(4n, 10n)).toBe(0n);
    expect(roundHalfUpPositive(15n, 10n)).toBe(2n);
    expect(roundHalfUpPositive(25n, 10n)).toBe(3n);
  });

  it('rejects a negative numerator or a non-positive denominator', () => {
    expect(() => roundHalfUpPositive(-1n, 10n)).toThrow(MoneyError);
    expect(() => roundHalfUpPositive(1n, 0n)).toThrow(MoneyError);
  });
});

describe('calculateTaxExcluded', () => {
  // Vectors taken directly from the backend test suite.
  it.each([
    { net: 10000n, rate: 2100, tax: 2100n, total: 12100n },
    { net: 9999n, rate: 2100, tax: 2100n, total: 12099n },
    { net: 1n, rate: 4999, tax: 0n, total: 1n },
    { net: 1n, rate: 5000, tax: 1n, total: 2n },
    { net: 10000n, rate: 0, tax: 0n, total: 10000n },
  ])('net $net at $rate bps yields tax $tax and total $total', ({ net, rate, tax, total }) => {
    expect(calculateTaxExcluded(net, rate)).toEqual({
      netMinor: net,
      taxMinor: tax,
      totalMinor: total,
    });
  });

  it('matches the worked example from the project brief', () => {
    const amountMinor = decimalToMinor('123.45', 'EUR');
    const result = calculateTaxExcluded(amountMinor, 2100);
    expect(minorToDecimal(result.taxMinor, 'EUR')).toBe('25.92');
    expect(minorToDecimal(result.totalMinor, 'EUR')).toBe('149.37');
  });
});

describe('calculateTaxIncluded', () => {
  it('extracts tax from a gross receipt total', () => {
    expect(calculateTaxIncluded(12100n, 2100)).toEqual({
      netMinor: 10000n,
      taxMinor: 2100n,
      totalMinor: 12100n,
    });
  });

  it('leaves the total untouched at a zero rate', () => {
    expect(calculateTaxIncluded(12100n, 0)).toEqual({
      netMinor: 12100n,
      taxMinor: 0n,
      totalMinor: 12100n,
    });
  });

  it('keeps net plus tax equal to the gross total', () => {
    for (const gross of [1n, 7n, 999n, 12345n, 999999n]) {
      const { netMinor, taxMinor, totalMinor } = calculateTaxIncluded(gross, 2100);
      expect(netMinor + taxMinor).toBe(totalMinor);
    }
  });
});

describe('calculateTax', () => {
  it('dispatches on the included flag', () => {
    expect(calculateTax(10000n, 2100, false).totalMinor).toBe(12100n);
    expect(calculateTax(12100n, 2100, true).netMinor).toBe(10000n);
  });

  it('rejects rates outside 0..10000 basis points', () => {
    expect(() => calculateTax(10000n, -1, false)).toThrow(MoneyError);
    expect(() => calculateTax(10000n, 10001, false)).toThrow(MoneyError);
    expect(() => calculateTax(10000n, 21.5, false)).toThrow(MoneyError);
  });
});

describe('isGreaterThanMinor', () => {
  it('compares beyond the float64 safe integer range', () => {
    expect(isGreaterThanMinor('9007199254740993', '9007199254740992')).toBe(true);
    expect(isGreaterThanMinor('50000', '50000')).toBe(false);
    expect(isGreaterThanMinor('60000', '50000')).toBe(true);
  });

  it('handles the bigint column bound', () => {
    expect(isGreaterThanMinor(BIGINT_MAX, BIGINT_MAX - 1n)).toBe(true);
  });
});

describe('sumMinor', () => {
  it('adds string minor units without floating point drift', () => {
    expect(sumMinor(['10', '20', '3'])).toBe(33n);
    expect(sumMinor([])).toBe(0n);
  });
});

describe('isValidDecimalString', () => {
  it('accepts partial input the user may still be typing', () => {
    expect(isValidDecimalString('123', 'EUR')).toBe(true);
    expect(isValidDecimalString('123.4', 'EUR')).toBe(true);
    expect(isValidDecimalString('123.45', 'EUR')).toBe(true);
  });

  it('rejects over-long fractions without throwing', () => {
    expect(isValidDecimalString('123.456', 'EUR')).toBe(false);
    expect(isValidDecimalString('1.0', 'JPY')).toBe(false);
  });
});

describe('evaluateWarningsLocally', () => {
  const rule = (overrides: Partial<WarningRuleLike> = {}): WarningRuleLike => ({
    id: 'rule-1',
    currency: 'EUR',
    thresholdMinor: '50000',
    severity: 'WARNING',
    message: 'Hotel expense is above the recommended amount.',
    active: true,
    categoryId: null,
    ...overrides,
  });

  it('fires the brief example: a 600.00 EUR hotel expense over a 500.00 threshold', () => {
    const warnings = evaluateWarningsLocally([rule({ categoryId: 'hotel-uuid' })], {
      currency: 'EUR',
      categoryId: 'hotel-uuid',
      amountMinor: decimalToMinor('600.00', 'EUR'),
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('WARNING');
  });

  it('uses a strict comparison, so an exactly equal amount does not fire', () => {
    const warnings = evaluateWarningsLocally([rule()], {
      currency: 'EUR',
      categoryId: null,
      amountMinor: 50000n,
    });
    expect(warnings).toEqual([]);
  });

  it('fires one minor unit above the threshold', () => {
    const warnings = evaluateWarningsLocally([rule()], {
      currency: 'EUR',
      categoryId: null,
      amountMinor: 50001n,
    });
    expect(warnings).toHaveLength(1);
  });

  it('applies global rules to every category', () => {
    const warnings = evaluateWarningsLocally([rule({ categoryId: null })], {
      currency: 'EUR',
      categoryId: 'any-category',
      amountMinor: 60000n,
    });
    expect(warnings).toHaveLength(1);
  });

  it('skips rules scoped to a different category', () => {
    const warnings = evaluateWarningsLocally([rule({ categoryId: 'hotel-uuid' })], {
      currency: 'EUR',
      categoryId: 'meals-uuid',
      amountMinor: 60000n,
    });
    expect(warnings).toEqual([]);
  });

  it('skips inactive rules and mismatched currencies', () => {
    const rules = [rule({ id: 'a', active: false }), rule({ id: 'b', currency: 'USD' })];
    expect(
      evaluateWarningsLocally(rules, {
        currency: 'EUR',
        categoryId: null,
        amountMinor: 90000n,
      })
    ).toEqual([]);
  });

  it('orders results by rule id, matching the backend query', () => {
    const rules = [
      rule({ id: 'c', message: 'third' }),
      rule({ id: 'a', message: 'first' }),
      rule({ id: 'b', message: 'second' }),
    ];
    const messages = evaluateWarningsLocally(rules, {
      currency: 'EUR',
      categoryId: null,
      amountMinor: 90000n,
    }).map((warning) => warning.message);
    expect(messages).toEqual(['first', 'second', 'third']);
  });
});

describe('severity helpers', () => {
  it('reports the worst severity present', () => {
    expect(highestSeverity([{ severity: 'INFO' }, { severity: 'BLOCKING' }])).toBe('BLOCKING');
    expect(highestSeverity([{ severity: 'INFO' }, { severity: 'WARNING' }])).toBe('WARNING');
    expect(highestSeverity([])).toBeNull();
  });

  it('detects blocking warnings, which prevent submission', () => {
    expect(hasBlockingWarning([{ severity: 'WARNING' }])).toBe(false);
    expect(hasBlockingWarning([{ severity: 'BLOCKING' }])).toBe(true);
  });
});

describe('formatRateBps', () => {
  it('renders whole and fractional percentages', () => {
    expect(formatRateBps(2100)).toBe('21%');
    expect(formatRateBps(1000)).toBe('10%');
    expect(formatRateBps(750)).toBe('7.5%');
    expect(formatRateBps(0)).toBe('0%');
    expect(formatRateBps(10000)).toBe('100%');
  });
});
