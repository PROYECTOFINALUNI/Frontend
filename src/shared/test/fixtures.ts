import type {
  ApprovalRule,
  ApprovalStep,
  Category,
  CategoryField,
  Expense,
  Money,
  OrgAttribute,
  ReportDetail,
  ReportListItem,
  TaxRead,
  User,
  WarningRule,
} from '@/shared/types/domain';

import { formatDisplay, minorToDecimal } from '@/shared/money/money';

export function money(minor: string, currency: 'EUR' | 'USD' | 'GBP' | 'JPY' = 'EUR'): Money {
  return {
    currency,
    minor,
    decimal: minorToDecimal(minor, currency),
    display: formatDisplay(minor, currency),
  };
}

export function tax(minor: string, rateBps: number, included: boolean): TaxRead {
  return {
    rateBps,
    included,
    minor,
    decimal: minorToDecimal(minor, 'EUR'),
    // The backend pops `currency` from the tax object but keeps the display string.
    display: formatDisplay(minor, 'EUR'),
  };
}

const TIMESTAMP = '2026-05-06T09:00:00Z';

export function makeOrgAttribute(overrides: Partial<OrgAttribute> = {}): OrgAttribute {
  return {
    id: 'org-spain',
    dimension: 'LOCATION',
    code: 'SPAIN',
    name: 'Spain',
    active: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export const spain = makeOrgAttribute();
export const itDepartment = makeOrgAttribute({
  id: 'org-it',
  dimension: 'DEPARTMENT',
  code: 'IT',
  name: 'IT',
});
export const manager = makeOrgAttribute({
  id: 'org-manager',
  dimension: 'POSITION',
  code: 'MANAGER',
  name: 'Manager',
});

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-employee',
    email: 'employee@example.com',
    fullName: 'Elena Employee',
    role: 'EMPLOYEE',
    active: true,
    location: null,
    department: null,
    position: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export const employee = makeUser();
export const approver = makeUser({
  id: 'user-approver',
  email: 'approver@example.com',
  fullName: 'Ana Approver',
  role: 'APPROVER',
});
export const admin = makeUser({
  id: 'user-admin',
  email: 'admin@example.com',
  fullName: 'Adrian Admin',
  role: 'ADMIN',
});

export function makeCategoryField(overrides: Partial<CategoryField> = {}): CategoryField {
  return {
    id: 'field-nights',
    name: 'Nights',
    fieldType: 'NUMBER',
    required: true,
    active: true,
    displayOrder: 0,
    inUse: false,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export const nightsField = makeCategoryField();
export const breakfastField = makeCategoryField({
  id: 'field-breakfast',
  name: 'Breakfast included',
  fieldType: 'BOOLEAN',
  required: false,
  displayOrder: 1,
  inUse: true,
});

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-hotel',
    code: 'HOTEL',
    name: 'Hotel',
    active: true,
    customFields: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

/** Hotel carries custom fields; Meals deliberately has none, so switching clears them. */
export const hotelCategory = makeCategory({ customFields: [nightsField, breakfastField] });
export const mealsCategory = makeCategory({
  id: 'category-meals',
  code: 'MEALS',
  name: 'Meals',
});

export function makeWarningRule(overrides: Partial<WarningRule> = {}): WarningRule {
  return {
    id: 'rule-hotel',
    name: 'High hotel expense',
    categoryId: hotelCategory.id,
    currency: 'EUR',
    thresholdMinor: '50000',
    severity: 'WARNING',
    message: 'Hotel expense is above the recommended amount.',
    active: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeApprovalRule(overrides: Partial<ApprovalRule> = {}): ApprovalRule {
  return {
    id: 'approval-rule-1',
    name: 'Spain IT managers',
    active: true,
    priority: 100,
    categoryId: null,
    currency: 'EUR',
    thresholdMinor: '0',
    submitterLocationId: spain.id,
    submitterDepartmentId: itDepartment.id,
    submitterPositionId: null,
    approverRole: 'APPROVER',
    approverLocationId: spain.id,
    approverDepartmentId: itDepartment.id,
    approverPositionId: manager.id,
    approverPoolSize: 2,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'expense-1',
    reportId: 'report-1',
    merchant: 'Hotel Barcelona',
    expenseDate: '2026-05-06',
    category: hotelCategory,
    status: 'DRAFT',
    amount: money('12345'),
    netAmount: money('12345'),
    tax: tax('2592', 2100, false),
    total: money('14937'),
    warnings: [],
    customFields: [
      { fieldId: nightsField.id, name: nightsField.name, fieldType: 'NUMBER', value: '3' },
      {
        fieldId: breakfastField.id,
        name: breakfastField.name,
        fieldType: 'BOOLEAN',
        value: true,
      },
    ],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeApprovalStep(overrides: Partial<ApprovalStep> = {}): ApprovalStep {
  return {
    id: 'step-1',
    approvers: [approver],
    decidedBy: null,
    origin: 'RULE',
    ruleName: 'Spain IT managers',
    stepOrder: 1,
    status: 'PENDING',
    decidedAt: null,
    comment: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeReportListItem(overrides: Partial<ReportListItem> = {}): ReportListItem {
  return {
    id: 'report-1',
    title: 'May travel',
    status: 'DRAFT',
    expenseCount: 1,
    totals: [money('14937')],
    submittedAt: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeReportDetail(overrides: Partial<ReportDetail> = {}): ReportDetail {
  return {
    ...makeReportListItem(),
    owner: employee,
    expenses: [makeExpense()],
    approvalSteps: [makeApprovalStep()],
    events: [],
    ...overrides,
  };
}

export function paginate<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results };
}
