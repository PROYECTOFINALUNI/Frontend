import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { CurrencyCode } from '@/shared/money/money';

import { MoneyInput } from './MoneyInput';

function Harness({ currency = 'EUR' as CurrencyCode, initial = '' }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MoneyInput label="Amount" currency={currency} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('keeps the typed value as an exact string, preserving trailing zeros', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Amount'), '10.50');

    expect(screen.getByTestId('value')).toHaveTextContent('10.50');
    expect(screen.getByLabelText('Amount')).toHaveValue('10.50');
  });

  it('preserves a long string of digits without precision loss', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Amount'), '90071992547409.91');

    expect(screen.getByTestId('value')).toHaveTextContent('90071992547409.91');
  });

  it('rejects letters and symbols', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Amount'), '1a2b!3');

    expect(screen.getByTestId('value')).toHaveTextContent('123');
  });

  it('rejects a second decimal separator', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Amount'), '1.2.3');

    expect(screen.getByTestId('value')).toHaveTextContent('1.23');
  });

  it('maps a comma onto a dot for European keyboards', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Amount'), '12,34');

    expect(screen.getByTestId('value')).toHaveTextContent('12.34');
  });

  it('blocks the decimal separator entirely for JPY', async () => {
    const user = userEvent.setup();
    render(<Harness currency="JPY" />);

    await user.type(screen.getByLabelText('Amount'), '1234.56');

    expect(screen.getByTestId('value')).toHaveTextContent('123456');
  });

  it('states the number of decimal places for the currency', () => {
    const { rerender } = render(<Harness />);
    expect(screen.getByText('EUR supports 2 decimal places.')).toBeInTheDocument();

    rerender(<Harness currency="JPY" />);
    expect(screen.getByText('JPY has no decimal places.')).toBeInTheDocument();
  });

  it('links its error message with aria-describedby and marks itself invalid', () => {
    render(
      <MoneyInput
        label="Amount"
        currency="EUR"
        value="abc"
        onChange={() => {}}
        error="Enter a positive amount"
      />
    );

    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a positive amount');
  });

  it('shows the currency code alongside the field', () => {
    render(<Harness currency="GBP" />);
    expect(screen.getByText('GBP')).toBeInTheDocument();
  });
});
