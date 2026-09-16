import { describe, expect, it } from 'vitest';

import { contratacionService } from './contratacionService';

/**
 * La dirección con la que se abre o se descarga un adjunto (EFDS-1183).
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
    expect(nombre('hiring/files/b24bb264.pdf')).toBe('/files/b24bb264.pdf?descargar=1');
  });

  it('resuelve lo que escribe la biblioteca de formatos', () => {
    expect(nombre('/files/bsfo101.docx')).toBe('/files/bsfo101.docx?descargar=1');
  });

  it('resuelve la forma antigua que quedó en expedientes viejos', () => {
    expect(nombre('/archivos/45f896ef.pdf')).toBe('/files/45f896ef.pdf?descargar=1');
  });

  it('apunta al gateway y no al servicio', () => {
    // El navegador no alcanza al contenedor: si pierde el prefijo, no descarga.
    expect(contratacionService.urlDescarga('hiring/files/x.pdf')).toContain('/hiring/api/v1/files/');
  });

  /**
   * Descargar y ver dejaron de ser lo mismo: el controlador sirve `inline`
   * salvo que se le pida lo contrario, así que la descarga tiene que pedirlo.
   */
  it('pide la descarga explícitamente', () => {
    // Sin `descargar=1` el navegador enseñaría el PDF en vez de guardarlo, y
    // un enlace sin `target` sacaría al usuario del módulo para hacerlo.
    expect(contratacionService.urlDescarga('hiring/files/x.pdf')).toMatch(/\?descargar=1$/);
  });

  it('la de ver no lo pide, que es lo que la distingue', () => {
    expect(contratacionService.urlVista('hiring/files/x.pdf')).not.toContain('descargar');
    expect(contratacionService.urlVista('hiring/files/x.pdf')).toContain('/files/x.pdf');
  });
});
