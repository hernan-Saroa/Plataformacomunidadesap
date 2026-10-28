import { BadRequestException, ConflictException } from '@nestjs/common';
import { confirmRundDeletion, deletionFingerprint } from './rund-registro-eliminacion';
import { BancoDocentesService } from './banco-docentes.service';
import { lockEvidenceProfile } from './rund-evidence-workflow';

const id = '11111111-1111-4111-8111-111111111111';
const row = { id, updatedAt: new Date('2026-10-22T12:00:00Z'), eliminadoRund: false };
const body = { ids: [id], motivo: 'Registro de pruebas duplicado', confirmado: true, fingerprint: deletionFingerprint([row]) };
describe('Eliminación segura del registro RUND', () => {
  it('una revisión, carga o incorporación concurrente no modifica el expediente eliminado', async () => {
    await expect(lockEvidenceProfile({ query: jest.fn().mockResolvedValue([{ id, eliminadoRund: true }]) } as any, id)).rejects.toThrow('eliminado de RUND');
  });
  it.each([{ ...body, ids: [] }, { ...body, ids: ['1) OR TRUE'] }, { ...body, confirmado: false },
    { ...body, motivo: 'corto' }, { ...body, fingerprint: undefined }])('rechaza una confirmación incompleta antes de escribir', async value => {
    const db = { transaction: jest.fn() };
    await expect(confirmRundDeletion(db as any, value, 'responsable')).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each([[], [{ ...row, eliminadoRund: true }], [{ ...row, updatedAt: new Date() }]].map(rows => [rows]))('no elimina parcialmente selecciones obsoletas', async rows => {
    const manager = { query: jest.fn().mockResolvedValueOnce(rows) };
    const db = { transaction: (fn: any) => fn(manager) };
    await expect(confirmRundDeletion(db as any, body, 'responsable')).rejects.toThrow(ConflictException);
    expect(manager.query).toHaveBeenCalledTimes(1);
  });
  it('usa una sola transacción y deja un registro de auditoría con actor, periodo y operación', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([row]).mockResolvedValue([]) };
    const db = { transaction: jest.fn(fn => fn(manager)) };
    await expect(confirmRundDeletion(db as any, { ...body, ids: [id, id] }, 'responsable', '127.0.0.1')).resolves.toMatchObject({ eliminados: 1 });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query.mock.calls[1][0]).toContain('"eliminadoRund"=true');
    expect(manager.query.mock.calls[2][0]).toContain('ELIMINAR_REGISTRO');
    expect(manager.query.mock.calls[2][1]).toEqual(expect.arrayContaining(['responsable', body.motivo, '127.0.0.1']));
  });
  it('no oculta un error de auditoría como eliminación exitosa', async () => {
    const manager = { query: jest.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Audit unavailable')) };
    await expect(confirmRundDeletion({ transaction: (fn: any) => fn(manager) } as any, body, 'responsable')).rejects.toThrow('Audit unavailable');
  });
  const authBanco = () => ({ proyeccion: jest.fn().mockResolvedValue({ items: [], seccionales: [], sedes: [] }) });
  it('previsualiza todo el filtro en el servidor, sin paginación y sin incluir eliminados', async () => {
    const service = Object.create(BancoDocentesService.prototype);
    service.authBanco = authBanco();
    service.dataSource = { query: jest.fn().mockResolvedValue([{ ...row, nombre_completo: 'Persona de prueba', periodo_carga: '2026-2' }]) };
    const result = await service.previewRegistroDeletion({ todosFiltrados: true, filters: { periodoCarga: '2026-2', search: 'prueba' }, excluirIds: [] });
    expect(result.total).toBe(1);
    // $1 es la proyección de Auth; los filtros empiezan en $2.
    expect(service.dataSource.query).toHaveBeenCalledWith(expect.stringContaining('COALESCE(d."eliminadoRund", false) = false'), [expect.any(String), '2026-2', '%prueba%']);
    expect(service.dataSource.query.mock.calls[0][0]).not.toContain('OFFSET');
  });
  it('previsualiza ids explícitos usando $2 (el $1 es la proyección de Auth) y valida que todos sigan disponibles', async () => {
    const service = Object.create(BancoDocentesService.prototype);
    service.authBanco = authBanco();
    service.dataSource = { query: jest.fn().mockResolvedValue([{ ...row, nombre_completo: 'Persona de prueba', periodo_carga: '2026-2' }]) };
    const result = await service.previewRegistroDeletion({ ids: [id] });
    expect(result).toMatchObject({ ids: [id], total: 1 });
    const [sql, params] = service.dataSource.query.mock.calls[0];
    expect(sql).toContain('ANY($2::text[])');
    expect(JSON.parse(params[0])).toEqual({ items: [], seccionales: [], sedes: [] });
    expect(params[1]).toEqual([id]);
    service.dataSource.query.mockResolvedValue([]);
    await expect(service.previewRegistroDeletion({ ids: [id] })).rejects.toThrow(BadRequestException);
  });
});
