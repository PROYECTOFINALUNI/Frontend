import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';

import { AuthProvider } from '@/features/auth/AuthProvider';

/** Retries and caching make assertions non-deterministic, so both are off. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export type RenderWithProvidersOptions = RenderOptions & {
  route?: string;
  /** Register the element under a path so `useParams` resolves. */
  path?: string;
  queryClient?: QueryClient;
  withAuth?: boolean;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    path,
    queryClient = createTestQueryClient(),
    withAuth = true,
    ...options
  }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const routed = path ? (
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    ) : (
      children
    );

    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          {withAuth ? <AuthProvider>{routed}</AuthProvider> : routed}
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
