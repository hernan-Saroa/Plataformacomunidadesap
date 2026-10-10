import { efectoDeActivar } from './periodo-activacion';
import { PtaService } from './pta.service';

/**
 * EFDS-2328 :: la confirmación de activar no puede diferir de la activación.
 *
 *   · efectoDeActivar es la regla única: anteriores → cerrado, posteriores →
 *     planeación, el mismo periodo → nada.
 *   · la vista previa de PTA a terminar y la terminación usan la MISMA
 *     condición SQL y los mismos parámetros.
 */
describe('EFDS-2328 :: impacto de activar un periodo', () => {
  const p = (id: number, anio: number, semestre: number) => ({ id, anio, semestre });

  it('anteriores se cierran, posteriores vuelven a planeacion, el mismo no cambia', () => {
    const activo = p(5, 2026, 2);
    expect(efectoDeActivar(activo, p(1, 2025, 2))).toBe('cerrado');
    expect(efectoDeActivar(activo, p(2, 2026, 1))).toBe('cerrado');
    expect(efectoDeActivar(activo, p(3, 2027, 1))).toBe('planeacion');
    expect(efectoDeActivar(activo, p(5, 2026, 2))).toBeNull();
    expect(efectoDeActivar(activo, { id: '5', anio: 2026, semestre: 2 })).toBeNull(); // id como texto
  });

  it('la vista previa y la terminacion usan la misma condicion y los mismos parametros', async () => {
    const consultas: Array<{ sql: string; params: any[] }> = [];
    const svc = Object.create(PtaService.prototype) as PtaService;
    (svc as any).logger = { log: () => {} };
    (svc as any).ptaRepo = {
      manager: {
        query: async (sql: string, params: any[]) => {
          consultas.push({ sql, params });
          return /SELECT p\.periodo/.test(sql) ? [{ codigo: '2026-1', ptas: '3' }] : [{ id: 'a' }];
        },
      },
    };

    const vista = await svc.contarPtasAFinalizarPorNuevoPeriodo('2026-2');
    await svc.finalizarPtasPorNuevoPeriodo('2026-2');

    expect(vista).toEqual([{ codigo: '2026-1', ptas: 3 }]);
    const [previa, efecto] = consultas;
    const condicion = (sql: string) => sql.slice(sql.indexOf('WHERE') + 5).split(/GROUP BY|RETURNING/)[0].trim();
    expect(condicion(previa.sql)).toBe(condicion(efecto.sql));
    expect(previa.params).toEqual(efecto.params);
    expect(previa.params[0]).toBe('2026-2');
  });
});
