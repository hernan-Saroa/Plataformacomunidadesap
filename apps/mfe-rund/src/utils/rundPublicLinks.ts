import { getPublicBaseUrl } from '../config/environment';

export const RUND_PUBLIC_AUTOGESTION_PATH = '/rund/autogestion/docentes';

export function rundAutogestionLink(token?: string, base = getPublicBaseUrl()): string {
  return base.replace(/\/$/, '') + RUND_PUBLIC_AUTOGESTION_PATH + (token ? '?token=' + encodeURIComponent(token) : '');
}
