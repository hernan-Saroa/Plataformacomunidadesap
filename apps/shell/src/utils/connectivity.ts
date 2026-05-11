const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
let browserReportedOffline = false;

function getHostname(): string {
  if (typeof window === 'undefined') return '';

  return window.location.hostname;
}

function isHttpAppOrigin(): boolean {
  if (typeof window === 'undefined') return false;

  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    browserReportedOffline = false;
  });

  window.addEventListener('offline', () => {
    browserReportedOffline = true;
  });
}

export function isLocalAppHost(hostname = getHostname()): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

export function getAppOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') return true;

  if (isLocalAppHost()) return true;

  if (isHttpAppOrigin() && !browserReportedOffline) return true;

  return navigator.onLine;
}
