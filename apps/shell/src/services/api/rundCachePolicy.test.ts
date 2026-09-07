import { describe, it, expect } from 'vitest';
import { excludesRundCache, isRundRequest } from './rundCachePolicy';

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
  it('conserva la caché de catálogos PTA, documentos generales y otros módulos', () => {
    expect(excludesRundCache('/pta/api/v1/pta/periodos', [{ id: '2026-1' }])).toBe(false);
    expect(excludesRundCache('/auth/api/v1/carpeta-digital/persona/documentos', [{ categoria: 'otros', nombre: 'archivo.pdf' }])).toBe(false);
    expect(excludesRundCache('/certificates/api/v1/solicitudes', { documento_identidad: '1020304050' })).toBe(false);
  });
});
