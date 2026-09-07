import { describe, expect, it } from 'vitest';

import { contratacionService } from './contratacionService';

/**
 * La dirección con la que se descarga un adjunto (EFDS-1183).
 *
 * La columna `archivo_url` no guarda una sola forma: la biblioteca de formatos
 * escribe `/files/<archivo>` y los paneles del módulo `hiring/files/<archivo>`.
 * Solo unos pocos servicios la rearman antes de responder, así que a las
 * cuarenta descargas del módulo les llegan las dos indistintamente.
 */
describe('contratacionService · urlDescarga', () => {
  const nombre = (url: string) => contratacionService.urlDescarga(url).split('/api/v1')[1];

  it('resuelve lo que escriben los paneles del módulo', () => {
    // Sin barra inicial: concatenarla daba `/hiring/api/v1hiring/files/…`.
    expect(nombre('hiring/files/b24bb264.pdf')).toBe('/files/b24bb264.pdf');
  });

  it('resuelve lo que escribe la biblioteca de formatos', () => {
    expect(nombre('/files/bsfo101.docx')).toBe('/files/bsfo101.docx');
  });

  it('resuelve la forma antigua que quedó en expedientes viejos', () => {
    expect(nombre('/archivos/45f896ef.pdf')).toBe('/files/45f896ef.pdf');
  });

  it('apunta al gateway y no al servicio', () => {
    // El navegador no alcanza al contenedor: si pierde el prefijo, no descarga.
    expect(contratacionService.urlDescarga('hiring/files/x.pdf')).toContain('/hiring/api/v1/files/');
  });
});
