import { ApiError, NetworkError, type ApiErrorBody } from './errors';
import { tokenStore } from './tokenStore';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

/** Trailing slashes would produce `//api/...` once joined with a path. */
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

/** Every DRF route in this project ends with a slash; APPEND_SLASH would 301. */
function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  /** Skip the Authorization header and the refresh-retry, e.g. for login. */
  anonymous?: boolean;
  signal?: AbortSignal;
};

let sessionExpiredHandler: (() => void) | null = null;

/** Lets the auth provider react when the refresh token is no longer usable. */
export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '');
    return text ? { detail: text } : null;
  }

  return response.json().catch(() => null);
}

async function rawRequest(
  path: string,
  options: RequestOptions,
  accessToken: string | null
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken && !options.anonymous) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new NetworkError(cause);
  }
}

/**
 * A single in-flight refresh shared by every concurrent 401, so a burst of
 * parallel queries cannot each consume (and blacklist) a rotating token.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefreshToken();
  if (!refresh) return null;

  const response = await rawRequest(
    '/api/auth/refresh/',
    { method: 'POST', body: { refresh }, anonymous: true },
    null
  );

  if (!response.ok) {
    tokenStore.clear();
    return null;
  }

  const body = (await parseBody(response)) as { access?: string; refresh?: string } | null;
  if (!body?.access) {
    tokenStore.clear();
    return null;
  }

  tokenStore.setTokens({ access: body.access, refresh: body.refresh ?? refresh });
  return body.access;
}

export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  let response = await rawRequest(path, options, tokenStore.getAccessToken());

  // One retry only: if the refreshed token is still rejected, the session is over.
  if (response.status === 401 && !options.anonymous) {
    const access = await refreshAccessToken();
    if (access) {
      response = await rawRequest(path, options, access);
    }
    if (response.status === 401) {
      tokenStore.clear();
      sessionExpiredHandler?.();
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, body as Partial<ApiErrorBody> | null);
  }

  return body as TResponse;
}

export const api = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),

  post: <T>(path: string, body?: unknown, query?: QueryParams) =>
    apiRequest<T>(path, { method: 'POST', body: body ?? {}, query }),

  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),

  delete: <T = null>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
