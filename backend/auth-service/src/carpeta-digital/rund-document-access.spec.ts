import express from 'express';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { protectRundFolderDocument, rundFolderStaticAccess, rundDocumentActor } from './rund-document-access';
import { CarpetaDigitalService } from './carpeta-digital.service';

describe('Carpeta Digital: integración de la política RUND', () => {
  const jwt = new JwtService({ secret: 'rund-folder-test-secret' });
  const original = { id: 'doc-1', rund_soporte_id: 'support-1', nombre: 'cedula-1020304050.pdf', url_archivo: '/auth/api/v1/uploads/carpeta-digital/persona/file.pdf', comentarios: 'puntaje 145.5' };

  it.each(['DOCENTE', 'ADMIN', 'CONSULTOR', 'GESTION_PROFESORAL', 'SUPER_ADMIN'])('aplica la misma matriz a %s', (role) => {
    const full = ['GESTION_PROFESORAL', 'SUPER_ADMIN'].includes(role);
    const user = { userId: 'test-user', roles: [{ code: role }], permissions: ['banco-docentes.rund.manage'] };
    expect(rundDocumentActor(user).fullAccess).toBe(full);
    const result = protectRundFolderDocument(original, user);
    expect(result.url_archivo).toBe(full ? original.url_archivo : null);
    expect(result.contenido_restringido).toBe(!full);
    expect(original.nombre).toBe('cedula-1020304050.pdf');
  });

  it('no modifica la información de documentos ajenos a RUND', () => {
    const doc = { id: 'otro-1', nombre: 'Documento general.pdf', categoria: 'otros', url_archivo: '/uploads/otro.pdf' };
    expect(protectRundFolderDocument(doc, { roles: ['DOCENTE'] })).toBe(doc);
  });

  it('reconoce documentos RUND históricos con categoría en mayúsculas', () => {
    expect(protectRundFolderDocument({ categoria: 'RUND', nombre: '1020304050.pdf', url_archivo: '/original.pdf' }, { roles: ['ADMIN'] }).url_archivo).toBeNull();
  });

  it('retirar un soporte conserva la restricción de su URL antigua aunque ya no esté en la carpeta', async () => {
    // La bitácora vive en rund-service: el fake de RUND recuerda qué recursos quedaron protegidos.
    const protectedIds = new Set<string>();
    const db = { query: jest.fn(async () => []) };
    const rund = {
      registrarAcceso: jest.fn(async (acceso: any) => { protectedIds.add(acceso.recursoId); }),
      esOriginalRund: jest.fn(async (_url: string, recursoId: string) => protectedIds.has(recursoId)),
    };
    const repo = { findOne: jest.fn().mockResolvedValue({ id: 'doc-1', categoria: 'rund', urlArchivo: original.url_archivo }), delete: jest.fn().mockResolvedValue({ affected: 1 }) };
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service, { documentoRepo: repo, dataSource: db, rund });
    await service.deleteDocumento('doc-1', { sub: 'admin', roles: ['ADMIN'] });
    expect(repo.delete).toHaveBeenCalledWith('doc-1');
    expect(rund.registrarAcceso.mock.invocationCallOrder[0]).toBeLessThan(repo.delete.mock.invocationCallOrder[0]);
    const app = express(); app.use(rundFolderStaticAccess(db, jwt, rund));
    app.get('/uploads/{*path}', (_req, res) => res.send('original sensible'));
    const response = await request(app).get(original.url_archivo.replace('/auth/api/v1', '')).expect(401);
    expect(response.text).not.toContain('original sensible');
    await request(app).get('/uploads/carpeta-digital/persona/general.pdf').expect(200, 'original sensible');
  });

  it('no retira el registro RUND si falla el registro permanente de su protección', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ categoria: 'rund', urlArchivo: original.url_archivo }), delete: jest.fn() };
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service, { documentoRepo: repo, dataSource: { query: jest.fn() }, rund: { registrarAcceso: jest.fn().mockRejectedValue(new Error('rund caído')) } });
    await expect(service.deleteDocumento('doc-1')).rejects.toThrow('No fue posible registrar');
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('protege originales RUND cargados en auth y permite otros adjuntos', async () => {
    const db = { query: jest.fn(async (_sql: string, params: string[] = []) => (params[0]?.endsWith('/rund.pdf') ? [{ id_documento: 'doc-1' }] : [])) };
    const rund = { registrarAcceso: jest.fn().mockResolvedValue(undefined), esOriginalRund: jest.fn().mockResolvedValue(false) };
    const app = express(); app.use(rundFolderStaticAccess(db, jwt, rund));
    app.get('/uploads/{*path}', (_req, res) => res.send('original'));
    const path = '/uploads/carpeta-digital/persona/rund.pdf';
    await request(app).get(path).expect(401);
    await request(app).get(path).set('Cookie', `esap_access_token=${jwt.sign({ sub: 'user', roles: ['DOCENTE'] })}`).expect(403);
    await request(app).get(path).set('Authorization', `Bearer ${jwt.sign({ sub: 'user', roles: ['SUPER_ADMIN'] })}`).expect(200, 'original');
    await request(app).get('/uploads/carpeta-digital/persona/general.pdf').expect(200, 'original');
    expect(rund.registrarAcceso).toHaveBeenCalledTimes(3);
    // Un adjunto general no registrado en auth se le pregunta a RUND, que responde que no es original RUND.
    expect(rund.esOriginalRund).toHaveBeenCalledTimes(1);
  });

  it('el portal conserva acceso general y solo eleva visibilidad con JWT válido', async () => {
    const db = { query: jest.fn() };
    const rund = { registrarAcceso: jest.fn(), esOriginalRund: jest.fn() };
    const app = express(); app.use(rundFolderStaticAccess(db, jwt, rund));
    app.get('/portal/carpeta-digital/persona/documentos', (req, res) => res.json(protectRundFolderDocument(original, (req as any).user)));
    const url = '/portal/carpeta-digital/persona/documentos';
    const anon = await request(app).get(url).expect(200);
    expect(anon.body.url_archivo).toBeNull();
    const ggp = await request(app).get(url).set('Authorization', `Bearer ${jwt.sign({ sub: 'ggp', roles: ['GESTION_PROFESORAL'] })}`).expect(200);
    expect(ggp.body.url_archivo).toBe(original.url_archivo);
    expect(db.query).not.toHaveBeenCalled();
    expect(rund.esOriginalRund).not.toHaveBeenCalled();
  });

  it.each(['soporte', 'marca permanente'])('conserva la restricción del original histórico por %s al adoptar la API', async (origen) => {
    const db = { query: jest.fn(async (sql: string) => {
      if (sql.includes('to_regclass')) return [{ soportes: true, accesos: true }];
      if (sql.includes('FROM academic_work_plan."RundSoporteCampo"')) return origen === 'soporte' ? [{ id: 's1' }] : [];
      if (sql.includes('FROM academic_work_plan."RundAccesoDatosLog"')) return [{ id: 'marca' }];
      return [];
    }) };
    const rund = { registrarAcceso: jest.fn().mockResolvedValue(undefined), esOriginalRund: jest.fn().mockResolvedValue(false) };
    const app = express(); app.use(rundFolderStaticAccess(db, jwt, rund));
    app.get('/uploads/{*path}', (_req, res) => res.send('original sensible'));
    const path = '/uploads/carpeta-digital/persona/historico.pdf';
    const denied = await request(app).get(path).expect(401);
    expect(denied.text).not.toContain('original sensible');
    await request(app).get(path).set('Authorization', `Bearer ${jwt.sign({ sub: 'ggp', roles: ['GESTION_PROFESORAL'] })}`).expect(200, 'original sensible');
    expect(rund.registrarAcceso).toHaveBeenCalledTimes(2);
    expect(rund.esOriginalRund).not.toHaveBeenCalled();
    expect(db.query.mock.calls.every(([sql]) => !sql.includes('INSERT'))).toBe(true);
  });

  it('si falla la auditoría del propietario no entrega el original ni reintenta escribir en PTA', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ id_documento: 'doc-1' }]) };
    const rund = { registrarAcceso: jest.fn().mockRejectedValue(new Error('sin servicio')), esOriginalRund: jest.fn() };
    const app = express(); app.use(rundFolderStaticAccess(db, jwt, rund));
    app.get('/uploads/{*path}', (_req, res) => res.send('original sensible'));
    const result = await request(app).get('/uploads/carpeta-digital/persona/rund.pdf')
      .set('Authorization', `Bearer ${jwt.sign({ sub: 'ggp', roles: ['GESTION_PROFESORAL'] })}`).expect(503);
    expect(result.text).not.toContain('original sensible');
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(rund.registrarAcceso).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('reclasificar conserva funcionalidad general y protección RUND (%s)', async (rund) => {
    const doc = { id: 'doc-1', categoria: rund ? 'rund' : 'otros', nombre: '1020304050.pdf', urlArchivo: '/original.pdf', rundSoporteId: null };
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const repo = { findOne: jest.fn().mockResolvedValue(doc), save: jest.fn(async (value) => value) };
    const rundFake = { registrarAcceso: jest.fn().mockResolvedValue(undefined) };
    Object.assign(service, { documentoRepo: repo, tipoDocumentoRepo: { findOne: jest.fn().mockResolvedValue({ id: 'tipo-2', activo: true, carpetaDigitalId: null }) }, dataSource: { query: jest.fn().mockResolvedValue([]) }, rund: rundFake });
    const result = await service.reclassifyDocumento('doc-1', { categoria: 'FORMACION', tipoDocumentoId: 'tipo-2' }, { sub: 'admin', roles: ['ADMIN'] });
    expect(doc.tipoDocumentoId).toBe('tipo-2');
    expect(result.categoria).toBe(rund ? 'rund' : 'FORMACION');
    expect(result.url_archivo).toBe(rund ? null : '/original.pdf');
    expect(rundFake.registrarAcceso).toHaveBeenCalledTimes(rund ? 1 : 0);
  });
});
