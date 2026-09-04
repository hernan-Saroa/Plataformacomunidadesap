import { BadRequestException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

describe('BancoDocentesService - carga masiva trazable REQ-RUND-F001', () => {
  function buildService() {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(async (callback: any) => callback({ query: jest.fn().mockResolvedValue([]) })),
    };
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    (service as any).dataSource = dataSource;
    return { service, dataSource };
  }

  it('rechaza una importacion definitiva si no puede conservar el archivo fuente', async () => {
    const { service } = buildService();

    await expect(service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '1020304050' }], {
      periodoCarga: '2026-2',
    })).rejects.toThrow(BadRequestException);
  });

  it('conserva el soporte y lo vincula a la auditoria de cada fila modificada', async () => {
    const { service, dataSource } = buildService();
    const upsertSpy = jest.spyOn(service, 'upsertDocente').mockResolvedValue({
      action: 'insert',
      docenteId: '11111111-1111-4111-8111-111111111111',
    } as any);

    const result = await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '1020304050' }], {
      periodoCarga: '2026-2',
      actorId: 'usuario-ggp-1',
      ip: '127.0.0.1',
      support: {
        fileName: 'docentes-2026-2.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: Buffer.from('archivo-prueba'),
        justificacion: 'Migracion inicial de perfiles docentes',
      },
    });

    expect(result.created).toBe(1);
    expect(result.soporteCargaMasivaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(String(dataSource.query.mock.calls[1][0])).toContain('RundCargaMasiva');
    expect(upsertSpy).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      audit: expect.objectContaining({
        actorId: 'usuario-ggp-1',
        canalOrigen: 'MASIVO',
        soporteId: result.soporteCargaMasivaId,
      }),
    }));
    expect(String(dataSource.query.mock.calls.at(-1)?.[0])).toContain('UPDATE academic_work_plan."RundCargaMasiva"');
  });

  it('bloquea cédulas repetidas dentro del mismo archivo', async () => {
    const { service } = buildService();
    const upsertSpy = jest.spyOn(service, 'upsertDocente');

    const result = await service.bulkUpsert([
      { DOCUMENTO_IDENTIDAD: '1020304050', PERIODO_CARGA: '2026-2', __sourceRowNumber: 2 },
      { DOCUMENTO_IDENTIDAD: '1020304050', PERIODO_CARGA: '2026-2', __sourceRowNumber: 3 },
    ], {
      dryRun: true,
      periodoCarga: '2026-2',
    });

    expect(result.errors).toBe(2);
    expect(result.errorDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({ tipo: 'DUPLICADO_DOCUMENTO', filasDuplicadas: [2, 3] }),
    ]));
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('rechaza identificadores de soporte invalidos antes de consultar PostgreSQL', async () => {
    const { service, dataSource } = buildService();

    await expect(service.getBulkSupport('no-es-uuid')).rejects.toThrow(BadRequestException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

describe('BancoDocentesService - resolución segura por cédula', () => {
  it('no intenta comparar una cédula contra columnas UUID', async () => {
    const docenteRepo = { findOne: jest.fn() };
    const dataSource = { query: jest.fn().mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111' }]) };
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    (service as any).docenteRepo = docenteRepo;
    (service as any).dataSource = dataSource;

    const result = await service.resolveDocenteId('1.020.304.050', '2026-2');

    expect(result).toBe('11111111-1111-4111-8111-111111111111');
    expect(docenteRepo.findOne).not.toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('num_identificacion'), [
      '1.020.304.050',
      '2026-2',
    ]);
  });
});
