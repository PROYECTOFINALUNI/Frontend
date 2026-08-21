import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/shared/api/client';
import {
  approvalRuleKeys,
  categoryKeys,
  orgAttributeKeys,
  userKeys,
  warningRuleKeys,
} from '@/shared/api/queryKeys';
import type {
  ApprovalRule,
  ApprovalRuleWrite,
  Category,
  CategoryWrite,
  OrgAttribute,
  OrgAttributeListParams,
  OrgAttributeWrite,
  Paginated,
  User,
  UserListParams,
  UserOrgAttributeWrite,
  WarningRule,
  WarningRuleWrite,
} from '@/shared/types/domain';

/** Datos de referencia compartidos entre distintas funcionalidades. Se obtienen con el tamaño máximo de página para simplificar su uso en los formularios.
 */
const MAX_PAGE_SIZE = 100;

export function useCategories(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: ({ signal }) =>
      api.get<Paginated<Category>>('/api/categories/', { pageSize: MAX_PAGE_SIZE }, signal),
    select: (page) => page.results,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryWrite) => api.post<Category>('/api/categories/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CategoryWrite> & { id: string }) =>
      api.patch<Category>(`/api/categories/${id}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useWarningRules(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: warningRuleKeys.list(),
    queryFn: ({ signal }) =>
      api.get<Paginated<WarningRule>>('/api/warning-rules/', { pageSize: MAX_PAGE_SIZE }, signal),
    select: (page) => page.results,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useCreateWarningRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WarningRuleWrite) => api.post<WarningRule>('/api/warning-rules/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warningRuleKeys.all }),
  });
}

export function useUpdateWarningRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<WarningRuleWrite> & { id: string }) =>
      api.patch<WarningRule>(`/api/warning-rules/${id}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warningRuleKeys.all }),
  });
}

export function useDeleteWarningRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/warning-rules/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: warningRuleKeys.all }),
  });
}

export function useApprovalRules(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: approvalRuleKeys.list(),
    queryFn: ({ signal }) =>
      api.get<Paginated<ApprovalRule>>('/api/approval-rules/', { pageSize: MAX_PAGE_SIZE }, signal),
    select: (page) => page.results,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useCreateApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApprovalRuleWrite) => api.post<ApprovalRule>('/api/approval-rules/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalRuleKeys.all }),
  });
}

export function useUpdateApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ApprovalRuleWrite> & { id: string }) =>
      api.patch<ApprovalRule>(`/api/approval-rules/${id}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalRuleKeys.all }),
  });
}

export function useDeleteApprovalRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/approval-rules/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: approvalRuleKeys.all }),
  });
}

export function useOrgAttributes(
  params: OrgAttributeListParams = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: orgAttributeKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<OrgAttribute>>(
        '/api/org-attributes/',
        { dimension: params.dimension, active: params.active, pageSize: MAX_PAGE_SIZE },
        signal
      ),
    select: (page) => page.results,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useCreateOrgAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OrgAttributeWrite) => api.post<OrgAttribute>('/api/org-attributes/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgAttributeKeys.all }),
  });
}

export function useUpdateOrgAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Omit<OrgAttributeWrite, 'dimension'>> & { id: string }) =>
      api.patch<OrgAttribute>(`/api/org-attributes/${id}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgAttributeKeys.all }),
  });
}

export function useDeleteOrgAttribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/org-attributes/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgAttributeKeys.all }),
  });
}

/** Solo disponible para administradores. */
export function useUsers(params: UserListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) =>
      api.get<Paginated<User>>(
        '/api/users/',
        {
          role: params.role,
          active: params.active,
          search: params.search,
          location: params.location,
          department: params.department,
          position: params.position,
          page: params.page,
          pageSize: params.pageSize ?? MAX_PAGE_SIZE,
        },
        signal
      ),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}

export type UserCreateBody = UserOrgAttributeWrite & {
  email: string;
  fullName: string;
  role: User['role'];
  active: boolean;
  password: string;
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreateBody) => api.post<User>('/api/users/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Omit<UserCreateBody, 'password'>> & { id: string }) =>
      api.patch<User>(`/api/users/${id}/`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/api/users/${id}/set-password/`, { password }),
  });
}
