import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/client';
import { expenseKeys, reportKeys } from '@/shared/api/queryKeys';
import type {
  Expense,
  ExpenseListParams,
  ExpensePatch,
  ExpensePreview,
  ExpenseWrite,
  Paginated,
} from '@/shared/types/domain';

export function useExpenses(params: ExpenseListParams = {}) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<Expense>>(
        '/api/expenses/',
        {
          reportId: params.reportId,
          status: params.status,
          categoryId: params.categoryId,
          currency: params.currency,
          expenseDateFrom: params.expenseDateFrom,
          expenseDateTo: params.expenseDateTo,
          merchant: params.merchant,
          ordering: params.ordering,
          page: params.page,
          pageSize: params.pageSize,
        },
        signal
      ),
    placeholderData: (previous) => previous,
  });
}

export function useExpense(expenseId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.detail(expenseId ?? ''),
    queryFn: ({ signal }) => api.get<Expense>(`/api/expenses/${expenseId}/`, undefined, signal),
    enabled: Boolean(expenseId),
  });
}

/**
 * Invalidate both collections: creating or editing an expense changes the
 * parent report's totals, expense count, and warning summary.
 */
function invalidateExpenseAndReport(
  queryClient: ReturnType<typeof useQueryClient>,
  reportId: string
) {
  void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  void queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseWrite) => api.post<Expense>('/api/expenses/', body),
    onSuccess: (expense) => invalidateExpenseAndReport(queryClient, expense.reportId),
  });
}

export function useUpdateExpense(expenseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpensePatch) => api.patch<Expense>(`/api/expenses/${expenseId}/`, body),
    onSuccess: (expense) => {
      queryClient.setQueryData(expenseKeys.detail(expenseId), expense);
      invalidateExpenseAndReport(queryClient, expense.reportId);
    },
  });
}

export function useDeleteExpense(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => api.delete(`/api/expenses/${expenseId}/`),
    onSuccess: () => invalidateExpenseAndReport(queryClient, reportId),
  });
}

/** Obtiene la previsualización oficial del backend. Si falla, se mantiene visible la previsualización local. */
export function useExpensePreview(body: ExpenseWrite | null, options: { enabled: boolean }) {
  return useQuery({
    queryKey: expenseKeys.preview(body),
    queryFn: () => api.post<ExpensePreview>('/api/expenses/calculate-preview/', body),
    enabled: options.enabled && body !== null,
    gcTime: 0,
    retry: false,
  });
}
