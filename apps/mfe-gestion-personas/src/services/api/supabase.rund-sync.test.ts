import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCarpetaDocumentCases } from '../../../../../packages/shared-hooks/src/carpetaDigitalDocumentCases';
vi.mock('../../../config/environment', () => ({
  config: { API_BASE_URL: 'https://gateway.test/services', API_TIMEOUT: 30000, API_RETRY_ATTEMPTS: 3, API_RETRY_DELAY: 0 },
  API_MODE: 'gateway', MICROSERVICE_URLS: {}, getDefaultHeaders: () => ({ 'Content-Type': 'application/json' }),
  CORS_CONFIG: { credentials: 'include', mode: 'cors' }, API_ENDPOINTS: { AUTH: { REFRESH: '/auth/api/v1/refresh' } },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
import { documentosService } from './supabase.service';
runCarpetaDocumentCases({ afterEach, beforeEach, describe, expect, it, vi, service: documentosService });