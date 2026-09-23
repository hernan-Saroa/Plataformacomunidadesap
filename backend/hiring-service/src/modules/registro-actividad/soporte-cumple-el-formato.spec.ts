import { RegistroActividadService } from './registro-actividad.service';

/**
 * El soporte del formulario cubre el documento que la actividad pide
 * (EFDS-1183, EFDS-2066).
 *
 * Antes se guardaba suelto: el requisito seguía pendiente, el bloque de
 * documentos volvía a pedir el mismo papel —dos sitios para subir lo mismo— y
 * la actividad podía cerrarse con el documento en blanco.
 */
describe('RegistroActividadService · a qué requisito queda atado el soporte', () => {
  const archivo = {
    filename: 'abc.pdf',
    originalname: 'analisis.pdf',
    mimetype: 'application/pdf',
    size: 10,
  };

  /** Guarda un soporte y dice qué se hizo con él. */
  const guardar = async (faltantes: { codigo: string; nombre: string }[]) => {
    let cargadoComo: string | undefined | null = null;
    let suelto: Record<string, unknown> | null = null;

    const catalogo = {
      faltantes: async () => faltantes,
      cargar: async (_p: string, _n: string, codigo: string | undefined) => {
        cargadoComo = codigo;
        return { id: 'doc-1' };
      },
    };
    const em = {
      findOne: async () => ({ id: 'exp-1' }),
      create: (_e: unknown, datos: Record<string, unknown>) => datos,
      save: async (datos: Record<string, unknown>) => {
        suelto = datos;
        return datos;
      },
    };

    const servicio = new RegistroActividadService(
      {} as never,
      {} as never,
      {} as never,
      catalogo as never,
    ) as unknown as { guardarSoporte(...args: unknown[]): Promise<unknown> };

    await servicio.guardarSoporte(em, 'proc-1', '3.2', archivo, 'hash', {
      userName: 'gestor@esap.edu.co',
    });

    return { cargadoComo: cargadoComo as string | undefined | null, suelto: suelto as any };
  };

  it('cubre el primer obligatorio pendiente de la actividad', async () => {
    const r = await guardar([
      { codigo: 'BS-FO-101', nombre: 'Análisis del sector' },
      { codigo: 'BS-FO-102', nombre: 'Radicación' },
    ]);

    expect(r.cargadoComo).toBe('BS-FO-101');
    expect(r.suelto).toBeNull();
  });

  it('sin nada pendiente sigue siendo un soporte suelto con su nombre', async () => {
    // Con todo entregado no reabre ningún requisito, y donde la actividad no
    // pide documentos el soporte es el de la tabla de la 051.
    const r = await guardar([]);

    expect(r.cargadoComo).toBeNull();
    expect(r.suelto.nombre).toBe('Soporte de la actividad 3.2');
    expect(r.suelto.plantillaId).toBeUndefined();
  });
});

/**
 * Si el formulario vuelve a pedir el soporte (EFDS-1183).
 *
 * Al corregir una actividad devuelta el documento ya está cargado. Exigirlo
 * otra vez por el solo hecho de que exista el requisito dejaba el botón de
 * registrar muerto: la actividad no se podía reenviar a aprobación y quedaba
 * atascada en DEVUELTO.
 */
describe('RegistroActividadService · cuándo se sigue exigiendo el soporte', () => {
  const pendiente = (faltantes: unknown[]) =>
    (
      new RegistroActividadService(
        {} as never,
        {} as never,
        {} as never,
        { faltantes: async () => faltantes } as never,
      ) as unknown as {
        documentoPendiente(em: unknown, procesoId: string, numeral: string): Promise<boolean>;
      }
    ).documentoPendiente({}, 'proc-1', '3.3');

  it('lo exige mientras quede un obligatorio sin entregar', async () => {
    await expect(pendiente([{ codigo: 'BS-FO-102' }])).resolves.toBe(true);
  });

  it('deja de exigirlo cuando los obligatorios ya están cargados', async () => {
    // El caso de la corrección: el bloque de abajo dice «Completos» y el
    // formulario tiene que dejar registrar.
    await expect(pendiente([])).resolves.toBe(false);
  });
});
