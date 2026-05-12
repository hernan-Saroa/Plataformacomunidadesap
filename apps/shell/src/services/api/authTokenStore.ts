const ACCESS_TOKEN_KEY = 'esap_auth_token';
const REFRESH_TOKEN_KEY = 'esap_refresh_token';

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

function readSessionValue(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(key);
}

export function getAccessToken(): string | null {
  return accessTokenMemory || readSessionValue(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return refreshTokenMemory || readSessionValue(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken?: string, refreshToken?: string): void {
  if (accessToken) {
    accessTokenMemory = accessToken;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    refreshTokenMemory = refreshToken;
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens(): void {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
