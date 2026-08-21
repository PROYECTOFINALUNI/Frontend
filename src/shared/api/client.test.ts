import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/shared/test/msw/server';
import { API, errorBody } from '@/shared/test/msw/handlers';

import { api, apiRequest, refreshAccessToken } from './client';
import { ApiError } from './errors';
import { tokenStore } from './tokenStore';

afterEach(() => {
  tokenStore.clear();
});

describe('apiRequest', () => {
  it('sends the access token as a bearer header', async () => {
    let seen: string | null = null;
    tokenStore.setTokens({ access: 'token-abc', refresh: 'refresh-abc' });

    server.use(
      http.get(`${API}/api/me/`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ id: 'user-1' });
      })
    );

    await api.get('/api/me/');

    expect(seen).toBe('Bearer token-abc');
  });

  it('raises an ApiError carrying the code, detail, and fields', async () => {
    server.use(
      http.post(`${API}/api/expenses/`, () =>
        HttpResponse.json(errorBody('invalid', 'Validation failed.', { merchant: ['Required.'] }), {
          status: 400,
        })
      )
    );

    const error = await api.post('/api/expenses/', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'invalid',
      detail: 'Validation failed.',
      fields: { merchant: ['Required.'] },
    });
  });

  it('refreshes once on a 401 and replays the original request', async () => {
    tokenStore.setTokens({ access: 'stale', refresh: 'refresh-1' });

    let attempts = 0;
    server.use(
      http.get(`${API}/api/me/`, ({ request }) => {
        attempts += 1;
        if (request.headers.get('Authorization') === 'Bearer stale') {
          return HttpResponse.json(errorBody('not_authenticated', 'Expired.'), { status: 401 });
        }
        return HttpResponse.json({ id: 'user-1' });
      }),
      http.post(`${API}/api/auth/refresh/`, () =>
        HttpResponse.json({ access: 'fresh', refresh: 'refresh-2' })
      )
    );

    await expect(api.get('/api/me/')).resolves.toEqual({ id: 'user-1' });
    expect(attempts).toBe(2);
    // The rotated refresh token must replace the old one, which is now blacklisted.
    expect(tokenStore.getRefreshToken()).toBe('refresh-2');
  });

  it('clears the session when the refresh token is itself rejected', async () => {
    tokenStore.setTokens({ access: 'stale', refresh: 'dead' });

    server.use(
      http.get(`${API}/api/me/`, () =>
        HttpResponse.json(errorBody('not_authenticated', 'Expired.'), { status: 401 })
      ),
      http.post(`${API}/api/auth/refresh/`, () =>
        HttpResponse.json(errorBody('token_not_valid', 'Invalid.'), { status: 401 })
      )
    );

    await expect(api.get('/api/me/')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it('shares one refresh across concurrent 401s so the rotating token is spent once', async () => {
    tokenStore.setTokens({ access: 'stale', refresh: 'refresh-1' });

    let refreshCalls = 0;
    server.use(
      http.get(`${API}/api/me/`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer stale'
          ? HttpResponse.json(errorBody('not_authenticated', 'Expired.'), { status: 401 })
          : HttpResponse.json({ id: 'user-1' })
      ),
      http.get(`${API}/api/categories/`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer stale'
          ? HttpResponse.json(errorBody('not_authenticated', 'Expired.'), { status: 401 })
          : HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
      ),
      http.post(`${API}/api/auth/refresh/`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ access: 'fresh', refresh: 'refresh-2' });
      })
    );

    await Promise.all([api.get('/api/me/'), api.get('/api/categories/')]);

    expect(refreshCalls).toBe(1);
  });

  it('does not attach a token or retry for anonymous requests', async () => {
    let seen: string | null = 'unset';

    server.use(
      http.post(`${API}/api/auth/login/`, ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json(errorBody('invalid_credentials', 'Wrong.'), { status: 401 });
      })
    );

    await expect(
      apiRequest('/api/auth/login/', { method: 'POST', body: {}, anonymous: true })
    ).rejects.toBeInstanceOf(ApiError);

    expect(seen).toBeNull();
  });

  it('serialises query parameters and drops empty ones', async () => {
    let url = '';
    server.use(
      http.get(`${API}/api/expenses/`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      })
    );

    await api.get('/api/expenses/', {
      status: 'DRAFT',
      merchant: '',
      page: 2,
      categoryId: undefined,
    });

    expect(url).toContain('status=DRAFT');
    expect(url).toContain('page=2');
    expect(url).not.toContain('merchant=');
    expect(url).not.toContain('categoryId');
  });
});

describe('refreshAccessToken', () => {
  it('returns null when there is no stored refresh token', async () => {
    await expect(refreshAccessToken()).resolves.toBeNull();
  });
});
