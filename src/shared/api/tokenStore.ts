/**
 * Token storage.
 *
 * The access token stays in memory so it is never readable from disk by other
 * scripts, and is short-lived anyway (15 minutes by default). The refresh token
 * is persisted so a page reload can restore the session; this is the usual
 * trade-off for a SPA without a cookie-based backend, and it is acceptable here
 * because the API is deliberately cookieless.
 */

const REFRESH_STORAGE_KEY = 'expense-app.refresh-token';

type Listener = () => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Access throws in some privacy modes and in non-browser test contexts.
    return null;
  }
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    try {
      return safeLocalStorage()?.getItem(REFRESH_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Persist a token pair. The backend rotates refresh tokens on every exchange
   * and blacklists the previous one, so the new value must always replace the
   * stored one or the next refresh will fail.
   */
  setTokens(tokens: { access: string; refresh?: string | null }): void {
    accessToken = tokens.access;
    if (tokens.refresh) {
      try {
        safeLocalStorage()?.setItem(REFRESH_STORAGE_KEY, tokens.refresh);
      } catch {
        // A full or unavailable storage only costs session persistence.
      }
    }
    notify();
  },

  clear(): void {
    accessToken = null;
    try {
      safeLocalStorage()?.removeItem(REFRESH_STORAGE_KEY);
    } catch {
      // Nothing to do; the in-memory token is already gone.
    }
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
