import { StrictMode } from 'react';
import { HttpResponse, http } from 'msw';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/shared/test/msw/server';
import { API, errorBody } from '@/shared/test/msw/handlers';
import { employee } from '@/shared/test/fixtures';
import { createTestQueryClient } from '@/shared/test/renderWithProviders';
import { tokenStore } from '@/shared/api/tokenStore';

import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

function SessionProbe() {
  const { isRestoring, user } = useAuth();
  return (
    <div>
      <span data-testid="restoring">{isRestoring ? 'restoring' : 'settled'}</span>
      <span data-testid="user">{user?.email ?? 'anonymous'}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <StrictMode>
      <QueryClientProvider client={createTestQueryClient()}>
        <AuthProvider>
          <SessionProbe />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

afterEach(() => {
  tokenStore.clear();
});

describe('AuthProvider session restore', () => {
  it('settles immediately when there is no stored refresh token', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('settled'));
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
  });

  it('restores the session from a stored refresh token under StrictMode', async () => {
    tokenStore.setTokens({ access: 'old', refresh: 'refresh-1' });

    renderProvider();

    // The regression: this used to hang on "restoring" forever.
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('settled'));
    expect(screen.getByTestId('user')).toHaveTextContent(employee.email);
  });

  it('stops restoring and signs the user out when the refresh token is rejected', async () => {
    tokenStore.setTokens({ access: 'old', refresh: 'dead' });

    server.use(
      http.post(`${API}/api/auth/refresh/`, () =>
        HttpResponse.json(errorBody('token_not_valid', 'Invalid.'), { status: 401 })
      )
    );

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('settled'));
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it('stops restoring even when /api/me/ fails after a successful refresh', async () => {
    tokenStore.setTokens({ access: 'old', refresh: 'refresh-1' });

    server.use(
      http.get(`${API}/api/me/`, () =>
        HttpResponse.json(errorBody('server_error', 'Boom.'), { status: 500 })
      )
    );

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('settled'));
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
  });

  it('exchanges the refresh token exactly once despite the double effect run', async () => {
    tokenStore.setTokens({ access: 'old', refresh: 'refresh-1' });

    let refreshCalls = 0;
    server.use(
      http.post(`${API}/api/auth/refresh/`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ access: 'fresh', refresh: 'refresh-2' });
      })
    );

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('settled'));
    expect(refreshCalls).toBe(1);
  });
});
