import { BadRequestException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';
import { EVIDENCE_TYPES } from './rund-evidence-workflow';

jest.mock('./rund-evidence-data', () => ({
  ...jest.requireActual('./rund-evidence-data'),
  assertRundEvidenceData: jest.fn().mockResolvedValue(undefined),
}));

const DOCENTE = '11111111-1111-4111-8111-111111111111';
const [BLOQUE, TIPOS] = Object.entries(EVIDENCE_TYPES).find(([, tipos]) => (tipos as string[]).length > 0) as [string, string[]];
const TIPO = TIPOS.find((t) => !['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(t)) as string;
const [BLOQUE_HISTORICO] = Object.entries(EVIDENCE_TYPES).find(([, tipos]) => (tipos as string[]).includes('soporte_edicion_perfil')) as [string, string[]];

/** dataSource falso: todo lo que ocurre dentro de la transacción pasa por `manager`; fuera de ella no debe haber escrituras. */
function build(options: { existing?: Array<{ id: string }>; failOn?: RegExp } = {}) {
  const manager = {
    query: jest.fn(async (sql: string) => {
      if (options.failOn?.test(sql)) throw new Error('fallo de base de datos');
      if (/SELECT id FROM academic_work_plan\."RundSoporteCampo"/.test(sql)) return options.existing ?? [];
      return [];
    }),
  };
  const dataSource = {
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(async (work: any) => work(manager)),
  };
  const service = Object.create(BancoDocentesService.prototype) as any;
  service.dataSource = dataSource;
  service.resolveDocenteId = jest.fn().mockResolvedValue(DOCENTE);
  service.logger = { warn: jest.fn() };
  return { service, manager, dataSource };
}
const sqlOf = (manager: any) => manager.query.mock.calls.map(([sql]: any[]) => String(sql));
const data = (extra: Record<string, unknown> = {}) => ({ tipoSoporte: TIPO, nombreArchivo: 'soporte.pdf', documentoCarpetaId: '/ruta/soporte.pdf', cargadoPor: 'user-1', ...extra });

describe('vincularSoporte: el soporte, el estado del bloque y la auditoría se confirman juntos (NF002)', () => {
  it('inserta el soporte y registra la auditoría dentro de la misma transacción', async () => {
    const { service, manager, dataSource } = build();
    const result = await service.vincularSoporte(DOCENTE, BLOQUE, data());
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    const sqls = sqlOf(manager);
    expect(sqls.some((s: string) => /INSERT INTO academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(true);
    expect(sqls.some((s: string) => /UPDATE academic_work_plan\."RundCampoEstado"/.test(s))).toBe(true);
    const audit = manager.query.mock.calls.find(([sql]: any[]) => /INSERT INTO academic_work_plan\."RundAprobacionLog"/.test(String(sql)));
    expect(audit).toBeDefined();
    expect(audit[1]).toEqual(expect.arrayContaining([DOCENTE, 'VINCULAR_SOPORTE', 'user-1']));
    expect(result).toMatchObject({ success: true, bloque: BLOQUE, tipoSoporte: TIPO, documentoCarpetaId: '/ruta/soporte.pdf' });
    expect(result.id).toBe(audit[1][10]);
  });

  it('fuera de la transacción solo se leen datos: ninguna escritura queda suelta', async () => {
    const { service, dataSource } = build();
    await service.vincularSoporte(DOCENTE, BLOQUE, data());
    const writes = dataSource.query.mock.calls.filter(([sql]: any[]) => /INSERT|UPDATE|DELETE/i.test(String(sql)));
    expect(writes).toEqual([]);
  });

  it('si la auditoría no se puede escribir, la operación falla completa (no queda soporte sin rastro)', async () => {
    const { service, manager } = build({ failOn: /INSERT INTO academic_work_plan\."RundAprobacionLog"/ });
    await expect(service.vincularSoporte(DOCENTE, BLOQUE, data())).rejects.toThrow('fallo de base de datos');
    // La transacción real revierte lo anterior: el rechazo se propaga y nunca se devuelve un resultado de éxito.
    expect(sqlOf(manager).some((s: string) => /INSERT INTO academic_work_plan\."RundAprobacionLog"/.test(s))).toBe(true);
  });

  it('si falla la escritura del soporte, no se registra la auditoría', async () => {
    const { service, manager } = build({ failOn: /INSERT INTO academic_work_plan\."RundSoporteCampo"/ });
    await expect(service.vincularSoporte(DOCENTE, BLOQUE, data())).rejects.toThrow('fallo de base de datos');
    expect(sqlOf(manager).some((s: string) => /RundAprobacionLog/.test(s))).toBe(false);
  });

  it('reemplazar un soporte vigente actualiza el existente y limpia duplicados dentro de la transacción', async () => {
    const { service, manager } = build({ existing: [{ id: 'soporte-1' }, { id: 'soporte-2' }] });
    const result = await service.vincularSoporte(DOCENTE, BLOQUE, data());
    const sqls = sqlOf(manager);
    expect(sqls.some((s: string) => /UPDATE academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(true);
    expect(sqls.some((s: string) => /DELETE FROM academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(true);
    expect(sqls.some((s: string) => /INSERT INTO academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(false);
    expect(result.id).toBe('soporte-1');
  });

  it('los soportes de edición y de cambio de estado son históricos: siempre se inserta uno nuevo y el canal queda como MODAL', async () => {
    const { service, manager } = build({ existing: [{ id: 'anterior' }] });
    const result = await service.vincularSoporte(DOCENTE, BLOQUE_HISTORICO, data({ tipoSoporte: 'soporte_edicion_perfil' }));
    const sqls = sqlOf(manager);
    expect(sqls.some((s: string) => /INSERT INTO academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(true);
    expect(sqls.some((s: string) => /UPDATE academic_work_plan\."RundSoporteCampo"/.test(s))).toBe(false);
    expect(result.id).not.toBe('anterior');
    const audit = manager.query.mock.calls.find(([sql]: any[]) => /RundAprobacionLog/.test(String(sql)));
    expect(audit[1]).toContain('MODAL');
  });

  it('rechaza un bloque inexistente o un tipo de soporte que no corresponde, sin abrir la transacción', async () => {
    const { service, dataSource } = build();
    await expect(service.vincularSoporte(DOCENTE, 'NO_EXISTE', data())).rejects.toThrow(BadRequestException);
    await expect(service.vincularSoporte(DOCENTE, BLOQUE, data({ tipoSoporte: 'tipo_inventado' }))).rejects.toThrow(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('el actor y el soporte quedan en la auditoría; sin actor se usa SISTEMA', async () => {
    const { service, manager } = build();
    await service.vincularSoporte(DOCENTE, BLOQUE, data({ cargadoPor: undefined }));
    const audit = manager.query.mock.calls.find(([sql]: any[]) => /RundAprobacionLog/.test(String(sql)));
    expect(audit[1]).toContain('SISTEMA');
  });
});
