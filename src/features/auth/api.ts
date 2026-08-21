import { api, apiRequest } from '@/shared/api/client';
import { tokenStore } from '@/shared/api/tokenStore';
import type { LoginResponse, User } from '@/shared/types/domain';

export async function login(credentials: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: credentials,
    anonymous: true,
  });

  tokenStore.setTokens({ access: response.access, refresh: response.refresh });
  return response;
}

/** Invalida el refresh token en el servidor.
La sesión local se cierra aunque la petición falle.
 */
export async function logout(): Promise<void> {
  const refresh = tokenStore.getRefreshToken();

  try {
    if (refresh) {
      await apiRequest('/api/auth/logout/', {
        method: 'POST',
        body: { refresh },
        anonymous: true,
      });
    }
  } catch {
    // Se ignora a propósitov
  } finally {
    tokenStore.clear();
  }
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return api.get<User>('/api/me/', undefined, signal);
}
