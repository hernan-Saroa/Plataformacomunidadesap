import { apuntaAlArchivo, RUND_UPLOADS_BASE, urlSoporteCarpetaDigital } from './rund-public-paths';

describe('URLs públicas de archivos RUND', () => {
  it('los soportes nuevos apuntan a rund-service, no a PTA', () => {
    const url = urlSoporteCarpetaDigital('ANA PEREZ', 'abc.pdf');
    expect(url).toBe('/rund/api/v1/uploads/carpeta-digital/ANA PEREZ/RUND/abc.pdf');
    expect(url.startsWith(RUND_UPLOADS_BASE)).toBe(true);
    expect(url).not.toContain('/pta/');
  });

  it('un archivo ya vinculado se reconoce con el prefijo nuevo y con el histórico de PTA', () => {
    expect(apuntaAlArchivo('/rund/api/v1/uploads/carpeta-digital/X/RUND/a.pdf', 'X', 'a.pdf')).toBe(true);
    expect(apuntaAlArchivo('/pta/api/v1/uploads/carpeta-digital/X/RUND/a.pdf', 'X', 'a.pdf')).toBe(true);
  });

  it('no confunde archivos, docentes ni valores vacíos', () => {
    expect(apuntaAlArchivo('/rund/api/v1/uploads/carpeta-digital/X/RUND/a.pdf', 'X', 'b.pdf')).toBe(false);
    expect(apuntaAlArchivo('/rund/api/v1/uploads/carpeta-digital/Y/RUND/a.pdf', 'X', 'a.pdf')).toBe(false);
    expect(apuntaAlArchivo('/otra/ruta/a.pdf', 'X', 'a.pdf')).toBe(false);
    expect(apuntaAlArchivo(null, 'X', 'a.pdf')).toBe(false);
    expect(apuntaAlArchivo('', 'X', 'a.pdf')).toBe(false);
  });
});
