import { ModalidadProcesoService } from './modalidad-proceso.service';

/**
 * Ratificar la modalidad puede ser lo que cierre la etapa 3.
 *
 * La solicitud de CDP nace al cerrarse la etapa, y cada camino que cierra una
 * actividad tiene que preguntarlo. La 3.5 no lo hacía, y no era un caso de
 * laboratorio: en **mínima cuantía** la matriz excluye la causal (3.6) y el
 * comité (3.7), así que la última actividad que aplica es justo esta. Una de
 * las modalidades más frecuentes de la Escuela cerraba su etapa 3 sin que nadie
 * radicara el CDP, y el proceso no podía abrirse.
 *
 * Se prueba con dobles y no contra la base porque lo que hay que fijar es que
 * la pregunta se hace —y que devolver no la hace—, no lo que responde: qué
 * cuenta como etapa cerrada ya lo fija `laEtapaCerro`.
 */
describe('decidir la modalidad · el cierre de la etapa 3', () => {
  const armar = () => {
    const actividad = { id: 'a-1', estado: 'EN_REVISION', version: 1 };
    const preguntas: string[] = [];

    /** Lo mínimo del EntityManager para que `decidir` llegue hasta el final. */
    const em = {
      getRepository: () => ({
        findOne: async () => actividad,
        createQueryBuilder: () => {
          const q: any = {
            where: () => q,
            setLock: () => q,
            getOne: async () => actividad,
          };
          return q;
        },
      }),
      save: async (_e: unknown, x?: unknown) => x ?? _e,
      create: (_e: unknown, x: unknown) => x,
    };

    const servicio = new ModalidadProcesoService(
      { transaction: async (cb: any) => cb(em) } as never,
      {
        quienDecide: async () => ({ abogado: { nombre: 'Andrés Rojas' }, motivo: null }),
      } as never,
      {} as never,
      {
        crearSolicitudSiCerroLaEtapa3: async (_em: unknown, procesoId: string) => {
          preguntas.push(procesoId);
          return null;
        },
      } as never,
      { exigeFirma: async () => false } as never,
    );

    // `estado` vuelve a leer de la base al terminar y no es lo que se prueba.
    (servicio as any).estado = async () => ({});

    return { servicio, preguntas };
  };

  const acceso = { userName: 'Andrés Rojas', userId: 'u-1' } as never;

  it('ratificarla pregunta si con eso cerró la etapa', async () => {
    const { servicio, preguntas } = armar();

    await servicio.decidir('p-1', { decision: 'APROBADO' }, acceso);

    expect(preguntas).toEqual(['p-1']);
  });

  it('devolverla no pregunta: no cerró nada', async () => {
    // La actividad vuelve a estar abierta para que el área corrija, así que la
    // etapa sigue teniendo trabajo pendiente por definición.
    const { servicio, preguntas } = armar();

    await servicio.decidir(
      'p-1',
      { decision: 'DEVUELTO', observaciones: 'Por la cuantía corresponde licitación pública' },
      acceso,
    );

    expect(preguntas).toEqual([]);
  });
});
