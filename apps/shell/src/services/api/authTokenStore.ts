const ACCESS_TOKEN_KEY = 'esap_auth_token';
const REFRESH_TOKEN_KEY = 'esap_refresh_token';

function removeStorageValue(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function getAccessToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setAuthTokens(_accessToken?: string, _refreshToken?: string): void {
  clearAuthTokens();
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;

  const legacyKeys = [
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    'esap_access_token',
    'esap-auth-token',
    'token',
  ];

  for (const key of legacyKeys) {
    removeStorageValue(window.sessionStorage, key);
    removeStorageValue(window.localStorage, key);
  }
}
