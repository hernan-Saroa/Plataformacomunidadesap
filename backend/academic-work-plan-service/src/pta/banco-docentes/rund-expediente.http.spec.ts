import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { RundDocumentosService } from './rund-documentos.service';

const originalDocumentalEnabled = process.env.RUND_DOCUMENTAL_ENABLED;
beforeEach(() => { process.env.RUND_DOCUMENTAL_ENABLED = 'true'; });
afterEach(() => {
  if (originalDocumentalEnabled === undefined) delete process.env.RUND_DOCUMENTAL_ENABLED;
  else process.env.RUND_DOCUMENTAL_ENABLED = originalDocumentalEnabled;
});

describe('API del expediente con el guard RBAC real', () => {
  let app: INestApplication;
  let user: any;
  const documents = {
    ensureExpediente: jest.fn().mockResolvedValue({ preparado: true }),
    create: jest.fn().mockResolvedValue({ id: 'archivo-id', rundSoporteId: 'soporte-id', contenidoUrl: '/contenido' }),
    protectMetadata: jest.fn((doc: any) => doc),
    getRetention: jest.fn().mockResolvedValue({ estado: 'PENDIENTE_TRD' }),
    manageRetention: jest.fn().mockResolvedValue({ estado: 'SUSPENDIDA' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [BancoDocentesController],
      providers: [
        { provide: BancoDocentesService, useValue: {} },
        { provide: RundDocumentosService, useValue: documents },
        { provide: DocumentTypeValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ validated: false }) } },
        { provide: DataSource, useValue: { query: jest.fn(async (_sql, [roles]) => roles.includes('GESTOR_CUSTOM')
          ? [{ code: 'banco-docentes.rund.documents.manage' }] : []) } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req: any, _res: any, next: any) => { req.user = user; next(); });
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { user = undefined; jest.clearAllMocks(); });

  it('rechaza anónimos y docentes sin permiso documental antes de preparar carpetas', async () => {
    await request(app.getHttpServer()).post('/pta/banco-docentes/docente/expediente').expect(403);
    user = { userId: 'docente-user', roles: ['DOCENTE'] };
    await request(app.getHttpServer()).post('/pta/banco-docentes/docente/expediente').expect(403);
    expect(documents.ensureExpediente).not.toHaveBeenCalled();
  });

  it.each(['GESTION_PROFESORAL', 'GESTOR_CUSTOM'])('autoriza %s y toma el actor de la sesión', async role => {
    user = { userId: 'actor-real', roles: [role] };
    await request(app.getHttpServer()).post('/pta/banco-docentes/docente/expediente').send({ actorId: 'falso' }).expect(201);
    expect(documents.ensureExpediente).toHaveBeenCalledWith('docente', 'actor-real', expect.any(String));
  });

  it('mantiene el ID de soporte esperado por los modales y recibe el archivo en memoria', async () => {
    user = { userId: 'ggp', roles: ['GESTION_PROFESORAL'] };
    const result = await request(app.getHttpServer()).post('/pta/banco-docentes/docente/bloques/TRANSVERSAL/soportes')
      .field('tipoSoporte', 'soporte_edicion_perfil').field('cargadoPor', 'falso')
      .attach('file', Buffer.from('%PDF-1.7'), { filename: 'soporte.pdf', contentType: 'application/pdf' }).expect(201);
    expect(result.body.data.id).toBe('soporte-id');
    expect(result.body.data.documentoPerfilId).toBe('archivo-id');
    expect(documents.create).toHaveBeenCalledWith('docente', expect.objectContaining({ tipoSoporte: 'soporte_edicion_perfil' }),
      expect.objectContaining({ buffer: expect.any(Buffer) }), 'ggp', expect.any(String));
  });

  it('reserva la gestión archivística a GGP/SuperAdmin y toma el actor de sesión', async () => {
    for (const role of ['DOCENTE', 'GESTOR_CUSTOM', 'ADMIN']) {
      user = { userId: 'actor', roles: [role] };
      await request(app.getHttpServer()).post('/pta/banco-docentes/docente/documentos/doc/retencion').send({ accion: 'SUSPENDER_RETENCION' }).expect(403);
    }
    user = { userId: 'actor-real', roles: ['GESTION_PROFESORAL'] };
    const body = { accion: 'SUSPENDER_RETENCION', motivo: 'Solicitud de archivo', actorId: 'falso' };
    await request(app.getHttpServer()).post('/pta/banco-docentes/docente/documentos/doc/retencion').send(body).expect(201);
    expect(documents.manageRetention).toHaveBeenCalledWith('docente', 'doc', body, 'actor-real', expect.any(String));
  });
});
