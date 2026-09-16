import {
  cleanBaseUrl,
  extractFrontendUrlFromHeaders,
  resolveFrontendBaseUrl,
  requestContextStorage,
} from './url-resolver.util';

describe('url-resolver.util', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('cleanBaseUrl', () => {
    it('should strip trailing slashes', () => {
      expect(cleanBaseUrl('http://example.com/')).toBe('http://example.com');
      expect(cleanBaseUrl('http://example.com///')).toBe('http://example.com');
    });

    it('should return null for invalid, undefined, null, or NOT_DEFINED strings', () => {
      expect(cleanBaseUrl(undefined)).toBeNull();
      expect(cleanBaseUrl(null)).toBeNull();
      expect(cleanBaseUrl('')).toBeNull();
      expect(cleanBaseUrl('   ')).toBeNull();
      expect(cleanBaseUrl('NOT_DEFINED')).toBeNull();
      expect(cleanBaseUrl('not_defined')).toBeNull();
      expect(cleanBaseUrl('null')).toBeNull();
      expect(cleanBaseUrl('undefined')).toBeNull();
    });
  });

  describe('extractFrontendUrlFromHeaders', () => {
    it('should prioritize x-frontend-base-url header', () => {
      const headers = {
        'x-frontend-base-url': 'http://4.156.71.181/',
        origin: 'http://localhost:3000',
      };
      expect(extractFrontendUrlFromHeaders(headers)).toBe('http://4.156.71.181');
    });

    it('should use origin when x-frontend-base-url is missing', () => {
      const headers = {
        origin: 'https://comunidadesap.esap.edu.co',
      };
      expect(extractFrontendUrlFromHeaders(headers)).toBe('https://comunidadesap.esap.edu.co');
    });

    it('should parse referer origin when origin is missing', () => {
      const headers = {
        referer: 'http://4.156.71.181/control-disciplinario/expediente/10',
      };
      expect(extractFrontendUrlFromHeaders(headers)).toBe('http://4.156.71.181');
    });

    it('should build URL from x-forwarded-host and x-forwarded-proto', () => {
      const headers = {
        'x-forwarded-host': 'comunidadesap.esap.edu.co',
        'x-forwarded-proto': 'https',
      };
      expect(extractFrontendUrlFromHeaders(headers)).toBe('https://comunidadesap.esap.edu.co');
    });
  });

  describe('resolveFrontendBaseUrl', () => {
    it('should return explicit override URL when valid', () => {
      expect(resolveFrontendBaseUrl('https://custom.esap.edu.co/')).toBe('https://custom.esap.edu.co');
    });

    it('should prioritize request context URL if not localhost', () => {
      delete process.env.PUBLIC_APP_URL;
      delete process.env.FRONTEND_URL;

      let resolved: string | undefined;
      requestContextStorage.run({ frontendBaseUrl: 'http://4.156.71.181' }, () => {
        resolved = resolveFrontendBaseUrl();
      });

      expect(resolved).toBe('http://4.156.71.181');
    });

    it('should pick up PUBLIC_APP_URL from env when context is empty', () => {
      process.env.PUBLIC_APP_URL = 'http://4.156.71.181';
      expect(resolveFrontendBaseUrl()).toBe('http://4.156.71.181');
    });

    it('should ignore NOT_DEFINED in PUBLIC_APP_URL and fall back to FRONTEND_URL', () => {
      process.env.PUBLIC_APP_URL = 'NOT_DEFINED';
      process.env.FRONTEND_URL = 'http://4.156.71.181';
      expect(resolveFrontendBaseUrl()).toBe('http://4.156.71.181');
    });

    it('should pick up SERVER_IP when other env vars are absent', () => {
      delete process.env.PUBLIC_APP_URL;
      delete process.env.FRONTEND_URL;
      delete process.env.PUBLIC_FRONTEND_URL;
      delete process.env.FRONTEND_BASE_URL;
      delete process.env.SERVER_URL_ENV;
      process.env.SERVER_IP = '4.156.71.181';

      expect(resolveFrontendBaseUrl()).toBe('http://4.156.71.181');
    });

    it('should fall back to https://comunidadesap.esap.edu.co in production when no env is set', () => {
      delete process.env.PUBLIC_APP_URL;
      delete process.env.FRONTEND_URL;
      delete process.env.PUBLIC_FRONTEND_URL;
      delete process.env.FRONTEND_BASE_URL;
      delete process.env.SERVER_URL_ENV;
      delete process.env.SERVER_IP;
      process.env.NODE_ENV = 'production';

      expect(resolveFrontendBaseUrl()).toBe('https://comunidadesap.esap.edu.co');
    });

    it('should fall back to http://localhost:3000 in development when no env is set', () => {
      delete process.env.PUBLIC_APP_URL;
      delete process.env.FRONTEND_URL;
      delete process.env.PUBLIC_FRONTEND_URL;
      delete process.env.FRONTEND_BASE_URL;
      delete process.env.SERVER_URL_ENV;
      delete process.env.SERVER_IP;
      process.env.NODE_ENV = 'development';

      expect(resolveFrontendBaseUrl()).toBe('http://localhost:3000');
    });
  });
});
