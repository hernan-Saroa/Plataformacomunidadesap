import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as xlsx from 'xlsx';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { BancoDocentesService } from './banco-docentes.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';
import { RundDocumentosService } from './rund-documentos.service';

describe('BancoDocentesController - flujo funcional REQ-RUND-F001', () => {
  let app: INestApplication;
  const service = {
    getById: jest.fn(),
    logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    upsertDocente: jest.fn(),
    updateDocente: jest.fn(),
    cambiarEstado: jest.fn(),
    bulkUpsert: jest.fn(),
    getBulkHistory: jest.fn(),
    getBulkSupport: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BancoDocentesController],
      providers: [
        { provide: BancoDocentesService, useValue: service },
        { provide: DocumentTypeValidatorService, useValue: {} },
        { provide: RundDocumentosService, useValue: {} },
      ],
    })
      .overrideGuard(BancoDocentesRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('consulta el perfil consolidado usando la cédula y el periodo', async () => {
    service.getById.mockResolvedValue({
      docente_id: '11111111-1111-4111-8111-111111111111',
      documento_identidad: '1020304050',
      nombre_completo: 'MARIA LOPEZ',
      periodo_carga: '2026-2',
      pregrado: 'Administración Pública',
      vinculacion: 'OCASIONAL',
    });

    const response = await request(app.getHttpServer())
      .get('/banco-docentes/1020304050')
      .query({ periodoCarga: '2026-2' })
      .expect(200);

    expect(service.getById).toHaveBeenCalledWith('1020304050', '2026-2');
    expect(response.body.data).toMatchObject({
      documento_identidad: '******4050',
      nombre_completo: 'MARIA LOPEZ',
      vinculacion: 'OCASIONAL',
      pregrado: 'Administración Pública',
    });
  });

  it('crea un perfil con contexto de auditoría dentro del upsert', async () => {
    service.upsertDocente.mockResolvedValue({
      action: 'insert',
      docenteId: '11111111-1111-4111-8111-111111111111',
      documentNumber: '1020304050',
    });

    await request(app.getHttpServer())
      .post('/banco-docentes')
      .send({ documentNumber: '1020304050', periodoCarga: '2026-2' })
      .expect(201);

    expect(service.upsertDocente).toHaveBeenCalledWith(
      expect.objectContaining({ documentNumber: '1020304050', canal_origen: 'MODAL' }),
      expect.objectContaining({
        rejectExisting: true,
        audit: expect.objectContaining({ accion: 'CREAR', canalOrigen: 'MODAL' }),
      }),
    );
  });

  it('edita y desactiva por cédula delegando las validaciones de soporte', async () => {
    service.updateDocente.mockResolvedValue({ action: 'update' });
    service.cambiarEstado.mockResolvedValue({ estado: 'INACTIVO', activo: false });

    await request(app.getHttpServer())
      .put('/banco-docentes/1020304050')
      .send({ soporteEdicionId: 'soporte-1', justificacionEdicion: 'Corrección documentada' })
      .expect(200);
    await request(app.getHttpServer())
      .put('/banco-docentes/1020304050/estado')
      .send({ soporteId: 'soporte-2', justificacion: 'Fin de la vinculación', estadoObjetivo: 'INACTIVO' })
      .expect(200);

    expect(service.updateDocente).toHaveBeenCalledWith('1020304050', expect.objectContaining({
      soporteEdicionId: 'soporte-1',
    }));
    expect(service.cambiarEstado).toHaveBeenCalledWith('1020304050', expect.objectContaining({
      estadoObjetivo: 'INACTIVO',
      soporteId: 'soporte-2',
    }));
  });

  it('conserva el Excel como soporte al ejecutar la carga masiva', async () => {
    service.bulkUpsert.mockResolvedValue({
      total: 1,
      created: 1,
      updated: 0,
      errors: 0,
      soporteCargaMasivaId: '22222222-2222-4222-8222-222222222222',
    });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'VINCULACION'],
      ['1020304050', 'MARIA LOPEZ', 'OCASIONAL'],
    ]), 'CARGA_DOCENTES');
    const file = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const response = await request(app.getHttpServer())
      .post('/banco-docentes/bulk')
      .query({ periodo_carga: '2026-2' })
      .attach('file', file, {
        filename: 'docentes-2026-2.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201);

    expect(response.body.data.soporteCargaMasivaId).toBe('22222222-2222-4222-8222-222222222222');
    expect(service.bulkUpsert).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      periodoCarga: '2026-2',
      support: expect.objectContaining({ fileName: 'docentes-2026-2.xlsx' }),
    }));
    expect(service.bulkUpsert.mock.calls[0][1].support.content).toBeInstanceOf(Buffer);
  });
});

