import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesController } from './banco-docentes.controller';
import { RundDocumentosService } from './rund-documentos.service';
import { BancoDocentesService } from './banco-docentes.service';

describe('RUND: carga masiva y archivos originales', () => {
  const actor = (role: string) => ({ user: { userId: 'operator-1', roles: [role] }, rundPermissions: new Set(['banco-docentes.rund.manage']) });
  const summary = () => ({ total: 2, created: 1, updated: 0, unchanged: 0, errors: 1,
    soporteCargaMasivaId: 'load-1',
    results: [{ docenteId: 'doc-1', documentNumber: '1020304050' }],
    errorDetails: [{ columna: 'DOCUMENTO_IDENTIDAD', fila: 3, datoErrado: '1020304050',
      documentoIdentidad: '1020304050', message: 'Documento 1020304050 duplicado', mensaje: 'Documento 1020304050 duplicado',
      reasons: ['1020304050 repetido'], data: { DOCUMENTO_IDENTIDAD: '1020304050', PUNTAJE_SALARIAL: 145.5, NOMBRE_COMPLETO: 'PRUEBA' },
    }],
  });

  it.each([['ADMIN', true], ['ADMIN', false], ['GESTION_PROFESORAL', true]] as const)(
    'protege resultados y errores para %s (previsualización=%s) y audita filas sin perfil', async (role, dryRun) => {
      const service = { bulkUpsert: jest.fn().mockResolvedValue(summary()), logSensitiveResourceAccess: jest.fn().mockResolvedValue(undefined) };
      const controller = new BancoDocentesController(service as any, {} as any);
      const response = await controller.bulkUpload(undefined, { rows: [{ DOCUMENTO_IDENTIDAD: '1020304050', NOMBRE_COMPLETO: 'PRUEBA', VINCULACION: 'OCASIONAL' }] },
        actor(role), String(dryRun));
      expect(response.success).toBe(true);
      expect(response.data.created).toBe(1);
      expect(response.data.errorDetails[0].fila).toBe(3);
      if (role === 'ADMIN') {
        expect(JSON.stringify(response)).not.toContain('1020304050');
        expect(JSON.stringify(response)).not.toContain('145.5');
      } else expect(response.data.results[0].documentNumber).toBe('1020304050');
      expect(service.logSensitiveResourceAccess).toHaveBeenCalledWith(expect.objectContaining({
        actorId: 'operator-1', resourceId: 'load-1', fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      }));
    },
  );

  it('si la carga ya terminó y falla la auditoría de lectura, devuelve recibo sin datos para evitar reimportar', async () => {
    const service = { bulkUpsert: jest.fn().mockResolvedValue(summary()), logSensitiveResourceAccess: jest.fn().mockRejectedValue(new Error('sin auditoría')) };
    const controller = new BancoDocentesController(service as any, {} as any);
    const response = await controller.bulkUpload(undefined, { rows: [{ DOCUMENTO_IDENTIDAD: '1020304050', NOMBRE_COMPLETO: 'PRUEBA', VINCULACION: 'OCASIONAL' }] }, actor('SUPER_ADMIN'), 'false');
    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({ created: 1, detalleNoDisponible: true, results: [], errorDetails: [] });
    expect(JSON.stringify(response)).not.toContain('1020304050');
  });

  it('deniega y audita el Excel original a ADMIN antes de leer el archivo', async () => {
    const service = { getBulkSupport: jest.fn(), logSensitiveResourceAccess: jest.fn().mockResolvedValue(undefined) };
    const controller = new BancoDocentesController(service as any, {} as any);
    await expect(controller.bulkSupport('load-1', {} as any, actor('ADMIN'))).rejects.toThrow(ForbiddenException);
    expect(service.getBulkSupport).not.toHaveBeenCalled();
    expect(service.logSensitiveResourceAccess).toHaveBeenCalledWith(expect.objectContaining({ result: 'DENEGADO' }));
  });

  it('permite al autorizado descargar el mismo contenido del Excel con auditoría', async () => {
    const binary = Buffer.from('original');
    const service = { getBulkSupport: jest.fn().mockResolvedValue({ content: binary, fileName: 'carga.xlsx', mimeType: 'application/octet-stream' }), logSensitiveResourceAccess: jest.fn().mockResolvedValue(undefined) };
    const controller = new BancoDocentesController(service as any, {} as any);
    const response = { setHeader: jest.fn(), send: jest.fn() };
    await controller.bulkSupport('load-1', response as any, actor('SUPER_ADMIN'));
    expect(response.send).toHaveBeenCalledWith(binary);
    expect(service.logSensitiveResourceAccess).toHaveBeenCalledWith(expect.objectContaining({ result: 'COMPLETO' }));
  });

  it('deniega la lectura del PDF original antes de acceder al repositorio', async () => {
    const db = { query: jest.fn().mockResolvedValueOnce([{ id: 'teacher-1' }]).mockResolvedValueOnce([{ id: 'doc-1', estado: 'ACTIVO' }]).mockResolvedValue([]) };
    const storage = { read: jest.fn() };
    const service = new RundDocumentosService(db as any, storage as any);
    await expect(service.content('teacher-1', 'doc-1', { actorId: 'admin-1', roles: ['ADMIN'], fullAccess: false })).rejects.toThrow(ForbiddenException);
    expect(storage.read).not.toHaveBeenCalled();
    expect(db.query.mock.calls[2][1]).toContain('DENEGADO');
  });

  it.each(['documentNumber', 'DOCUMENTO_IDENTIDAD', 'documento_identidad'])('editar con %s enmascarado conserva la identidad y los cambios ordinarios', async (key) => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    Object.assign(service, { resolveDocenteId: jest.fn().mockResolvedValue('teacher-1'),
      docenteRepo: { findOne: jest.fn().mockResolvedValue({ id: 'teacher-1', personaId: 'person-1', periodoCarga: '2026-1', estado: 'ACTIVO' }) },
      dataSource: { query: jest.fn().mockResolvedValueOnce([{ id: 'support-1' }]).mockResolvedValueOnce([{ document_number: '1020304050' }]) },
      upsertDocente: jest.fn().mockResolvedValue({ docenteId: 'teacher-1' }),
    });
    await service.updateDocente('teacher-1', { [key]: '******4050', telefono: '3001234567', soporteEdicionId: 'support-1', justificacionEdicion: 'Actualizar contacto' });
    const payload = service.upsertDocente.mock.calls[0][0];
    expect(payload.documentNumber).toBe('1020304050');
    expect(payload.telefono).toBe('3001234567');
    expect(JSON.stringify(payload)).not.toContain('******4050');
  });

  it('un alias de cédula no permite cambiar el perfil destinatario de una edición', async () => {
    const service = Object.create(BancoDocentesService.prototype) as any;
    Object.assign(service, { resolveDocenteId: jest.fn().mockResolvedValue('teacher-1'),
      docenteRepo: { findOne: jest.fn().mockResolvedValue({ id: 'teacher-1', personaId: 'person-1', periodoCarga: '2026-1' }) },
      dataSource: { query: jest.fn().mockResolvedValueOnce([{ id: 'support-1' }]).mockResolvedValueOnce([{ document_number: '1020304050' }]) },
      upsertDocente: jest.fn(),
    });
    await expect(service.updateDocente('teacher-1', { DOCUMENTO_IDENTIDAD: '9999999999', soporteEdicionId: 'support-1', justificacionEdicion: 'Actualizar' }))
      .rejects.toThrow('no se puede modificar');
    expect(service.upsertDocente).not.toHaveBeenCalled();
  });
});
