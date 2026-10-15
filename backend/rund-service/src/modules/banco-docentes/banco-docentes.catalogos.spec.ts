import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesService } from './banco-docentes.service';

const payload = { DOCUMENTO_IDENTIDAD: '1020304050', TIPO_DOCUMENTO: 'CC', NOMBRE_COMPLETO: 'PERSONA FICTICIA PRUEBA',
  GENERO: 'Femenino', FECHA_NACIMIENTO: '17/01/1980', CORREO_INSTITUCIONAL: 'prueba@esap.edu.co', VINCULACION: 'Ocasional',
  TERRITORIAL: 'NORTESANTANDER', DEDICACION: 'Tiempo Completo', CATEGORIA_ESCALAFON: 'Asociado',
  INICIO_VINCULACION: '20/01/2025', ACTO_ADMINISTRATIVO: 'Resolución ficticia', NIVEL_FORMACION: 'Maestría',
  TITULO_PREGRADO: 'Administración', NUCLEO_TEMATICO: 'Administración', PERFIL_ACADEMICO: 'Docencia', PERIODO_CARGA: '2026-2' };
const items = [{ id: '9007199254740993', nombre: 'Norte de Santander', codigo: '001' },
  { id: '1', nombre: 'Santander', codigo: '01' }, { id: '31', nombre: 'Sede Central', codigo: null }];

function build() {
  const catalogos = { territorialesBanco: jest.fn().mockResolvedValue(items) };
  const query = jest.fn().mockResolvedValue([]);
  const transaction = jest.fn(async callback => callback({ query }));
  const service = new BancoDocentesService({} as any, {} as any, {} as any, {} as any, {} as any,
    { query, transaction } as any, catalogos as any, {} as any, { fichaPorPersona: jest.fn().mockResolvedValue({ num_identificacion: '1020304050' }), personasPorAlias: jest.fn().mockResolvedValue([]) } as any);
  const manager = {
    query: jest.fn(async (sql: string, _params?: any[]): Promise<any[]> => {
      if (sql.includes('SELECT *') && sql.includes('FROM auth.personas')) return [{ id_person: 'persona-1', num_identificacion: payload.DOCUMENTO_IDENTIDAD }];
      if (sql.includes('SELECT * FROM auth."user"')) return [{ id_user: 'usuario-1', username: 'prueba@esap.edu.co' }];
      if (sql.includes('FROM auth.role')) return [{ id: 'rol-1' }];
      return [];
    }),
    findOne: jest.fn().mockResolvedValue({ id: 'docente-1', personaId: 'persona-1', territorialId: '24', periodoCarga: '2026-2', idRund: 'RUND-1' }),
    create: jest.fn((_entity, value) => value),
    save: jest.fn(async (_entity, value) => value),
  };
  return { service, catalogos, query, transaction, manager };
}

describe('Catálogo del banco RUND por API Auth', () => {
  it.each([['NORTESANTANDER', '9007199254740993'], ['Norte de Santander', '9007199254740993'], ['Santander', '1']])(
    'la carga resuelve %s con ID Auth %s sin confundir código o perder precisión', async (territorial, id) => {
      const { service, manager, catalogos } = build();
      await service.upsertDocente({ ...payload, TERRITORIAL: territorial }, { bulkImport: true, outerManager: manager });
      expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ territorialId: id, territorialReportada: territorial }));
      expect(catalogos.territorialesBanco).toHaveBeenCalledTimes(1);
      const authUpdate = manager.query.mock.calls.find(([sql]) => sql.includes('UPDATE auth.personas'));
      expect(authUpdate?.[1]?.[10]).toBe(id);
      expect(manager.query.mock.calls.every(([sql]) => !sql.includes('FROM auth.seccionales'))).toBe(true);
    });

  it('un nombre desconocido masivo conserva el dato informado y la asignación previa', async () => {
    const { service, manager } = build();
    await service.upsertDocente({ ...payload, TERRITORIAL: 'Regional informada' }, { bulkImport: true, outerManager: manager });
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ territorialId: '24', territorialReportada: 'Regional informada' }));
  });

  it('manual mantiene el rechazo de territorial desconocida antes de escribir', async () => {
    const { service, manager } = build();
    await expect(service.upsertDocente({ ...payload, TERRITORIAL: 'Desconocida' }, { outerManager: manager })).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled(); expect(manager.save).not.toHaveBeenCalled();
  });

  it('autogestión conserva Sede Central como preferencia solo con catálogo confirmado', async () => {
    const { service, manager } = build();
    await service.upsertDocente({ ...payload, TERRITORIAL: 'Desconocida' }, { relaxValidation: true, outerManager: manager });
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ territorialId: '31' }));
  });

  it('preservar territorial en edición no la reasigna al catálogo nuevo', async () => {
    const { service, manager } = build();
    await service.upsertDocente(payload, { preserveTerritorial: true, outerManager: manager });
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ territorialId: '24' }));
  });

  it.each([{}, { bulkImport: true }, { relaxValidation: true }])('fallo del propietario no escribe ni usa un reemplazo: %s', async options => {
    const { service, manager, catalogos } = build();
    catalogos.territorialesBanco.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.upsertDocente(payload, { ...options, outerManager: manager })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(manager.query).not.toHaveBeenCalled(); expect(manager.save).not.toHaveBeenCalled();
  });

  it.each([false, true])('lote dryRun=%s obtiene un único snapshot antes de soporte y transacciones', async dryRun => {
    const { service, catalogos, query, transaction } = build();
    const calls: string[] = [];
    catalogos.territorialesBanco.mockImplementation(async () => { calls.push('catalogo'); return items; });
    query.mockImplementation(async sql => { calls.push(sql); return []; });
    transaction.mockImplementation(async callback => { calls.push('transaccion'); return callback({ query }); });
    const upsert = jest.spyOn(service, 'upsertDocente').mockResolvedValue({ action: 'insert', docenteId: 'docente-1' } as any);
    await service.bulkUpsert([payload, { ...payload, DOCUMENTO_IDENTIDAD: '1020304051' }], {
      dryRun, support: { fileName: 'ficticio.xlsx', mimeType: 'application/octet-stream', content: Buffer.from('ficticio') },
    });
    expect(catalogos.territorialesBanco).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls.every(([, options]) => options?.territoriales === items)).toBe(true);
    const firstWriteOrTransaction = calls.findIndex(value => value === 'transaccion' || value.includes('INSERT INTO'));
    expect(calls.indexOf('catalogo')).toBeLessThan(firstWriteOrTransaction);
  });

  it('fallo de catálogo detiene el lote antes de guardar soporte o abrir transacciones', async () => {
    const { service, catalogos, query, transaction } = build();
    catalogos.territorialesBanco.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.bulkUpsert([payload], { support: { fileName: 'ficticio', mimeType: 'text/plain', content: Buffer.from('x') } }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(transaction).not.toHaveBeenCalled();
    expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  });

  it('el payload no puede sustituir el snapshot interno ni los IDs del propietario', async () => {
    const { service, manager } = build();
    await service.upsertDocente({ ...payload, territoriales: [{ id: 'ID-AJENO', nombre: 'Norte de Santander', codigo: '001' }] },
      { bulkImport: true, outerManager: manager });
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ territorialId: '9007199254740993' }));
  });

  it('los bloques del alta se guardan en el mismo manager del perfil, sin escapar del rollback', async () => {
    const { service, manager, query } = build();
    manager.findOne.mockResolvedValue(null);
    manager.query.mockImplementation(async sql => {
      if (sql.includes('SELECT *') && sql.includes('FROM auth.personas')) return [{ id_person: 'persona-1', num_identificacion: payload.DOCUMENTO_IDENTIDAD }];
      if (sql.includes('SELECT * FROM auth."user"')) return [{ id_user: 'usuario-1', username: 'prueba@esap.edu.co' }];
      if (sql.includes('FROM auth.role')) return [{ id: 'rol-1' }];
      if (sql.includes('next_val')) return [{ next_val: 1 }];
      return [];
    });
    manager.save.mockImplementation(async (_entity, value) => ({ id: 'perfil-nuevo', ...value }));
    await service.upsertDocente(payload, { bulkImport: true, outerManager: manager });
    expect(manager.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO rund."RundCampoEstado"'))).toHaveLength(6);
    expect(query).not.toHaveBeenCalled();
  });

  it('una edición con sugerencias confirma catálogo antes de bloquear sugerencias o abrir transacción', async () => {
    const { service, catalogos, query, transaction } = build();
    Object.assign(service, {
      resolveDocenteId: jest.fn().mockResolvedValue('docente-1'),
      docenteRepo: { findOne: jest.fn().mockResolvedValue({ id: 'docente-1', personaId: 'persona-1', periodoCarga: '2026-2', estado: 'ACTIVO' }) },
    });
    query.mockImplementation(async sql => sql.includes('AS document_number') ? [{ document_number: '1020304050' }] : [{ id: 'soporte-1' }]);
    catalogos.territorialesBanco.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.updateDocente('docente-1', { soporteEdicionId: 'soporte-1', justificacionEdicion: 'Corrección documentada',
      rundSuggestionIds: ['11111111-1111-4111-8111-111111111111'], rundSensitiveAccess: { fullAccess: true } }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(transaction).not.toHaveBeenCalled();
    expect(query.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });

  it.each(['Texto reportado', null])('tarjeta conserva prioridad informativa y degradación previa: %s', async reportada => {
    const { service, catalogos, query } = build();
    Object.assign(service, {
      resolveDocenteId: jest.fn().mockResolvedValue('docente-1'),
      docenteRepo: { findOne: jest.fn().mockResolvedValue({ id: 'docente-1', personaId: 'persona-1', territorialId: '24', territorialReportada: reportada }) },
      getBloques: jest.fn().mockResolvedValue([]),
    });
    query.mockResolvedValue([]);
    catalogos.territorialesBanco.mockRejectedValue(new ServiceUnavailableException());
    const tarjeta = await service.getTarjetaRUND('docente-1');
    expect(tarjeta.bloques.VINCULACION.campos).toContainEqual(expect.objectContaining({ campo: 'TERRITORIAL', valor: reportada }));
    expect(catalogos.territorialesBanco).toHaveBeenCalledTimes(reportada ? 0 : 1);
  });
});
