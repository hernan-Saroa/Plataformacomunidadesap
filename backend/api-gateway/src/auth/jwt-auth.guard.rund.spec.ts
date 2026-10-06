import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard: rutas públicas del RUND', () => {
  const guard = new JwtAuthGuard(new Reflector());
  const isPublic = (originalUrl: string) => (guard as any).matchesPublicPath({ originalUrl });

  it.each([
    '/rund/api/v1/pta/banco-docentes/otp/request',
    '/rund/api/v1/banco-docentes/otp/validate',
    '/rund/api/v1/banco-docentes/drafts/abc123',
    '/rund/api/v1/banco-docentes/autogestion/me/abc123',
    '/rund/api/v1/banco-docentes/submit/abc123',
    '/rund/api/v1/pta/banco-docentes/12/bloques/formacion/soportes/autogestion',
    '/rund/api/v1/pta/macro-docente/externo/tok-1',
    '/rund/uploads/rund-documentos/x.pdf',
  ])('permite %s sin JWT', (url) => {
    expect(isPublic(url)).toBe(true);
  });

  it.each([
    '/rund/api/v1/pta/banco-docentes',
    '/rund/api/v1/pta/banco-docentes/12',
    '/rund/api/v1/pta/banco-docentes/12/documentos',
    '/rund/api/v1/pta/banco-docentes/12/bloques/formacion/soportes',
    '/rund/api/v1/pta/banco-docentes/12/bloques/formacion/aprobar',
    '/rund/api/v1/pta/macro-docente',
    '/rund/api/v1/pta/macro-docente/accesos-externos',
    '/rund/api/v1/banco-docentes/drafts',
  ])('exige JWT en %s', (url) => {
    expect(isPublic(url)).toBe(false);
  });
});
