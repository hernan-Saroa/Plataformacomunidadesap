import { describe, it, expect, vi } from 'vitest';
import { excludesRundCache, isRundRequest } from './rundCachePolicy';
const transport = vi.hoisted(() => ({ mode: 'gateway' }));
vi.mock('../../config/environment', () => ({ get API_MODE() { return transport.mode; }, MICROSERVICE_URLS: { rund: 'http://rund-direct.test:3016' } }));

describe('Caché de respuestas RUND', () => {
  it.each(['/pta/api/v1/banco-docentes?page=1', '/pta/api/v1/pta/banco-docentes/drafts/token', '/pta/api/v1/macro-docente', '/pta/api/v1/pta/docentes-disponibles'])('requiere servidor para %s', (url) => {
    expect(isRundRequest(url)).toBe(true);
    expect(excludesRundCache(url)).toBe(true);
  });
  it('descarta datos completos históricos y respuestas protegidas incluidas en PTA', () => {
    expect(excludesRundCache('/pta/api/v1/pta/plan', { docente: { num_identificacion: '1020304050' } })).toBe(true);
    expect(excludesRundCache('/pta/api/v1/pta/plan', { docente: { proteccion_datos: { acceso_completo: false } } })).toBe(true);
    expect(excludesRundCache('/auth/api/v1/portal/carpeta-digital/persona/documentos', [{ rund_soporte_id: 'support' }])).toBe(true);
    expect(excludesRundCache('/auth/api/v1/portal/carpeta-digital/persona/documentos', [{ categoria: 'RUND', url_archivo: '/original.pdf' }])).toBe(true);
  });
  it('conserva catálogos y otros módulos; los documentos siempre requieren sesión vigente', () => {
    expect(excludesRundCache('/pta/api/v1/pta/periodos', [{ id: '2026-1' }])).toBe(false);
    expect(excludesRundCache('/auth/api/v1/carpeta-digital/persona/documentos', [{ categoria: 'otros', nombre: 'archivo.pdf' }])).toBe(true);
    expect(excludesRundCache('/certificates/api/v1/solicitudes', { documento_identidad: '1020304050' })).toBe(false);
  });
  it.each(['/rund/api/v1/docentes', '/services/rund/api/v1/tarjeta-digital/verificar/codigo', '/rund/api/v1/rund/docente/id',
    '/rund/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf', '/rund-service/api/v1/validacion-documental',
    '/pta/api/v1/rund/docente/id'])('excluye consultas del namespace RUND: %s', url => {
    expect(isRundRequest(url)).toBe(true);
    expect(excludesRundCache(url)).toBe(true);
  });
  it('no confunde un catálogo con un enlace RUND en sus parámetros de consulta', () => {
    expect(isRundRequest('/pta/api/v1/catalogos?volver=/rund/api/v1/docentes')).toBe(false);
  });
  it('en modo directo protege también las consultas del servicio en su origen configurado', () => {
    transport.mode = 'direct';
    try {
      expect(excludesRundCache('http://rund-direct.test:3016/docentes')).toBe(true);
      expect(excludesRundCache('http://rund-direct.test:3016/tarjeta-digital/verificar/codigo')).toBe(true);
      expect(excludesRundCache('http://auth-direct.test:3001/users')).toBe(false);
    } finally { transport.mode = 'gateway'; }
  });
});
