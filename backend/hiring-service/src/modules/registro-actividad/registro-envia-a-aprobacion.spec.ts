import { RegistroActividadService } from './registro-actividad.service';

/**
 * Registrar la actividad es lo que la envía a aprobación (EFDS-1183).
 *
 * Antes el registro la cerraba siempre en APROBADO, hubiera o no quien la
 * revisara, y el envío vivía en un botón aparte que no comprobaba nada: se
 * podía mandar a revisión una actividad vacía, y una con aprobador configurado
 * se daba por buena sin que nadie la mirara. Ahora decide el registro, que es
 * el único punto que sabe si el trabajo está hecho.
 */
describe('RegistroActividadService · en qué estado queda la actividad al registrarla', () => {
  /** La actividad tal como está en la base antes de registrar. */
  const actividadEnBorrador = () => ({
    estado: 'BORRADOR',
    enviadoPor: null as string | null,
    revisadoPor: null as string | null,
    revisadaAt: null as Date | null,
  });

  /**
   * Lo mínimo del EntityManager: devuelve la actividad y recuerda lo guardado.
   */
  const conActividad = (actividad: unknown) => {
    const guardado: unknown[] = [];
    const em = {
      getRepository: () => ({ findOne: async () => actividad }),
      save: async (x: unknown) => {
        guardado.push(x);
        return x;
      },
      create: (_e: unknown, x: unknown) => x,
    };
    return { em, guardado };
  };

  /**
   * El servicio con un servicio de aprobación que responde lo que se le diga.
   *
   * El del CDP entra sin hacer nada: `marcarActividad` no lo llama —quien
   * pregunta por el cierre de la etapa es `guardar`, con lo que esta devuelve—
   * y lo que aquí se prueba es en qué estado queda la actividad.
   */
  const servicio = (aprobadores: unknown) =>
    new RegistroActividadService(
      {} as never,
      { aprobadoresDe: async () => aprobadores } as never,
      { crearSolicitudSiCerroLaEtapa3: async () => null } as never,
    ) as never as {
      marcarActividad(
        em: unknown,
        procesoId: string,
        numeral: string,
        cumplida: boolean,
        acceso: unknown,
        modalidad?: string | null,
      ): Promise<{ estado: string; cierra: boolean }>;
    };

  const acceso = { userName: 'Adrián Castro', userId: 'u-1' } as never;

  it('la deja esperando aprobación cuando la matriz configuró quién revisa', async () => {
    const actividad = actividadEnBorrador();
    const { em } = conActividad(actividad);

    await servicio({ roles: ['DIRECTOR_CONTRATACION'] }).marcarActividad(
      em,
      'p-1',
      '3.3',
      true,
      acceso,
      'CONTRATACION_DIRECTA',
    );

    expect(actividad.estado).toBe('EN_REVISION');
    // Queda constancia de quién la envió, que es lo que permite retirarla.
    expect(actividad.enviadoPor).toBe('Adrián Castro');
  });

  it('no firma como revisor a quien solo la envió', async () => {
    // Sellarlo ahí sería aprobar en nombre del director antes de que decida.
    const actividad = actividadEnBorrador();
    const { em } = conActividad(actividad);

    await servicio({ roles: ['DIRECTOR_CONTRATACION'] }).marcarActividad(
      em,
      'p-1',
      '3.3',
      true,
      acceso,
      'CONTRATACION_DIRECTA',
    );

    expect(actividad.revisadoPor).toBeNull();
  });

  it('la cierra donde nadie la revisa, como hasta ahora', async () => {
    const actividad = actividadEnBorrador();
    const { em } = conActividad(actividad);

    await servicio(null).marcarActividad(em, 'p-1', '5.10', true, acceso, 'LICITACION');

    expect(actividad.estado).toBe('APROBADO');
    expect(actividad.revisadoPor).toBe('Adrián Castro');
  });

  /**
   * Lo que `guardar` necesita saber para preguntar por el cierre de la etapa 3.
   *
   * La solicitud de CDP nace al cerrarse la etapa, y donde nadie tiene aprobador
   * configurado el registro *es* el cierre. De la etapa 3 aquí solo queda la
   * 3.2, que el riel obliga a cerrar antes que las siguientes; pero anular su
   * registro la devuelve a BORRADOR, y volver a registrarla con todo lo demás
   * cerrado deja a este camino cerrando la etapa.
   */
  it('avisa de que cerró, para que se pregunte por la etapa', async () => {
    const { em } = conActividad(actividadEnBorrador());

    const { cierra: cerro } = await servicio(null).marcarActividad(
      em,
      'p-1',
      '3.2',
      true,
      acceso,
      'CONTRATACION_DIRECTA',
    );

    expect(cerro).toBe(true);
  });

  it('no avisa cuando la deja esperando a quien revisa', async () => {
    // Todavía no cerró nada: quien decida pasará por la aprobación, que ya
    // pregunta por su cuenta. Preguntar aquí radicaría el CDP antes de que
    // nadie hubiera aprobado el registro.
    const { em } = conActividad(actividadEnBorrador());

    const { cierra: cerro } = await servicio({ roles: ['DIRECTOR_CONTRATACION'] }).marcarActividad(
      em,
      'p-1',
      '3.2',
      true,
      acceso,
      'CONTRATACION_DIRECTA',
    );

    expect(cerro).toBe(false);
  });

  it('tampoco al anular, que reabre la actividad', async () => {
    const { em } = conActividad({ ...actividadEnBorrador(), estado: 'APROBADO' });

    const { cierra: cerro } = await servicio(null).marcarActividad(em, 'p-1', '3.2', false, acceso, null);

    expect(cerro).toBe(false);
  });

  it('al anular el registro la devuelve a borrador', async () => {
    // Dejar de tener constancia es dejar de estar cumplida, con revisor o sin él.
    const actividad = { ...actividadEnBorrador(), estado: 'APROBADO' };
    const { em } = conActividad(actividad);

    await servicio({ roles: ['DIRECTOR_CONTRATACION'] }).marcarActividad(
      em,
      'p-1',
      '3.3',
      false,
      acceso,
      'CONTRATACION_DIRECTA',
    );

    expect(actividad.estado).toBe('BORRADOR');
    expect(actividad.revisadoPor).toBeNull();
  });
});
