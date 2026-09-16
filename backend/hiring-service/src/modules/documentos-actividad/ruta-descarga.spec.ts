import { DocumentosActividadService } from './documentos-actividad.service';

/**
 * La ruta con la que se descarga un documento de la actividad (EFDS-1183).
 *
 * La columna `archivo_url` no guarda una sola forma: los paneles del módulo
 * escriben `hiring/files/<archivo>` y la biblioteca de formatos `/files/`. El
 * cliente le antepone el prefijo del servicio a lo que reciba, así que
 * devolver la columna cruda produce `/hiring/api/v1hiring/files/...` y un 404
 * para el gestor, que no puede distinguirlo de un formato inexistente.
 */
describe('DocumentosActividadService · rutaDescarga', () => {
  const servicio = new DocumentosActividadService({} as never, {} as never);
  /** Es privada a propósito: nadie fuera del servicio arma estas rutas. */
  const ruta = (url: string | null) =>
    (servicio as unknown as { rutaDescarga(u: string | null): string | null }).rutaDescarga(url);

  it('normaliza lo que escriben los paneles del módulo', () => {
    expect(ruta('hiring/files/b24bb264.pdf')).toBe('/files/b24bb264.pdf');
  });

  it('deja igual lo que escribe la biblioteca de formatos', () => {
    expect(ruta('/files/bsfo101.docx')).toBe('/files/bsfo101.docx');
  });

  it('sin archivo no inventa una ruta', () => {
    // Un formato declarado sin subir todavía: la fila existe, el enlace no.
    expect(ruta(null)).toBeNull();
  });

  it('se queda con el nombre y no con la ruta que venga', () => {
    // El controlador resuelve contra STORAGE_PATH; dejar pasar el resto del
    // camino sería ofrecerle al navegador una ruta que no controlamos.
    expect(ruta('../../etc/passwd')).toBe('/files/passwd');
  });
});
