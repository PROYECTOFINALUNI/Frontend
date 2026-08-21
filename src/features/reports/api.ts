import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/client';
import { expenseKeys, reportKeys } from '@/shared/api/queryKeys';
import type {
  ApprovalChainPreview,
  ApprovalStep,
  Paginated,
  ReportDetail,
  ReportListItem,
  ReportListParams,
} from '@/shared/types/domain';

export function useReports(params: ReportListParams = {}) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<ReportListItem>>(
        '/api/reports/',
        {
          role: params.role,
          status: params.status,
          // El backend interpreta este indicador como un valor de texto verdadero.
          pendingMyApproval: params.pendingMyApproval ? 'true' : undefined,
          page: params.page,
          pageSize: params.pageSize,
        },
        signal
      ),
    placeholderData: (previous) => previous,
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(reportId ?? ''),
    queryFn: ({ signal }) => api.get<ReportDetail>(`/api/reports/${reportId}/`, undefined, signal),
    enabled: Boolean(reportId),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string }) => api.post<ReportListItem>('/api/reports/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useUpdateReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string }) =>
      api.patch<ReportDetail>(`/api/reports/${reportId}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => api.delete(`/api/reports/${reportId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export type WorkflowAction =
  'submit' | 'approve' | 'reject' | 'return-to-draft' | 'mark-paid' | 'comment';

/** Las transiciones actualizan directamente el informe almacenado y refrescan también los gastos relacionados. */
export function useReportWorkflow(reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, comment }: { action: WorkflowAction; comment?: string }) =>
      api.post<ReportDetail>(
        `/api/reports/${reportId}/${action}/`,
        comment === undefined ? {} : { comment }
      ),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(reportId), report);
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.approvalPreview(reportId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
    onError: () => {
      // Una transición rechazada suele indicar que el estado almacenado está desactualizado.
      void queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
    },
  });
}

export function useApprovalSteps(reportId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.approvalSteps(reportId ?? ''),
    queryFn: ({ signal }) =>
      api.get<ApprovalStep[]>(`/api/reports/${reportId}/approval-steps/`, undefined, signal),
    enabled: Boolean(reportId),
  });
}

/** Muestra la cadena de aprobación que se generaría al enviar el informe. Se recalcula en el backend para reflejar los cambios realizados. */
export function useApprovalPreview(reportId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reportKeys.approvalPreview(reportId ?? ''),
    queryFn: ({ signal }) =>
      api.get<ApprovalChainPreview>(
        `/api/reports/${reportId}/approval-preview/`,
        undefined,
        signal
      ),
    enabled: Boolean(reportId) && enabled,
  });
}

/** Delega el paso actual a otro aprobador y devuelve el informe actualizado. */
export function useDelegateApproval(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { approverId: string; comment?: string }) =>
      api.post<ReportDetail>(`/api/reports/${reportId}/delegate/`, body),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(reportId), report);
      void queryClient.invalidateQueries({ queryKey: reportKeys.approvalSteps(reportId) });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

function invalidateReport(queryClient: ReturnType<typeof useQueryClient>, reportId: string) {
  void queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
  void queryClient.invalidateQueries({ queryKey: reportKeys.approvalSteps(reportId) });
  void queryClient.invalidateQueries({ queryKey: reportKeys.approvalPreview(reportId) });
  void queryClient.invalidateQueries({ queryKey: reportKeys.all });
}

export function useCreateApprovalStep(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { approverId: string; stepOrder: number }) =>
      api.post<ApprovalStep>(`/api/reports/${reportId}/approval-steps/`, body),
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}

export function useUpdateApprovalStep(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      ...body
    }: {
      stepId: string;
      approverId?: string;
      stepOrder?: number;
    }) => api.patch<ApprovalStep>(`/api/reports/${reportId}/approval-steps/${stepId}/`, body),
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}

export function useDeleteApprovalStep(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: string) =>
      api.delete(`/api/reports/${reportId}/approval-steps/${stepId}/`),
    onSuccess: () => invalidateReport(queryClient, reportId),
  });
}
