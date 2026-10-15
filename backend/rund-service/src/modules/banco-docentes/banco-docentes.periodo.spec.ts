import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

function build() {
  const catalogos = { periodoActivo: jest.fn().mockResolvedValue('2026-2'), territorialesBanco: jest.fn().mockResolvedValue([]) };
  const dataSource = { query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(async callback => callback({ query: jest.fn().mockResolvedValue([]) })) };
  const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
  Object.assign(service, { catalogos, dataSource });
  const upsert = jest.spyOn(service, 'upsertDocente').mockResolvedValue({ action: 'insert', docenteId: 'perfil-1' } as any);
  return { service, catalogos, dataSource, upsert };
}
const support = { fileName: 'ficticio.xlsx', mimeType: 'application/octet-stream', content: Buffer.from('ficticio') };

describe('Período de carga masiva RUND', () => {
  it.each(['PERIODO_CARGA', 'periodoCarga', 'periodo_carga'])('una fila con %s conserva su período sin necesitar PTA', async key => {
    const { service, catalogos, upsert } = build();
    catalogos.periodoActivo.mockRejectedValue(new ServiceUnavailableException());
    await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '12345', [key]: '2025-1' }], { dryRun: true, periodoCarga: '2026-1' });
    expect(upsert.mock.calls[0][0][key]).toBe('2025-1');
    expect(upsert.mock.calls[0][0]).not.toHaveProperty(key === 'PERIODO_CARGA' ? 'periodoCarga' : 'PERIODO_CARGA');
    expect(catalogos.periodoActivo).not.toHaveBeenCalled();
  });

  it('período del lote solo completa faltantes y no exige que sea el activo', async () => {
    const { service, catalogos, upsert } = build();
    await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '12345', PERIODO_CARGA: '2025-1' }, { DOCUMENTO_IDENTIDAD: '12346' }],
      { dryRun: true, periodoCarga: '2024-2' });
    expect(upsert.mock.calls.map(([row]) => row.PERIODO_CARGA)).toEqual(['2025-1', '2024-2']);
    expect(catalogos.periodoActivo).not.toHaveBeenCalled();
  });

  it('consulta una sola vez el activo para completar solo las filas pendientes, sin mutar el archivo', async () => {
    const { service, catalogos, upsert } = build();
    const rows = [{ DOCUMENTO_IDENTIDAD: '12345', PERIODO_CARGA: '2025-1' }, { DOCUMENTO_IDENTIDAD: '12346' }, { DOCUMENTO_IDENTIDAD: '12347' }];
    const original = JSON.parse(JSON.stringify(rows));
    await service.bulkUpsert(rows, { dryRun: true });
    expect(catalogos.periodoActivo).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls.map(([row]) => row.PERIODO_CARGA)).toEqual(['2025-1', '2026-2', '2026-2']);
    expect(rows).toEqual(original);
  });

  it('no inventa período cuando el propietario confirma ausencia', async () => {
    const { service, catalogos, upsert } = build();
    catalogos.periodoActivo.mockResolvedValue(null);
    await service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '12345' }], { dryRun: true });
    expect(upsert.mock.calls[0][0]).not.toHaveProperty('PERIODO_CARGA');
  });

  it.each([false, true])('fallo de PTA con dryRun=%s detiene antes de soporte, transacción o filas', async dryRun => {
    const { service, catalogos, dataSource, upsert } = build();
    catalogos.periodoActivo.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '12345' }], { dryRun, support })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(dataSource.query).not.toHaveBeenCalled(); expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled(); expect(catalogos.territorialesBanco).not.toHaveBeenCalled();
  });

  it('rechaza carga sin soporte antes de solicitar período o catálogo', async () => {
    const { service, catalogos, dataSource } = build();
    await expect(service.bulkUpsert([{ DOCUMENTO_IDENTIDAD: '12345' }])).rejects.toBeInstanceOf(BadRequestException);
    expect(catalogos.periodoActivo).not.toHaveBeenCalled(); expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('un lote vacío no consulta período ni catálogo', async () => {
    const { service, catalogos } = build();
    await service.bulkUpsert([], { dryRun: true });
    expect(catalogos.periodoActivo).not.toHaveBeenCalled(); expect(catalogos.territorialesBanco).not.toHaveBeenCalled();
  });
});
