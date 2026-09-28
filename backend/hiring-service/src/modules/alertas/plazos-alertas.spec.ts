import { AlertasCron } from './alertas.cron';
import { AlertasService } from './alertas.service';

/**
 * Los plazos de las actividades en Alertas y en el aviso diario (EFDS-1183).
 *
 * Hoy es el martes 15 de septiembre de 2026.
 */
describe('Plazos de actividades', () => {
  const acceso = { userId: 'u-abogado', userName: 'abogado@esap.edu.co', roles: [], permisos: [], puedeEditar: true } as never;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T15:00:00Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  /** Dos actividades con plazo: una vence mañana, la otra se venció el viernes. */
  const conPlazos = () => {
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('FROM hiring.avisos_habilitacion h')) {
        return [
          { procesoId: 'p-1', radicado: 'CTO-1', numeral: '4.1', nombre: 'Solicitud de CDP', plazoDias: 5, avisarAntes: 2, desde: '2026-09-09' },
          { procesoId: 'p-2', radicado: 'CTO-2', numeral: '5.2', nombre: 'Publicación del proyecto de pliego', plazoDias: 3, avisarAntes: null, desde: '2026-09-08' },
          { procesoId: 'p-3', radicado: 'CTO-3', numeral: '5.1', nombre: 'Elaboración de documentos', plazoDias: 20, avisarAntes: 2, desde: '2026-09-14' },
        ];
      }
      return [];
    });
    return { srv: new AlertasService({ query } as never, { financieros: async () => [] } as never), query };
  };

  it('trae las que están por vencer o vencidas, con días hábiles', async () => {
    const { srv } = conPlazos();

    const plazos = await srv.plazosDeActividades(acceso);

    expect(plazos).toEqual([
      expect.objectContaining({ numeral: '4.1', vence: '2026-09-16', restantes: 1, estado: 'POR_VENCER' }),
      expect.objectContaining({ numeral: '5.2', vence: '2026-09-11', restantes: -2, estado: 'VENCIDO' }),
    ]);
  });

  it('cada usuario ve las de los procesos donde participa', async () => {
    const { srv, query } = conPlazos();

    await srv.plazosDeActividades(acceso);

    const [sql, params] = query.mock.calls.find(([s]) => String(s).includes('avisos_habilitacion'))!;
    expect(String(sql)).toContain('participaciones_proceso');
    expect(params).toEqual([false, 'u-abogado']);
  });

  it('aparecen en la lista de Alertas como plazo de actividad', async () => {
    const { srv } = conPlazos();

    const alertas = await srv.listar(null, acceso);

    expect(alertas.filter((a) => a.tipo === 'PLAZO_ACTIVIDAD').map((a) => a.descripcion)).toEqual([
      '5.2 · Publicación del proyecto de pliego',
      '4.1 · Solicitud de CDP',
    ]);
  });

  it('sin la tabla de habilitaciones la lista sigue, sin los plazos', async () => {
    const srv = new AlertasService(
      { query: jest.fn().mockRejectedValue(new Error('no existe')) } as never,
      { financieros: async () => [] } as never,
    );

    await expect(srv.plazosDeActividades(acceso)).resolves.toEqual([]);
  });

  it('el aviso diario manda «se vence el plazo» por el motor de avisos', async () => {
    const { srv } = conPlazos();
    const despachar = jest.fn().mockResolvedValue(2);
    const cron = new AlertasCron(srv, { valores: jest.fn() } as never, { despachar } as never);

    expect(await cron.avisarPlazos()).toBe(2);
    expect(despachar).toHaveBeenCalledWith([
      expect.objectContaining({ evento: 'VENCE_PLAZO', numeral: '4.1', procesoId: 'p-1', plazo: { vence: '2026-09-16', vencido: false } }),
      expect.objectContaining({ evento: 'VENCE_PLAZO', numeral: '5.2', procesoId: 'p-2', plazo: { vence: '2026-09-11', vencido: true } }),
    ]);
  });
});
