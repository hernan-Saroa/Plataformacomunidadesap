import { RundIncorporacion } from './rund-incorporacion';

describe('Registro acotado de contratación RUND', () => {
  const data = { numeroContrato: 'Contrato 01', fechaContratacion: '2026-01-01', fechaFin: null,
    soporteId: 'support', documentoVersionId: 'version', blockVersion: 3, justificacion: 'Contrato verificado.' };
  function setup({ version = 3, support = true, failAudit = false } = {}) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM rund."Docente"')) return [{ id: 'docente', actoAdministrativoVinculacion: 'Contrato anterior' }];
      if (sql.includes('SELECT version')) return [{ version }];
      if (sql.includes('SELECT s.id,s.documento_perfil_id')) return support ? [{ id: 'support', documento_perfil_id: 'version' }] : [];
      if (sql.includes('SELECT * FROM rund."RundCampoEstado"')) return [{ estado: 'Aprobado' }];
      if (failAudit && sql.includes('INSERT INTO rund."RundAprobacionLog"')) throw new Error('AUDIT_FAILED');
      return [];
    });
    const runner = { query, connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn() };
    return { runner, service: new RundIncorporacion({ createQueryRunner: () => runner } as any) };
  }
  it.each([{ estado: 'ACTIVO' }, { escalafon: 'Titular' }, { nombreCompleto: 'OTRA PERSONA' }, { actorId: 'falso' }, { fechaContratacion: '2026-02-30' }, { fechaFin: '2025-01-01' }, { justificacion: '' }])('rechaza datos fuera del alcance o inválidos: %p', async change => {
    const { service, runner } = setup();
    await expect(service.save('docente', { ...data, ...change }, 'actor')).rejects.toThrow();
    expect(runner.startTransaction).not.toHaveBeenCalled();
  });
  it.each([{ version: 2 }, { support: false }])('rechaza datos o soportes obsoletos: %p', async options => {
    const { service, runner } = setup(options);
    await expect(service.save('docente', data, 'actor')).rejects.toThrow();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalled();
  });
  it('modifica únicamente contrato y fechas, reabre revisión y conserva el actor autenticado', async () => {
    const { service, runner } = setup();
    await service.save('docente', data, 'actor-real');
    expect(runner.commitTransaction).toHaveBeenCalled();
    const updates = runner.query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE rund."Docente" SET "actoAdministrativo'));
    expect(updates).toHaveLength(1);
    expect(updates[0][0]).not.toMatch(/escalafon|sexo|personaId|estadoAprobacion|estado=/);
    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining('RundAprobacionLog'), expect.arrayContaining(['actor-real', 'REGISTRAR_DATOS_INCORPORACION']));
    expect(runner.query).toHaveBeenCalledWith(expect.stringContaining("revisiones_campos = '{}'"), expect.anything());
  });
  it('revierte la operación completa si falla la auditoría', async () => {
    const { service, runner } = setup({ failAudit: true });
    await expect(service.save('docente', data, 'actor')).rejects.toThrow('AUDIT_FAILED');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });
});
