import { RegistroActividadService } from './registro-actividad.service';

/**
 * «Ver el soporte» abre el documento y no un 404 (EFDS-1183).
 *
 * El estado anunciaba el soporte en `/hiring/documentos/<id>/descargar`, una
 * ruta que ningún controlador del servicio expone. El cliente se queda con el
 * último segmento del enlace para pedírselo al controlador de archivos, así
 * que el botón abría una pestaña pidiendo un archivo llamado `descargar` y lo
 * único que el gestor veía era el JSON del error. El documento estaba en
 * disco desde el principio.
 */
describe('RegistroActividadService · con qué enlace se anuncia el soporte', () => {
  const PARAMETRO = {
    numeral: '3.2',
    etapa: 3,
    exigeSoporte: true,
    confirmado: true,
    notaFuente: null,
  };

  const REGISTRO = {
    id: 'reg-1',
    fecha: '2026-09-01',
    nota: 'Se consolidó el análisis del sector.',
    datos: null,
    registradoPor: 'gestor@esap.edu.co',
    registradoAt: new Date('2026-09-01T10:00:00Z'),
    documentoId: 'doc-1',
  };

  /** Consulta el estado con un soporte ya guardado y devuelve lo que se anuncia. */
  const soporteAnunciado = async (archivoUrl: string) => {
    const em = {
      findOne: async () => ({ id: 'exp-1' }),
      getRepository: (entidad: { name: string }) => ({
        findOne: async () => {
          if (entidad.name === 'Proceso') return { id: 'proc-1', modalidad: 'LICITACION_PUBLICA' };
          if (entidad.name === 'ActividadConSoporte') return PARAMETRO;
          if (entidad.name === 'ActividadExcluida') return null;
          if (entidad.name === 'RegistroActividad') return REGISTRO;
          if (entidad.name === 'Documento') {
            return { id: 'doc-1', nombre: 'Análisis del sector', archivoUrl };
          }
          return null;
        },
        find: async () => [],
      }),
    };

    const servicio = new RegistroActividadService(
      { manager: em } as never,
      {} as never,
      {} as never,
    );

    const estado = await servicio.estado('proc-1', '3.2');
    return estado.registro?.soporte;
  };

  it('lo nombra por el archivo, que es lo que el controlador sabe servir', async () => {
    expect(await soporteAnunciado('hiring/files/abc123.pdf')).toEqual({
      nombre: 'Análisis del sector',
      url: '/files/abc123.pdf',
    });
  });

  it('iguala el prefijo que dejó la biblioteca de formatos', async () => {
    expect((await soporteAnunciado('/files/abc123.pdf'))?.url).toBe('/files/abc123.pdf');
  });

  it('no deja un enlace cuyo último segmento no sea el archivo', async () => {
    const url = (await soporteAnunciado('hiring/files/abc123.pdf'))?.url ?? '';
    expect(url.split('/').pop()).toBe('abc123.pdf');
  });
});
