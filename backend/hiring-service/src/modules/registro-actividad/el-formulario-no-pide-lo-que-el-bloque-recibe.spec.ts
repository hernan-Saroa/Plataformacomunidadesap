import { RegistroActividadService } from './registro-actividad.service';

/**
 * El formulario deja de pedir el soporte donde lo recibe el bloque de
 * documentos.
 *
 * El área reportó doble carga en las catorce actividades que se cumplen por
 * registro: el formulario ofrecía «Soporte de la actividad» y el bloque de
 * documentos volvía a pedir el mismo papel. Desde que el soporte cubre el
 * requisito pendiente los dos escriben el mismo adjunto, así que la pantalla
 * necesita saber cuál de los dos manda —eso es `tieneFormatos`—.
 */
describe('RegistroActividadService · quién recibe el soporte de la actividad', () => {
  /**
   * El estado de una actividad de registro, con lo que el catálogo le pida y
   * lo que siga pendiente.
   */
  const consultar = async (requeridos: unknown[], faltantes: unknown[]) => {
    const porEntidad = (nombre: string) => {
      if (nombre === 'Proceso') return { modalidad: 'LICITACION_PUBLICA' };
      if (nombre === 'ActividadConSoporte') {
        return { etapa: 3, exigeSoporte: true, confirmado: false, notaFuente: null };
      }
      return null;
    };

    const em = {
      findOne: async () => ({ id: 'exp-1' }),
      getRepository: (entidad: { name: string }) => ({
        findOne: async () => porEntidad(entidad.name),
        find: async () => [],
      }),
    };

    const catalogo = {
      requeridosDe: async () => requeridos,
      faltantes: async () => faltantes,
    };

    return (
      new RegistroActividadService(
        { manager: em } as never,
        {} as never,
        {} as never,
        catalogo as never,
      ) as unknown as {
        estado(procesoId: string, numeral: string): Promise<Record<string, unknown>>;
      }
    ).estado('proc-1', '3.2');
  };

  const requisito = { codigo: 'BS-FO-101', nombre: 'Análisis del sector', obligatorio: true };

  it('sin documentos requeridos el soporte lo sigue pidiendo el formulario', async () => {
    const estado = await consultar([], []);

    expect(estado.tieneFormatos).toBe(false);
    // Y con la exigencia de la tabla intacta: es la única que queda.
    expect(estado.exigeSoporte).toBe(true);
  });

  it('con un documento requerido lo recibe el bloque de documentos', async () => {
    const estado = await consultar([requisito], [requisito]);

    expect(estado.tieneFormatos).toBe(true);
    expect(estado.exigeSoporte).toBe(true);
  });

  it('entregado el documento ya no queda nada pendiente', async () => {
    const estado = await consultar([requisito], []);

    // `tieneFormatos` no cambia —el bloque sigue siendo el dueño— pero la
    // exigencia se apaga: es lo que desbloquea el botón de registrar sin que
    // el gestor tenga que volver a subir el mismo documento en el formulario.
    expect(estado.tieneFormatos).toBe(true);
    expect(estado.exigeSoporte).toBe(false);
  });

  /*
   * Un documento requerido es decisión del área —alguien lo configuró en esta
   * actividad—, así que la exigencia deja de ser suposición del equipo aunque
   * la tabla siga con `confirmado` en false.
   */
  it('el documento requerido confirma la exigencia', async () => {
    expect((await consultar([], [])).exigenciaConfirmada).toBe(false);
    expect((await consultar([requisito], [])).exigenciaConfirmada).toBe(true);
  });
});
