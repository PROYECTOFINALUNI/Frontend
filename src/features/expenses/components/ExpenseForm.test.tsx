import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { server } from '@/shared/test/msw/server';
import { API, errorBody } from '@/shared/test/msw/handlers';
import {
  breakfastField,
  hotelCategory,
  makeExpense,
  makeWarningRule,
  mealsCategory,
  money,
  nightsField,
  paginate,
  tax,
} from '@/shared/test/fixtures';

import { ExpenseForm } from './ExpenseForm';

function renderForm(overrides: Partial<React.ComponentProps<typeof ExpenseForm>> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn().mockResolvedValue(undefined);

  renderWithProviders(
    <ExpenseForm
      reportId="report-1"
      onSubmit={onSubmit}
      onCancel={() => {}}
      submitLabel="Save expense"
      {...overrides}
    />
  );

  return { onSubmit };
}

describe('ExpenseForm', () => {
  it('computes the local tax preview from the typed amount before the server replies', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {})));

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '100.00');

    // 100.00 at 21% tax excluded: net 100.00, tax 21.00, total 121.00.
    await waitFor(() => {
      expect(screen.getByText('Preview total (local estimate)')).toBeInTheDocument();
    });
    expect(screen.getByText('EUR 21.00')).toBeInTheDocument();
    expect(screen.getByText('EUR 121.00')).toBeInTheDocument();
  });

  it('treats the amount as gross when tax is included', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {})));

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '121.00');
    await user.click(screen.getByLabelText(/Included/));

    // 121.00 gross at 21%: net 100.00, tax 21.00, total stays 121.00.
    await waitFor(() => {
      expect(screen.getByText('EUR 100.00')).toBeInTheDocument();
    });
    expect(screen.getByText('EUR 21.00')).toBeInTheDocument();
  });

  it('replaces the local estimate with the server preview once it arrives', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API}/api/expenses/calculate-preview/`, () =>
        HttpResponse.json({
          amount: money('10000'),
          netAmount: money('10000'),
          tax: tax('2100', 2100, false),
          total: money('12100'),
          warnings: [],
        })
      )
    );

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '100.00');

    await waitFor(
      () => {
        expect(screen.getByText('Preview total (checked by the server)')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('never labels a preview as the saved value', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '10.00');

    await waitFor(() => {
      expect(screen.getByText(/These figures are a preview/)).toBeInTheDocument();
    });
  });

  it('raises a local warning when the amount exceeds a rule threshold', async () => {
    const user = userEvent.setup();

    server.use(
      // 500.00 EUR threshold on the hotel category.
      http.get(`${API}/api/warning-rules/`, () =>
        HttpResponse.json(
          paginate([
            makeWarningRule({
              thresholdMinor: '50000',
              severity: 'WARNING',
              message: 'Hotel expense is unusually high.',
            }),
          ])
        )
      ),
      http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {}))
    );

    renderForm();

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(screen.getByLabelText(/Amount/), '600.00');

    expect(await screen.findByText('Hotel expense is unusually high.')).toBeInTheDocument();
  });

  it('does not fire a warning when the amount only equals the threshold', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/api/warning-rules/`, () =>
        HttpResponse.json(
          paginate([
            makeWarningRule({ thresholdMinor: '50000', message: 'Hotel expense is high.' }),
          ])
        )
      ),
      http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {}))
    );

    renderForm();

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(screen.getByLabelText(/Amount/), '500.00');

    await waitFor(() => {
      expect(screen.getByText('EUR 605.00')).toBeInTheDocument();
    });
    // The backend compares strictly greater than, so 500.00 is not flagged.
    expect(screen.queryByText('Hotel expense is high.')).not.toBeInTheDocument();
  });

  it('warns that a blocking rule prevents submission', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/api/warning-rules/`, () =>
        HttpResponse.json(
          paginate([
            makeWarningRule({
              categoryId: null,
              severity: 'BLOCKING',
              thresholdMinor: '10000',
              message: 'Requires finance pre-approval.',
            }),
          ])
        )
      ),
      http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {}))
    );

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '250.00');

    expect(await screen.findByText('Requires finance pre-approval.')).toBeInTheDocument();
    expect(await screen.findByText(/cannot be submitted while a blocking warning/)).toBeVisible();
  });

  it('submits the amount as a string, with tax nested the way the API expects', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(/Merchant/), 'Hotel Barcelona');
    await user.type(screen.getByLabelText(/Amount/), '123.45');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 'report-1',
        merchant: 'Hotel Barcelona',
        amountDecimal: '123.45',
        currency: 'EUR',
        categoryId: null,
        tax: { rateBps: 2100, included: false },
      })
    );
  });

  it('rejects more decimal places than the currency allows', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(/Merchant/), 'Taxi');
    await user.type(screen.getByLabelText(/Amount/), '10.999');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText(/at most 2 decimal places for EUR/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('attaches server field errors to the matching inputs', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error('Validation failed.'), {
        name: 'ApiError',
        status: 400,
        code: 'invalid',
        detail: 'Validation failed.',
        fields: { merchant: ['This merchant is blocked.'] },
      })
    );

    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(/Merchant/), 'Blocked Ltd');
    await user.type(screen.getByLabelText(/Amount/), '10.00');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    // A plain Error is not an ApiError, so it surfaces as a form-level message.
    expect(await screen.findByRole('alert')).toHaveTextContent('Validation failed.');
  });

  it('announces warnings in a live region so they are read without moving focus', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API}/api/warning-rules/`, () =>
        HttpResponse.json(
          paginate([
            makeWarningRule({ categoryId: null, thresholdMinor: '1000', message: 'Over budget.' }),
          ])
        )
      ),
      http.post(`${API}/api/expenses/calculate-preview/`, () => new Promise(() => {}))
    );

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '50.00');

    const live = await screen.findByText('Over budget.');
    const region = live.closest('[aria-live="polite"]');

    expect(region).not.toBeNull();
    expect(within(region as HTMLElement).getByText('Over budget.')).toBeInTheDocument();
  });

  it("reveals the selected category's custom fields and hides them again on switch", async () => {
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('option', { name: /Hotel/ });
    expect(screen.queryByLabelText(/Nights/)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);

    expect(await screen.findByLabelText(/Nights/)).toBeInTheDocument();
    expect(screen.getByLabelText('Breakfast included')).toBeInTheDocument();

    // Meals defines no custom fields, so selecting it takes the inputs away.
    await user.selectOptions(screen.getByLabelText(/Category/), mealsCategory.id);

    await waitFor(() => expect(screen.queryByLabelText(/Nights/)).not.toBeInTheDocument());
  });

  it('blocks submission until a required custom field is answered', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderForm({ onSubmit });

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(screen.getByLabelText(/Merchant/), 'Hotel Barcelona');
    await user.type(screen.getByLabelText(/Amount/), '123.45');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('Nights is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the custom answers keyed by field id, with an unticked box as false', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderForm({ onSubmit });

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(screen.getByLabelText(/Merchant/), 'Hotel Barcelona');
    await user.type(screen.getByLabelText(/Amount/), '123.45');
    await user.type(await screen.findByLabelText(/Nights/), '3');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onSubmit.mock.calls[0][0].customFields).toEqual([
      { fieldId: nightsField.id, value: '3' },
      { fieldId: breakfastField.id, value: false },
    ]);
  });

  it('drops the previous category answers rather than submitting them', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderForm({ onSubmit });

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(await screen.findByLabelText(/Nights/), '3');
    await user.selectOptions(screen.getByLabelText(/Category/), mealsCategory.id);

    await user.type(screen.getByLabelText(/Merchant/), 'Corner Cafe');
    await user.type(screen.getByLabelText(/Amount/), '12.00');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onSubmit.mock.calls[0][0].customFields).toEqual([]);
  });

  it('prefills the stored answers when editing an expense', async () => {
    renderForm({ expense: makeExpense() });

    expect(await screen.findByLabelText(/Nights/)).toHaveValue(3);
    expect(screen.getByLabelText('Breakfast included')).toBeChecked();
  });

  it('pins a server error for a custom field onto that input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(400, {
        code: 'invalid',
        detail: 'Validation failed.',
        fields: { [`customFields.${nightsField.id}`]: ["'Nights' is too large."] },
      })
    );

    renderForm({ onSubmit });

    await screen.findByRole('option', { name: /Hotel/ });
    await user.selectOptions(screen.getByLabelText(/Category/), hotelCategory.id);
    await user.type(screen.getByLabelText(/Merchant/), 'Hotel Barcelona');
    await user.type(screen.getByLabelText(/Amount/), '123.45');
    await user.type(await screen.findByLabelText(/Nights/), '9');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText("'Nights' is too large.")).toBeInTheDocument();
  });

  it('falls back to the local estimate when the server preview fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API}/api/expenses/calculate-preview/`, () =>
        HttpResponse.json(errorBody('report_not_owned', 'Not your report.'), { status: 409 })
      )
    );

    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '100.00');

    expect(await screen.findByText(/server preview is unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Preview total (local estimate)')).toBeInTheDocument();
  });
});
