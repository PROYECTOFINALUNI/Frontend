import type {
  ExpenseListParams,
  OrgAttributeListParams,
  ReportListParams,
  UserListParams,
} from '@/shared/types/domain';

/**
 * Centralized query keys so mutations can invalidate precisely.
 * Every list key is prefixed by its collection key, which lets
 * `invalidateQueries({ queryKey: reportKeys.all })` cover both.
 */
export const reportKeys = {
  all: ['reports'] as const,
  list: (params: ReportListParams = {}) => ['reports', 'list', params] as const,
  detail: (reportId: string) => ['reports', 'detail', reportId] as const,
  events: (reportId: string) => ['reports', 'events', reportId] as const,
  approvalSteps: (reportId: string) => ['reports', 'approval-steps', reportId] as const,
  approvalPreview: (reportId: string) => ['reports', 'approval-preview', reportId] as const,
};

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (params: ExpenseListParams = {}) => ['expenses', 'list', params] as const,
  detail: (expenseId: string) => ['expenses', 'detail', expenseId] as const,
  preview: (payload: unknown) => ['expenses', 'preview', payload] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => ['categories', 'list'] as const,
};

export const warningRuleKeys = {
  all: ['warningRules'] as const,
  list: () => ['warningRules', 'list'] as const,
};

export const approvalRuleKeys = {
  all: ['approvalRules'] as const,
  list: () => ['approvalRules', 'list'] as const,
};

export const orgAttributeKeys = {
  all: ['orgAttributes'] as const,
  list: (params: OrgAttributeListParams = {}) => ['orgAttributes', 'list', params] as const,
};

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams = {}) => ['users', 'list', params] as const,
};
