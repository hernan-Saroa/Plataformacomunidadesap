import { PtaService } from './pta.service';

describe('PtaService - cierre reversible por periodo académico', () => {
  it('guarda el estado anterior al marcar como terminados los PTA de otros periodos', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'pta-1' }, { id: 'pta-2' }]);
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { manager: { query } };
    service.logger = { log: jest.fn() };

    const result = await service.finalizarPtasPorNuevoPeriodo('2026-2');

    expect(result).toEqual({ finalizados: 2 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"estadoAntesCierrePeriodo" = estado'),
      [
        '2026-2',
        ['Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO'],
      ],
    );
    expect(query.mock.calls[0][0]).not.toContain('updatedAt');
  });

  it('restaura el estado guardado o el estado legacy del JSON al reactivar el periodo', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'pta-borrador' }]);
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { manager: { query } };
    service.logger = { log: jest.fn() };

    const result = await service.restaurarPtasPorReactivacionPeriodo('2025-2');

    expect(result).toEqual({ restaurados: 1 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('NULLIF(p."datosEstructurados"->>\'estado\', \'\')'),
      [
        '2025-2',
        ['Terminado', 'TERMINADO', 'Finalizado', 'FINALIZADO', 'Rechazado', 'RECHAZADO'],
      ],
    );
    expect(query.mock.calls[0][0]).toContain('FROM academic_work_plan."HistorialEstadoPTA"');
    expect(query.mock.calls[0][0]).toContain('"estadoAntesCierrePeriodo" = NULL');
  });

  it('no modifica nada si no se recibe un código de periodo', async () => {
    const query = jest.fn();
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = { manager: { query } };

    await expect(service.restaurarPtasPorReactivacionPeriodo()).resolves.toEqual({ restaurados: 0 });
    expect(query).not.toHaveBeenCalled();
  });
});
