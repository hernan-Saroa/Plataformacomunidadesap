import { RegistroActividadService } from './registro-actividad.service';

/**
 * El formulario deja de pedir el soporte donde lo recibe el bloque de formatos.
 *
 * El área reportó doble carga en las catorce actividades que se cumplen por
 * registro: el formulario ofrecía «Soporte de la actividad» y el bloque de
 * documentos volvía a pedir el mismo papel. Desde que el soporte cumple el
 * formato pendiente los dos escriben el mismo adjunto, así que la pantalla
 * necesita saber cuál de los dos manda —eso es `tieneFormatos`—.
 */
describe('RegistroActividadService · quién recibe el soporte de la actividad', () => {
  const formato = (id: string, modalidades: string[] = []) => ({
    id,
    codigo: 'BS-FO-101',
    nombre: 'Análisis del sector',
    modalidades,
    activo: true,
  });

  /**
   * El estado de una actividad de registro, con los formatos que la biblioteca
   * le tenga asignados y lo que el expediente ya haya recibido.
   */
  const consultar = async (formatos: unknown[], entregados: unknown[]) => {
    const porEntidad = (nombre: string) => {
      if (nombre === 'Proceso') return { modalidad: 'LICITACION_PUBLICA' };
      if (nombre === 'ActividadConSoporte') {
        return { etapa: 3, exigeSoporte: true, confirmado: false, notaFuente: null };
      }
      return null;
    };

    const em = {
      // Solo lo llama `formatoPendiente`, para el expediente del proceso.
      findOne: async () => ({ id: 'exp-1' }),
      getRepository: (entidad: { name: string }) => ({
        findOne: async () => porEntidad(entidad.name),
        find: async () => {
          if (entidad.name === 'Plantilla') return formatos;
          if (entidad.name === 'Documento') return entregados;
          return [];
        },
      }),
    };

    return (
      new RegistroActividadService({ manager: em } as never, {} as never) as unknown as {
        estado(procesoId: string, numeral: string): Promise<Record<string, unknown>>;
      }
    ).estado('proc-1', '3.2');
  };

  it('sin formatos asignados el soporte lo sigue pidiendo el formulario', async () => {
    const estado = await consultar([], []);

    expect(estado.tieneFormatos).toBe(false);
    // Y con la exigencia de la tabla intacta: es la única que queda.
    expect(estado.exigeSoporte).toBe(true);
  });

  it('con un formato asignado lo recibe el bloque de documentos', async () => {
    const estado = await consultar([formato('f1')], []);

    expect(estado.tieneFormatos).toBe(true);
    expect(estado.exigeSoporte).toBe(true);
  });

  it('entregado el formato ya no queda nada pendiente', async () => {
    const estado = await consultar([formato('f1')], [{ plantillaId: 'f1' }]);

    // `tieneFormatos` no cambia —el bloque sigue siendo el dueño— pero la
    // exigencia se apaga: es lo que desbloquea el botón de registrar sin que
    // el gestor tenga que volver a subir el mismo documento en el formulario.
    expect(estado.tieneFormatos).toBe(true);
    expect(estado.exigeSoporte).toBe(false);
  });

  it('el formato de otra modalidad no obliga a esta', async () => {
    const estado = await consultar([formato('f1', ['MINIMA_CUANTIA'])], []);

    expect(estado.tieneFormatos).toBe(false);
  });

  /*
   * Un formato asignado es decisión del área —alguien entró a la biblioteca y
   * lo puso aquí—, así que la exigencia deja de ser suposición del equipo
   * aunque la tabla siga con `confirmado` en false.
   */
  it('el formato asignado confirma la exigencia', async () => {
    expect((await consultar([], [])).exigenciaConfirmada).toBe(false);
    expect((await consultar([formato('f1')], [])).exigenciaConfirmada).toBe(true);
  });
});
