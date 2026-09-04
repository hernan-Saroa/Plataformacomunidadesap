import { RegistroActividadService } from './registro-actividad.service';

/**
 * El soporte del formulario cumple el formato que la actividad pide (EFDS-1183).
 *
 * Antes se guardaba suelto: el requisito del formato seguía pendiente, el
 * bloque de documentos volvía a pedir el mismo papel —dos sitios para subir lo
 * mismo— y la actividad podía cerrarse con el formato en blanco.
 */
describe('RegistroActividadService · a qué formato queda atado el soporte', () => {
  /** Sin base ni aprobación: lo que se comprueba es a qué formato se ata. */
  const servicio = () => new RegistroActividadService({} as never, {} as never);

  const formato = (id: string, codigo: string, nombre: string, modalidades: string[] = []) => ({
    id,
    codigo,
    nombre,
    modalidades,
    activo: true,
  });

  /** Guarda un soporte y devuelve la fila que se escribió. */
  const guardar = async (
    formatos: unknown[],
    entregados: unknown[],
    modalidad: string | null = 'LICITACION_PUBLICA',
  ) => {
    let guardada: Record<string, unknown> | null = null;
    const em = {
      findOne: async () => ({ id: 'exp-1' }),
      getRepository: (entidad: { name: string }) => ({
        find: async () => (entidad.name === 'Plantilla' ? formatos : entregados),
      }),
      create: (_e: unknown, datos: Record<string, unknown>) => datos,
      save: async (datos: Record<string, unknown>) => {
        guardada = datos;
        return datos;
      },
    };

    await (
      servicio() as unknown as {
        guardarSoporte(...args: unknown[]): Promise<unknown>;
      }
    ).guardarSoporte(
      em,
      'proc-1',
      '3.2',
      { filename: 'abc.pdf', originalname: 'analisis.pdf', mimetype: 'application/pdf', size: 10 },
      'hash',
      { userName: 'gestor@esap.edu.co' },
      modalidad,
    );

    return guardada!;
  };

  it('lo ata al formato que la actividad pide', async () => {
    const doc = await guardar([formato('f1', 'BS-FO-101', 'Análisis del sector')], []);

    expect(doc.plantillaId).toBe('f1');
  });

  it('le pone el nombre del formato y no uno genérico', async () => {
    // En el expediente «Análisis del sector» dice qué es; «Soporte de la
    // actividad 3.2» obliga a abrirlo para saberlo.
    const doc = await guardar([formato('f1', 'BS-FO-101', 'Análisis del sector')], []);

    expect(doc.nombre).toBe('Análisis del sector');
  });

  it('sin formatos asignados sigue siendo un soporte suelto', async () => {
    const doc = await guardar([], []);

    expect(doc.plantillaId).toBeNull();
    expect(doc.nombre).toBe('Soporte de la actividad 3.2');
  });

  it('cumple el primero que siga pendiente, no el ya entregado', async () => {
    const doc = await guardar(
      [formato('f1', 'BS-FO-101', 'Análisis'), formato('f2', 'BS-FO-102', 'Radicación')],
      [{ plantillaId: 'f1' }],
    );

    expect(doc.plantillaId).toBe('f2');
  });

  it('con todos entregados no reabre ninguno', async () => {
    const doc = await guardar(
      [formato('f1', 'BS-FO-101', 'Análisis')],
      [{ plantillaId: 'f1' }],
    );

    expect(doc.plantillaId).toBeNull();
  });

  it('no ata el soporte a un formato de otra modalidad', async () => {
    const doc = await guardar([formato('f1', 'BS-FO-046', 'Directa', ['CONTRATACION_DIRECTA'])], []);

    expect(doc.plantillaId).toBeNull();
  });
});
