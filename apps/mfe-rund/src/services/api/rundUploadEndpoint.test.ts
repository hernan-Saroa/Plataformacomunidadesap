import { describe, expect, it } from 'vitest';
import { rundUploadEndpoint } from './rundUploadEndpoint';

describe('Descargas históricas del cliente RUND', () => {
  it.each([
    ['/pta/api/v1/uploads/carpeta-digital/DOCENTE PRUEBA/RUND/original.pdf', '/rund/api/v1/uploads/carpeta-digital/DOCENTE PRUEBA/RUND/original.pdf'],
    ['/pta/api/v1/uploads/carpeta-digital/DOCENTE%20PRUEBA/RUND/original.pdf?download=1', '/rund/api/v1/uploads/carpeta-digital/DOCENTE%20PRUEBA/RUND/original.pdf?download=1'],
    ['/pta/api/v1/uploads/rund-documentos/perfil/IDENTIDAD/v1.pdf', '/rund/api/v1/uploads/rund-documentos/perfil/IDENTIDAD/v1.pdf'],
    ['/services/pta/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf', '/rund/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf'],
    ['/services/rund/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf', '/rund/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf'],
    ['/pta/api/v1/pta/banco-docentes/docente/documentos/version/contenido', '/rund/api/v1/pta/banco-docentes/docente/documentos/version/contenido'],
    ['/pta/api/v1/banco-docentes/docente/documentos/version/contenido?download=1', '/rund/api/v1/banco-docentes/docente/documentos/version/contenido?download=1'],
  ])('descarga %s desde RUND', (stored, expected) => {
    expect(rundUploadEndpoint(stored)).toBe(expected);
  });

  it.each(['/auth/api/v1/uploads/carpeta-digital/persona/original.pdf', '/pta/api/v1/periodos-academicos',
    '/pta/api/v1/uploads/solicitudes-pta/adjunto.pdf', '/pta/api/v1/uploads/carpeta-digital/DOCENTE/OTRO/original.pdf',
    'id-documento-auth', 'https://otra.example/pta/api/v1/uploads/carpeta-digital/DOCENTE/RUND/original.pdf'])('conserva referencias externas y endpoints ajenos: %s', endpoint => {
    expect(rundUploadEndpoint(endpoint)).toBe(endpoint);
  });
});
