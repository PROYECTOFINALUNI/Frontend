import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { server } from '@/shared/test/msw/server';
import { API, errorBody } from '@/shared/test/msw/handlers';
import { breakfastField, hotelCategory, makeCategory, nightsField } from '@/shared/test/fixtures';

import { CategoriesPage } from './CategoriesPage';

/** Ambos diálogos están abiertos en la página, por lo que cada consulta debe indicar a cuál se refiere. */
async function openEditDialog() {
  const user = userEvent.setup();
  const row = within(await screen.findByRole('row', { name: /Hotel/ }));
  await user.click(row.getByRole('button', { name: 'Edit' }));

  return { user, dialog: within(await screen.findByRole('dialog', { name: 'Edit category' })) };
}

describe('CategoriesPage', () => {
  it('counts the active custom fields on each category', async () => {
    renderWithProviders(<CategoriesPage />);

    const hotel = within(await screen.findByRole('row', { name: /Hotel/ }));
    const meals = within(screen.getByRole('row', { name: /Meals/ }));

    expect(hotel.getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(meals.getByRole('cell', { name: '—' })).toBeInTheDocument();
  });

  it('adds a field and sends it without an id, so the API creates it', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${API}/api/categories/:id/`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(hotelCategory);
      })
    );

    renderWithProviders(<CategoriesPage />);
    const { user, dialog } = await openEditDialog();

    await user.click(dialog.getByRole('button', { name: 'Add field' }));
    // A regex, because the label of a required input carries a marker after its text.
    await user.type(dialog.getByLabelText(/Field 3 name/), 'Room type');
    await user.selectOptions(dialog.getByLabelText('Field 3 type'), 'TEXT');
    await user.click(dialog.getByRole('button', { name: 'Save category' }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body?.customFields).toEqual([
      { id: nightsField.id, name: 'Nights', fieldType: 'NUMBER', required: true, active: true },
      {
        id: breakfastField.id,
        name: 'Breakfast included',
        fieldType: 'BOOLEAN',
        required: false,
        active: true,
      },
      { name: 'Room type', fieldType: 'TEXT', required: false, active: true },
    ]);
  });

  it('locks the type of a field that already has values and offers Active instead of Remove', async () => {
    renderWithProviders(<CategoriesPage />);
    const { dialog } = await openEditDialog();

// El campo Nights no está en uso, por lo que puede editarse completamente.
    expect(dialog.getByLabelText('Field 1 type')).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Remove field 1' })).toBeInTheDocument();

// El campo Breakfast included está en uso, por lo que no puede cambiar de tipo y solo puede desactivarse.
    expect(dialog.getByLabelText('Field 2 type')).toBeDisabled();
    expect(dialog.queryByRole('button', { name: 'Remove field 2' })).not.toBeInTheDocument();
    expect(dialog.getByLabelText('Field 2 active')).toBeInTheDocument();
    expect(dialog.getByText(/Untick Active to retire it/)).toBeInTheDocument();
  });

  it('removes a field the admin just added', async () => {
    renderWithProviders(<CategoriesPage />);
    const { user, dialog } = await openEditDialog();

    await user.click(dialog.getByRole('button', { name: 'Add field' }));
    expect(dialog.getByLabelText(/Field 3 name/)).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Remove field 3' }));

    await waitFor(() => expect(dialog.queryByLabelText(/Field 3 name/)).not.toBeInTheDocument());
  });

  it('rejects two fields sharing a name before the request is made', async () => {
    renderWithProviders(<CategoriesPage />);
    const { user, dialog } = await openEditDialog();

    await user.click(dialog.getByRole('button', { name: 'Add field' }));
    await user.type(dialog.getByLabelText(/Field 3 name/), 'NIGHTS');
    await user.click(dialog.getByRole('button', { name: 'Save category' }));

    expect(
      await screen.findByText('Field names must be unique within a category')
    ).toBeInTheDocument();
  });

  it('explains the conflict when the API refuses to drop a field in use', async () => {
    server.use(
      http.get(`${API}/api/categories/`, () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [makeCategory({ customFields: [{ ...nightsField, inUse: false }] })],
        })
      ),
      http.patch(`${API}/api/categories/:id/`, () =>
        HttpResponse.json(
          errorBody(
            'category_field_in_use',
            'A custom field that already has saved values cannot be removed. Deactivate it instead.'
          ),
          { status: 409 }
        )
      )
    );

    renderWithProviders(<CategoriesPage />);
    const { user, dialog } = await openEditDialog();

    await user.click(dialog.getByRole('button', { name: 'Remove field 1' }));
    await user.click(dialog.getByRole('button', { name: 'Save category' }));

    expect(await screen.findByText(/cannot be removed. Deactivate it instead/)).toBeInTheDocument();
  });
});
