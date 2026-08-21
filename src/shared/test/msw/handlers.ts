import { HttpResponse, http } from 'msw';

import {
  approver,
  employee,
  hotelCategory,
  itDepartment,
  makeApprovalRule,
  makeExpense,
  makeReportDetail,
  makeWarningRule,
  manager,
  mealsCategory,
  money,
  paginate,
  spain,
  tax,
} from '@/shared/test/fixtures';

export const API = 'http://localhost:8000';

/** Mirrors the backend's normalized error envelope. */
export function errorBody(code: string, detail: string, fields: Record<string, unknown> = {}) {
  return { code, detail, fields };
}

export function conflict(code: string, detail: string) {
  return HttpResponse.json(errorBody(code, detail), { status: 409 });
}

export function validationError(fields: Record<string, unknown>) {
  return HttpResponse.json(errorBody('invalid', 'Validation failed.', fields), { status: 400 });
}

/**
 * Default happy-path handlers. Individual tests override what they need with
 * `server.use(...)`; anything not handled fails the test loudly because the
 * setup file uses `onUnhandledRequest: 'error'`.
 */
export const handlers = [
  http.post(`${API}/api/auth/login/`, async () =>
    HttpResponse.json({ access: 'access-token', refresh: 'refresh-token', user: employee })
  ),

  http.post(`${API}/api/auth/refresh/`, async () =>
    HttpResponse.json({ access: 'access-token-2', refresh: 'refresh-token-2' })
  ),

  http.post(`${API}/api/auth/logout/`, () => new HttpResponse(null, { status: 205 })),

  http.get(`${API}/api/me/`, () => HttpResponse.json(employee)),

  http.get(`${API}/api/categories/`, () =>
    HttpResponse.json(paginate([hotelCategory, mealsCategory]))
  ),

  http.get(`${API}/api/warning-rules/`, () => HttpResponse.json(paginate([makeWarningRule()]))),

  http.get(`${API}/api/approval-rules/`, () => HttpResponse.json(paginate([makeApprovalRule()]))),

  http.post(`${API}/api/approval-rules/`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeApprovalRule({ id: 'approval-rule-new', ...body }), {
      status: 201,
    });
  }),

  // The dimension filter is what every consumer sends, so honour it here too.
  http.get(`${API}/api/org-attributes/`, ({ request }) => {
    const dimension = new URL(request.url).searchParams.get('dimension');
    const all = [spain, itDepartment, manager];
    return HttpResponse.json(
      paginate(dimension ? all.filter((value) => value.dimension === dimension) : all)
    );
  }),

  http.get(`${API}/api/users/`, () => HttpResponse.json(paginate([employee, approver]))),

  http.get(`${API}/api/reports/`, () => HttpResponse.json(paginate([makeReportDetail()]))),

  http.get(`${API}/api/reports/:reportId/`, ({ params }) =>
    HttpResponse.json(makeReportDetail({ id: String(params.reportId) }))
  ),

  http.get(`${API}/api/reports/:reportId/approval-preview/`, () =>
    HttpResponse.json({
      autoApprove: false,
      manualOverride: false,
      steps: [
        {
          stepOrder: 1,
          ruleId: makeApprovalRule().id,
          ruleName: makeApprovalRule().name,
          approvers: [approver],
        },
      ],
    })
  ),

  http.post(`${API}/api/reports/:reportId/delegate/`, ({ params }) =>
    HttpResponse.json(makeReportDetail({ id: String(params.reportId), status: 'SUBMITTED' }))
  ),

  http.get(`${API}/api/expenses/`, () => HttpResponse.json(paginate([makeExpense()]))),

  http.get(`${API}/api/expenses/:expenseId/`, ({ params }) =>
    HttpResponse.json(makeExpense({ id: String(params.expenseId) }))
  ),

  http.post(`${API}/api/expenses/calculate-preview/`, () =>
    HttpResponse.json({
      amount: money('12345'),
      netAmount: money('12345'),
      tax: tax('2592', 2100, false),
      total: money('14937'),
      warnings: [],
    })
  ),

  http.post(`${API}/api/expenses/`, () => HttpResponse.json(makeExpense(), { status: 201 })),
];
