import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { RundExtraccionController } from './rund-extraccion.controller';
import { RundExtraccionService } from './rund-extraccion.service';
import { RundDocumentosService } from './rund-documentos.service';
import { RundPtaJwtGuard } from './rund-pta-consulta.controller';
import { RUND_PERMISSIONS as P } from './rund-permissions';

describe('Separación de preparación y aprobación RUND por HTTP', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const suggestionId = '22222222-2222-4222-8222-222222222222';
  let app: INestApplication;
  let role: string;
  let additionalRoles: string[];
  let subjectOnly: boolean;
  const granted: Record<string, string[]> = {
    CARGADOR: [P.VIEW, P.EDIT, P.DOCUMENTS_MANAGE, P.SENSITIVE_VIEW],
    APROBADOR: [P.VIEW, P.VALIDATE, P.SENSITIVE_VIEW],
    GESTION_PROFESORAL: [P.VIEW, P.EDIT, P.DOCUMENTS_MANAGE, P.SENSITIVE_VIEW],
    CONSULTOR: [P.VIEW],
    RUND_CARGADOR: [P.CARGADOR],
    RUND_APROBADOR: [P.REVISOR],
    RUND_INCORPORADOR: [P.INCORPORADOR],
    CARGADOR_REVISOR: [P.CARGADOR, P.REVISOR],
  };
  const service = {
    list: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pages: 1 }),
    aprobarBloque: jest.fn().mockResolvedValue({ estado: 'Aprobado' }),
    devolverBloque: jest.fn().mockResolvedValue({ estado: 'Devuelto' }),
    revisarSoporte: jest.fn().mockResolvedValue({ estado: 'Aprobado' }),
    logSensitiveDataAccess: jest.fn(),
    logSensitiveResourceAccess: jest.fn(),
    getRegistrationHistory: jest.fn().mockResolvedValue({ data: [{ id, tipo: 'MASIVO', titulo: 'docentes.xlsx', responsable: 'Gestora de Prueba' }], total: 1, page: 1, pages: 1 }),
    getRegistrationHistoryDetail: jest.fn().mockResolvedValue({ event: { id, tipo: 'MASIVO', titulo: 'docentes.xlsx' },
      registros: [{ nombre: 'Docente de Prueba', documento_identidad: '1234567890' }], total: 1 }),
    upsertDocente: jest.fn().mockResolvedValue({ docenteId: id }),
    updateDocente: jest.fn().mockResolvedValue({ docenteId: id }),
    guardarIncorporacion: jest.fn().mockResolvedValue({ changed: true }),
    previewRegistroDeletion: jest.fn().mockResolvedValue({ total: 1, ids: [id], fingerprint: 'a'.repeat(64), registros: [] }),
    eliminarRegistros: jest.fn().mockResolvedValue({ eliminados: 1 }),
    bulkUpsert: jest.fn().mockResolvedValue({ total: 1, created: 1, updated: 0, unchanged: 0, errors: 0, results: [], errorDetails: [], soporteCargaMasivaId: id }),
  };
  const ocr = {
    list: jest.fn().mockResolvedValue({ jobs: [], enabled: true }),
    enqueue: jest.fn().mockResolvedValue({ queued: true }),
    confirm: jest.fn().mockResolvedValue({ confirmed: true }),
    discard: jest.fn().mockResolvedValue({ discarded: true }),
  };
  const documents = {
    create: jest.fn().mockResolvedValue({ id: 'version-ficticia' }),
    replace: jest.fn().mockResolvedValue({ id: 'version-ficticia-2' }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    protectMetadata: jest.fn(value => value),
    content: jest.fn().mockResolvedValue({ fileName: 'ficticio.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 fixture') }),
    assertIncorporationDocument: jest.fn().mockResolvedValue(undefined),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BancoDocentesController, RundExtraccionController],
      providers: [
        { provide: BancoDocentesService, useValue: service },
        { provide: RundExtraccionService, useValue: ocr },
        { provide: RundDocumentosService, useValue: documents },
        { provide: DocumentTypeValidatorService, useValue: {} },
        { provide: DataSource, useValue: { query: jest.fn(async (_sql: string, [roles]: string[][]) =>
          [...new Set(roles.flatMap(code => granted[code] || []))].map(code => ({ code }))) } },
      ],
    }).overrideGuard(RundPtaJwtGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    // Authentication alone is simulated. The RBAC guard resolves permissions normally.
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { [subjectOnly ? 'sub' : 'userId']: 'ACTOR_AUTENTICADO', roles: [role, ...additionalRoles] };
      next();
    });
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => { jest.clearAllMocks(); role = 'CARGADOR'; additionalRoles = []; subjectOnly = false; });

  it.each([
    ['RUND_CARGADOR', 201], ['RUND_APROBADOR', 403], ['RUND_INCORPORADOR', 403],
    ['CARGADOR', 403], ['CONSULTOR', 403], ['SIN_PERMISOS', 403], ['SUPER_ADMIN', 201],
  ])('la eliminación RUND requiere Cargador o administración: %s', async (profile, status) => {
    role = String(profile);
    for (const base of ['/banco-docentes', '/pta/banco-docentes']) {
      await request(app.getHttpServer()).post(`${base}/eliminacion/previsualizar`).send({ ids: [id] }).expect(Number(status));
      await request(app.getHttpServer()).post(`${base}/eliminacion/confirmar`).send({ ids: [id], actorId: 'IMPOSTOR' }).expect(Number(status));
    }
    if (status === 201) expect(service.eliminarRegistros).toHaveBeenCalledWith(expect.anything(), 'ACTOR_AUTENTICADO', expect.anything());
    else { expect(service.previewRegistroDeletion).not.toHaveBeenCalled(); expect(service.eliminarRegistros).not.toHaveBeenCalled(); }
  });

  it('registra la carga del Super Admin con su identidad autenticada y no con el actor enviado en el formulario', async () => {
    role = 'SUPER_ADMIN';
    await request(app.getHttpServer()).post('/pta/banco-docentes/bulk?periodo_carga=2026-2')
      .field('actorId', 'SISTEMA').field('cargadoPor', 'SISTEMA')
      .attach('file', Buffer.from('DOCUMENTO_IDENTIDAD,NOMBRE_COMPLETO,VINCULACION\nTEST-1,Persona de prueba,OCASIONAL'), 'docentes.csv').expect(201);
    expect(service.bulkUpsert).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      actorId: 'ACTOR_AUTENTICADO', periodoCarga: '2026-2', support: expect.objectContaining({ fileName: 'docentes.csv' }),
    }));
  });

  it.each(['RUND_CARGADOR', 'RUND_APROBADOR', 'RUND_INCORPORADOR'])('%s consulta trazabilidad y sus detalles sin recibir permisos de escritura', async assignedRole => {
    role = assignedRole;
    const result = await request(app.getHttpServer()).get('/pta/banco-docentes/trazabilidad?periodoCarga=2026-2').expect(200);
    expect(result.body.data.data[0].responsable).toBe('Gestora de Prueba');
    expect(service.getRegistrationHistory).toHaveBeenCalledWith({ periodoCarga: '2026-2' });
    const detail = await request(app.getHttpServer()).get(`/pta/banco-docentes/trazabilidad/MASIVO/${id}?periodoCarga=2026-2`).expect(200);
    expect(detail.body.data.registros[0].documento_identidad).toBe('1234567890');
    expect(service.list).not.toHaveBeenCalled();
    expect(service.upsertDocente).not.toHaveBeenCalled();
  });

  it('la consulta sin datos sensibles enmascara documentos y nombres de archivos; no permite descargar el original', async () => {
    role = 'CONSULTOR';
    const list = await request(app.getHttpServer()).get('/pta/banco-docentes/trazabilidad').expect(200);
    expect(list.body.data.data[0].titulo).toBe('Archivo de carga RUND');
    const detail = await request(app.getHttpServer()).get(`/pta/banco-docentes/trazabilidad/MASIVO/${id}`).expect(200);
    expect(detail.body.data.registros[0].documento_identidad).toBe('******7890');
    await request(app.getHttpServer()).get(`/pta/banco-docentes/bulk/${id}/soporte`).expect(403);
  });

  it('sin permiso RUND no consulta la nueva trazabilidad por ninguno de sus alias', async () => {
    role = 'SIN_PERMISOS';
    for (const base of ['/banco-docentes','/pta/banco-docentes']) {
      await request(app.getHttpServer()).get(`${base}/trazabilidad`).expect(403);
      await request(app.getHttpServer()).get(`${base}/trazabilidad/MASIVO/${id}`).expect(403);
    }
    expect(service.getRegistrationHistory).not.toHaveBeenCalled();
    expect(service.getRegistrationHistoryDetail).not.toHaveBeenCalled();
  });

  it('combina permisos procedentes de varios roles de una misma persona', async () => {
    role = 'RUND_CARGADOR'; additionalRoles = ['RUND_APROBADOR', 'RUND_INCORPORADOR'];
    await request(app.getHttpServer()).post('/pta/banco-docentes').send({}).expect(201);
    for (const block of ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/${block}/aprobar`).send({ blockVersion: 1 }).expect(201);
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/${block}/devolver`).send({ blockVersion: 2, observacion: 'Corrija los datos' }).expect(201);
    }
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/incorporacion`).send({}).expect(201);
    expect(service.aprobarBloque).toHaveBeenCalledTimes(6);
    expect(service.devolverBloque).toHaveBeenCalledTimes(6);
  });

  it.each(['RUND_CARGADOR', 'RUND_INCORPORADOR', 'SIN_PERMISOS'])('%s no aprueba ni devuelve por ninguna pestaña o alias aunque envíe permisos falsos', async assignedRole => {
    role = assignedRole;
    const forged = { roles: ['SUPER_ADMIN'], permissions: [P.REVISOR, P.MANAGE], rundPermissions: [P.MANAGE], actorId: 'OTRO', blockVersion: 1 };
    for (const base of ['/banco-docentes', '/pta/banco-docentes']) {
      for (const block of ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
        for (const action of ['aprobar', 'devolver', `soportes/${id}/revision`]) {
          await request(app.getHttpServer()).post(`${base}/${id}/bloques/${block}/${action}`).send(forged).expect(403);
        }
      }
    }
    expect(service.aprobarBloque).not.toHaveBeenCalled();
    expect(service.devolverBloque).not.toHaveBeenCalled();
    expect(service.revisarSoporte).not.toHaveBeenCalled();
  });

  it('la carga y edición atribuyen el actor al sub de la sesión, no al body', async () => {
    role = 'RUND_CARGADOR'; subjectOnly = true;
    const forged = { actorId: 'USUARIO_FALSO', cargadoPor: 'USUARIO_FALSO' };
    await request(app.getHttpServer()).post('/pta/banco-docentes').send(forged).expect(201);
    await request(app.getHttpServer()).put(`/pta/banco-docentes/${id}`).send(forged).expect(200);
    expect(service.upsertDocente).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'ACTOR_AUTENTICADO', cargadoPor: 'ACTOR_AUTENTICADO' }), expect.anything());
    expect(service.updateDocente).toHaveBeenCalledWith(id, expect.objectContaining({ actorId: 'ACTOR_AUTENTICADO', cargadoPor: 'ACTOR_AUTENTICADO' }));
  });

  it.each(['reemplazo', 'eliminacion'])('el incorporador no modifica un documento de otra sección mediante %s', async action => {
    role = 'RUND_INCORPORADOR';
    documents.assertIncorporationDocument.mockRejectedValueOnce(new ForbiddenException('Solo contratos y actos de vinculación.'));
    if (action === 'reemplazo') {
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/documentos/${id}/reemplazo`)
        .field('bloque', 'VINCULACION').field('tipoSoporte', 'contrato')
        .attach('file', Buffer.from('%PDF-1.7 ficticio'), 'falso-contrato.pdf').expect(403);
    } else await request(app.getHttpServer()).delete(`/pta/banco-docentes/${id}/documentos/${id}`).expect(403);
    expect(documents.assertIncorporationDocument).toHaveBeenCalledWith(id, id);
    expect(documents.replace).not.toHaveBeenCalled();
    expect(documents.remove).not.toHaveBeenCalled();
  });

  it.each(['SUPER_ADMIN', 'super_admin', 'CARGADOR_REVISOR'])('%s puede cargar y revisar con la misma sesión autenticada', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/documentos`)
      .field('categoria', 'IDENTIDAD').field('bloque', 'IDENTIDAD').field('tipoSoporte', 'documento_identidad')
      .attach('file', Buffer.from('%PDF-1.7 ficticio'), 'identidad.pdf').expect(201);
    expect(documents.create).toHaveBeenCalledWith(id, expect.anything(), expect.anything(), 'ACTOR_AUTENTICADO', expect.anything());
    for (const estado of ['Aprobado', 'Rechazado']) {
      const decision = { estado, campo: 'NOMBRE_COMPLETO', documentoVersionId: id, blockVersion: 1, observacion: 'Verificado en el soporte' };
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/soportes/${id}/revision`).send(decision).expect(201);
      expect(service.revisarSoporte).toHaveBeenLastCalledWith(id, 'IDENTIDAD', id, decision, 'ACTOR_AUTENTICADO', expect.anything());
    }
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/aprobar`).send({ blockVersion: 1 }).expect(201);
    expect(service.aprobarBloque).toHaveBeenCalledWith(id, 'IDENTIDAD', 'ACTOR_AUTENTICADO', expect.anything(), 1);
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/devolver`)
      .send({ blockVersion: 2, observacion: 'Corrija el soporte' }).expect(201);
    expect(service.devolverBloque).toHaveBeenCalledWith(id, 'IDENTIDAD', 'ACTOR_AUTENTICADO', 'Corrija el soporte', expect.anything(), 2);
  });

  it.each(['RUND_CARGADOR', 'RUND_APROBADOR', 'RUND_INCORPORADOR'])('un solo permiso de %s permite consultar originales', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).get(`/pta/banco-docentes/${id}/documentos/${id}/contenido`).expect(200);
    expect(documents.content).toHaveBeenCalledWith(id, id, expect.objectContaining({ fullAccess: true }));
  });

  it('el perfil Cargador registra docentes sin recibir administración general', async () => {
    role = 'RUND_CARGADOR';
    await request(app.getHttpServer()).post('/pta/banco-docentes').send({ actorId: 'falso' }).expect(201);
    expect(service.upsertDocente).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'ACTOR_AUTENTICADO' }), expect.anything());
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/aprobar`).send({}).expect(403);
    await request(app.getHttpServer()).put(`/pta/banco-docentes/${id}/estado`).send({ estado: 'ACTIVO' }).expect(403);
  });

  it.each(['RUND_APROBADOR','RUND_INCORPORADOR'])('%s no crea ni importa aspirantes', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).post('/pta/banco-docentes').send({}).expect(403);
    await request(app.getHttpServer()).post('/pta/banco-docentes/bulk').send({}).expect(403);
    expect(service.upsertDocente).not.toHaveBeenCalled();
  });

  it('incorporación permite su acción específica, no edición general, aprobación ni OCR', async () => {
    role = 'RUND_INCORPORADOR';
    const body = { numeroContrato: 'CONTRATO DE PRUEBA', fechaContratacion: '2026-01-01' };
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/incorporacion`).send(body).expect(201);
    expect(service.guardarIncorporacion).toHaveBeenCalledWith(id, body, 'ACTOR_AUTENTICADO', expect.anything());
    for (const url of [`/pta/banco-docentes/${id}/bloques/VINCULACION/aprobar`, `/pta/banco-docentes/${id}/extracciones/sugerencias/${suggestionId}/confirmar`]) {
      await request(app.getHttpServer()).post(url).send({}).expect(403);
    }
    await request(app.getHttpServer()).put(`/pta/banco-docentes/${id}`).send({ escalafon: 'Titular' }).expect(403);
    await request(app.getHttpServer()).put(`/pta/banco-docentes/${id}/estado`).send({ estado: 'ACTIVO' }).expect(403);
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/documentos`).field('categoria','CONTRATOS').field('bloque','VINCULACION').field('tipoSoporte','contrato')
      .attach('file', Buffer.from('%PDF-1.7 ficticio'), 'contrato.pdf').expect(201);
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/documentos`).field('categoria','IDENTIDAD').field('bloque','IDENTIDAD').field('tipoSoporte','documento_identidad')
      .attach('file', Buffer.from('%PDF-1.7 ficticio'), 'identidad.pdf').expect(403);
  });

  it.each(['RUND_CARGADOR','RUND_APROBADOR'])('%s no recibe la acción de incorporación por sus otras facultades', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/incorporacion`).send({}).expect(403);
    expect(service.guardarIncorporacion).not.toHaveBeenCalled();
  });

  it.each(['CARGADOR', 'APROBADOR'])('permite consultar evidencia OCR a %s', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).get(`/pta/banco-docentes/${id}/extracciones`).expect(200);
    expect(ocr.list).toHaveBeenCalledWith(id, expect.objectContaining({ fullAccess: true }));
  });
  it('el cargador corrige el OCR pero no aprueba ni devuelve bloques o soportes', async () => {
    const correction = { valorCorregido: 'Dato corregido', motivo: 'Verificado en el PDF' };
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/extracciones/sugerencias/${suggestionId}/confirmar`).send(correction).expect(201);
    expect(ocr.confirm).toHaveBeenCalledWith(id, suggestionId, expect.objectContaining({ actorId: 'ACTOR_AUTENTICADO' }), correction);
    for (const action of ['aprobar', 'devolver', 'soportes/soporte/revision']) {
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/${action}`).send({ blockVersion: 1 }).expect(403);
    }
    expect(service.aprobarBloque).not.toHaveBeenCalled();
    expect(service.revisarSoporte).not.toHaveBeenCalled();
  });
  it('el aprobador valida filas y bloques pero no modifica el OCR ni carga archivos', async () => {
    role = 'APROBADOR';
    for (const action of ['aprobar', 'devolver', 'soportes/soporte/revision']) {
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/${action}`).send({ blockVersion: 1, observacion: 'Corrija el documento' }).expect(201);
    }
    for (const action of [`sugerencias/${suggestionId}/confirmar`, `sugerencias/${suggestionId}/descartar`, `documentos/${id}`]) {
      await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/extracciones/${action}`).send({}).expect(403);
    }
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/soportes`).expect(403);
    expect(ocr.confirm).not.toHaveBeenCalled();
    expect(ocr.enqueue).not.toHaveBeenCalled();
  });
  it('quitar validate a GGP también impide aprobar por API', async () => {
    role = 'GESTION_PROFESORAL';
    await request(app.getHttpServer()).post(`/pta/banco-docentes/${id}/bloques/IDENTIDAD/aprobar`).send({ blockVersion: 1 }).expect(403);
  });
  it('consultar RUND no concede acceso implícito al contenido OCR sensible', async () => {
    role = 'CONSULTOR';
    await request(app.getHttpServer()).get(`/pta/banco-docentes/${id}/extracciones`).expect(403);
    expect(ocr.list).not.toHaveBeenCalled();
  });

  it.each(['/banco-docentes', '/pta/banco-docentes'])('el cargador puede cargar, reemplazar y retirar archivos por %s', async base => {
    const pdf = Buffer.from('%PDF-1.7\nDocumento ficticio\n%%EOF');
    await request(app.getHttpServer()).post(`${base}/${id}/documentos`).field('categoria', 'IDENTIDAD').attach('file', pdf, 'ficticio.pdf').expect(201);
    await request(app.getHttpServer()).post(`${base}/${id}/documentos/${id}/reemplazo`).attach('file', pdf, 'corregido.pdf').expect(201);
    await request(app.getHttpServer()).delete(`${base}/${id}/documentos/${id}`).expect(200);
    expect(documents.create).toHaveBeenCalledWith(id, expect.anything(), expect.objectContaining({ originalname: 'ficticio.pdf' }), 'ACTOR_AUTENTICADO', expect.anything());
    expect(documents.replace).toHaveBeenCalled();
    expect(documents.remove).toHaveBeenCalled();
  });

  it.each(['/banco-docentes', '/pta/banco-docentes'])('el aprobador no puede modificar perfiles, documentos ni estados por %s', async base => {
    role = 'APROBADOR';
    const fakeCapabilities = { roles: ['SUPER_ADMIN'], permissions: [P.MANAGE], rundPermissions: [P.MANAGE], aprobadorId: 'OTRA_PERSONA' };
    for (const url of [`${base}/${id}/documentos`, `${base}/${id}/documentos/${id}/reemplazo`, `${base}/${id}/bloques/IDENTIDAD/soportes`, `${base}/${id}/extracciones/trabajos/${id}/descartar`]) {
      await request(app.getHttpServer()).post(url).send(fakeCapabilities).expect(403);
    }
    await request(app.getHttpServer()).put(`${base}/${id}`).send(fakeCapabilities).expect(403);
    await request(app.getHttpServer()).delete(`${base}/${id}/documentos/${id}`).expect(403);
    expect(documents.create).not.toHaveBeenCalled();
    expect(documents.replace).not.toHaveBeenCalled();
    expect(documents.remove).not.toHaveBeenCalled();
  });

  it.each(['CARGADOR', 'APROBADOR'])('permite leer el PDF original a %s sin ampliar sus funciones', async assignedRole => {
    role = assignedRole;
    await request(app.getHttpServer()).get(`/pta/banco-docentes/${id}/documentos/${id}/contenido`).expect(200);
    expect(documents.content).toHaveBeenCalledWith(id, id, expect.objectContaining({ actorId: 'ACTOR_AUTENTICADO', fullAccess: true }));
    expect(documents.create).not.toHaveBeenCalled();
    expect(service.aprobarBloque).not.toHaveBeenCalled();
  });
});
