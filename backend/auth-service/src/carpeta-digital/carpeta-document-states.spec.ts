import { randomUUID } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { carpetaDocumentRevision } from './carpeta-document-revision';

describe('estados Auth ligados a la revisión persistida', () => {
  let service: any, doc: DocumentoCarpetaDigital, repo: any, db: any, manager: any, tipos: any;
  beforeEach(() => {
    doc = { id: randomUUID(), carpetaDigitalId: randomUUID(), tipoDocumentoId: null, categoria: 'personal', estado: 'validado',
      nombre: 'Original.pdf', urlArchivo: '/original.pdf', tamanoBytes: 8, validadoPor: randomUUID(), fechaValidacion: new Date('2026-10-01T00:00:00Z'),
      fechaSubida: new Date('2026-09-01T00:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z') } as DocumentoCarpetaDigital;
    repo = { findOne: jest.fn(async () => ({ ...doc })), save: jest.fn(async value => { doc = { ...value }; return doc; }), delete: jest.fn() };
    tipos = { findOne: jest.fn().mockResolvedValue({ id: randomUUID(), activo: true, carpetaDigitalId: null }) };
    manager = { getRepository: jest.fn(type => type === DocumentoCarpetaDigital ? repo : tipos), query: jest.fn().mockResolvedValue([]) };
    db = { transaction: jest.fn(work => work(manager)), query: jest.fn().mockResolvedValue([]) };
    service = Object.create(CarpetaDigitalService.prototype);
    Object.assign(service, { documentoRepo: repo, tipoDocumentoRepo: tipos, dataSource: db, documentVersions: { enabled: true, eligible: () => false } });
  });
  it.each(['validate', 'reclassify', 'delete'])('%s con una revisión antigua falla dentro del bloqueo sin guardar ni borrar', async action => {
    const before = { ...doc }, stale = 'a'.repeat(64);
    const work = action === 'validate' ? service.validateDocumento(doc.id, { estado: 'validado', revisionDocumento: stale })
      : action === 'reclassify' ? service.reclassifyDocumento(doc.id, { categoria: 'academico', revisionDocumento: stale }) : service.deleteDocumento(doc.id, undefined, stale);
    await expect(work).rejects.toBeInstanceOf(ConflictException); expect(doc).toEqual(before);
    expect(repo.save).not.toHaveBeenCalled(); expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: doc.id }, lock: { mode: 'pessimistic_write' } });
  });
  it('reclasificar reinicia aprobación y mantiene bytes, identidad y comentarios anteriores', async () => {
    doc.comentarios = 'Observación anterior';
    const before = { ...doc }, revision = carpetaDocumentRevision(doc);
    const saved = await service.reclassifyDocumento(doc.id, { categoria: 'academico', revisionDocumento: revision });
    expect(saved).toMatchObject({ id: before.id, estado: 'pendiente', categoria: 'academico', validado_por: null, fecha_validacion: null, url_archivo: before.urlArchivo, comentarios: before.comentarios });
    expect(saved.revision_documento).not.toBe(revision);
  });
  it('reclasificar al mismo tipo/categoría conserva aprobación y no reescribe el documento', async () => {
    const revision = carpetaDocumentRevision(doc), before = { ...doc };
    const result = await service.reclassifyDocumento(doc.id, { categoria: doc.categoria, revisionDocumento: revision });
    expect(result.estado).toBe('validado'); expect(result.revision_documento).toBe(revision); expect(doc).toEqual(before); expect(repo.save).not.toHaveBeenCalled();
  });
  it('un tipo individual de otra carpeta no modifica el documento', async () => {
    tipos.findOne.mockResolvedValue({ id: randomUUID(), activo: true, carpetaDigitalId: randomUUID() });
    await expect(service.reclassifyDocumento(doc.id, { tipoDocumentoId: randomUUID(), revisionDocumento: carpetaDocumentRevision(doc) })).rejects.toThrow('no está disponible');
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('cambiar el tipo sin cambiar categoría también reinicia aprobación', async () => {
    const tipo = randomUUID(), revision = carpetaDocumentRevision(doc);
    expect(await service.reclassifyDocumento(doc.id, { tipoDocumentoId: tipo, revisionDocumento: revision })).toMatchObject({ tipo_documento_id: tipo, estado: 'pendiente', validado_por: null });
  });
  it('la revisión de otro documento no sirve aunque comparta el mismo original', async () => {
    const other = { ...doc, id: randomUUID() };
    await expect(service.validateDocumento(doc.id, { estado: 'validado', revisionDocumento: carpetaDocumentRevision(other) })).rejects.toThrow('Actualice');
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('una revisión general anterior no permite decidir sobre un documento que pasó al flujo RUND', async () => {
    const revisionDocumento = carpetaDocumentRevision(doc); doc.categoria = 'RUND';
    await expect(service.validateDocumento(doc.id, { estado: 'validado', revisionDocumento })).rejects.toThrow('Actualice');
    expect(repo.save).not.toHaveBeenCalled(); expect(manager.query).not.toHaveBeenCalled();
  });
  it('un cliente anterior sigue funcionando con historial apagado; una revisión enviada sigue siendo vinculante', async () => {
    service.documentVersions.enabled = false;
    await expect(service.validateDocumento(doc.id, { estado: 'rechazado' })).resolves.toMatchObject({ estado: 'rechazado' });
    expect(db.transaction).not.toHaveBeenCalled();
    repo.save.mockClear();
    await expect(service.validateDocumento(doc.id, { estado: 'validado', revisionDocumento: 'a'.repeat(64) })).rejects.toThrow('Actualice');
    expect(db.transaction).toHaveBeenCalledTimes(1); expect(repo.save).not.toHaveBeenCalled();
  });
  it('metadatos requieren revisión solo en Auth general; no fabrica revisiones de RUND', () => {
    expect(service.toDocumentoDto(doc)).toMatchObject({ requiere_revision_documento: true, revision_documento: carpetaDocumentRevision(doc) });
    doc.categoria = 'RUND';
    expect(service.toDocumentoDto(doc)).toMatchObject({ requiere_revision_documento: false, revision_documento: null });
  });
});
