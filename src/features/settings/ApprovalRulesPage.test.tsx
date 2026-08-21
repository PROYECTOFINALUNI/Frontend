import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { server } from '@/shared/test/msw/server';
import { API } from '@/shared/test/msw/handlers';
import {
  itDepartment,
  makeApprovalRule,
  manager,
  paginate,
  spain,
} from '@/shared/test/fixtures';

import { ApprovalRulesPage } from './ApprovalRulesPage';

/** La página contiene formularios de creación y edición con campos repetidos, por lo que las consultas deben limitarse al formulario correspondiente.
 */
async function openCreateDialog() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'New rule' }));

  const dialog = within(await screen.findByRole('dialog', { name: 'New approval rule' }));
  return {
    user,
    dialog,
    fieldset: (name: RegExp) => within(dialog.getByRole('group', { name })),
  };
}

describe('ApprovalRulesPage', () => {
  it('summarises a rule as the criteria it matches on', async () => {
    renderWithProviders(<ApprovalRulesPage />);

    const row = within(await screen.findByRole('row', { name: /Spain IT managers/ }));

    expect(row.getByText('All categories')).toBeInTheDocument();
    expect(row.getByText('above EUR 0.00')).toBeInTheDocument();
   // El solicitante es de España e IT; los aprobadores deben ser de España, IT y tener el cargo de Manager.
    expect(row.getByText('Spain · IT · Any')).toBeInTheDocument();
    expect(row.getByText('Spain · IT · Manager')).toBeInTheDocument();
    expect(row.getByText('2 matching people')).toBeInTheDocument();
  });

  it('flags a rule whose approver criteria match nobody', async () => {
    server.use(
      http.get(`${API}/api/approval-rules/`, () =>
        HttpResponse.json(paginate([makeApprovalRule({ approverPoolSize: 0 })]))
      )
    );

    renderWithProviders(<ApprovalRulesPage />);

    expect(
      await screen.findByText('No matching approver — this rule is skipped')
    ).toBeInTheDocument();
  });

  it('explains that reports are auto-approved when no rule exists', async () => {
    server.use(http.get(`${API}/api/approval-rules/`, () => HttpResponse.json(paginate([]))));

    renderWithProviders(<ApprovalRulesPage />);

    expect(await screen.findByText('No approval rules yet')).toBeInTheDocument();
  });

  it('sends the threshold in minor units and empty criteria as null', async () => {
    let body: Record<string, unknown> | undefined;

    server.use(
      http.post(`${API}/api/approval-rules/`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeApprovalRule(body), { status: 201 });
      })
    );

    renderWithProviders(<ApprovalRulesPage />);

    const { user, dialog, fieldset } = await openCreateDialog();

    await user.type(dialog.getByLabelText(/Rule name/), 'Big Spanish expenses');

    // Wait for the org catalog before selecting, otherwise the options are absent.
    await dialog.findAllByRole('option', { name: 'Spain' });
    await user.selectOptions(fieldset(/Submitter matches/).getByLabelText(/Location/), spain.id);
    await user.selectOptions(
      fieldset(/Approver pool/).getByLabelText(/Department/),
      itDepartment.id
    );
    await user.selectOptions(fieldset(/Approver pool/).getByLabelText(/Position/), manager.id);
    await user.selectOptions(dialog.getByLabelText(/Role/), 'APPROVER');

    await user.clear(dialog.getByLabelText(/Threshold/));
    await user.type(dialog.getByLabelText(/Threshold/), '500.00');

    await user.click(dialog.getByRole('button', { name: 'Save rule' }));

    await waitFor(() => expect(body).toBeDefined());

    expect(body).toMatchObject({
      name: 'Big Spanish expenses',
      currency: 'EUR',
      thresholdMinor: '50000',
      categoryId: null,
      submitterLocationId: spain.id,
      submitterDepartmentId: null,
      submitterPositionId: null,
      approverRole: 'APPROVER',
      approverLocationId: null,
      approverDepartmentId: itDepartment.id,
      approverPositionId: manager.id,
      active: true,
    });
  });

  it('keeps the dialog open and shows the server message when the rule is rejected', async () => {
    server.use(
      http.post(`${API}/api/approval-rules/`, () =>
        HttpResponse.json(
          {
            code: 'invalid',
            detail: 'Validation failed.',
            fields: { name: ['A rule with this name already exists.'] },
          },
          { status: 400 }
        )
      )
    );

    renderWithProviders(<ApprovalRulesPage />);

    const { user, dialog } = await openCreateDialog();

    await user.type(dialog.getByLabelText(/Rule name/), 'Spain IT managers');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));

    expect(await dialog.findByText('A rule with this name already exists.')).toBeInTheDocument();
    expect(dialog.getByLabelText(/Rule name/)).toHaveValue('Spain IT managers');
  });
});
