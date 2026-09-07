import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TravelExpensesService } from '../travel-expenses.service';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { ConfigService } from '../../config/config.service';

/**
 * Pruebas de inmutabilidad del expediente (RF-LIQ-004).
 *
 * Verifica que una vez el expediente queda en estado SOLICITADO (consolidado),
 * el rol Enlace de Dependencia NO puede subir ni eliminar documentos de
 * soporte (modo "Solo Lectura").
 */
describe('TravelExpensesService — Inmutabilidad del expediente consolidado', () => {
  let service: TravelExpensesService;

  const createModule = (overrides: {
    solicitudRepo?: any;
    documentoRepo?: any;
    dataSource?: any;
    configService?: any;
  } = {}) => {
    const {
      solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) },
      documentoRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
      },
      dataSource = { transaction: jest.fn() },
      configService = { obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null) },
    } = overrides;

    return Test.createTestingModule({
      providers: [
        TravelExpensesService,
        {
          provide: getRepositoryToken(ComisionadoEntity),
          useValue: { findOne: jest.fn().mockResolvedValue(null) },
        },
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: solicitudRepo },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: documentoRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createModule();
    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe bloquear la subida de documentos cuando el expediente está SOLICITADO (solo lectura)', async () => {
    const solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
      }),
    };
    const module = await createModule({ solicitudRepo });
    const svc = module.get<TravelExpensesService>(TravelExpensesService);

    await expect(
      svc.subirDocumento('sol-001', {
        tipoDocumento: 'RUT',
        file: {
          originalname: 'rut.pdf',
          mimetype: 'application/pdf',
          filename: 'rut-123.pdf',
        } as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe permitir la subida de documentos mientras el expediente está RADICADA (antes de consolidar)', async () => {
    const solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'RADICADA',
      }),
    };
    const documentoRepo = {
      create: jest.fn().mockImplementation((ent) => ent),
      save: jest.fn().mockImplementation(async (ent) => ent),
    };
    const module = await createModule({ solicitudRepo, documentoRepo });
    const svc = module.get<TravelExpensesService>(TravelExpensesService);

    const result = await svc.subirDocumento('sol-001', {
      tipoDocumento: 'RUT',
      file: {
        originalname: 'rut.pdf',
        mimetype: 'application/pdf',
        filename: 'rut-123.pdf',
      } as any,
    });

    expect(result.tipoDocumento).toBe('RUT');
    expect(documentoRepo.save).toHaveBeenCalled();
  });

  it('debe bloquear la eliminación de documentos cuando el expediente está SOLICITADO', async () => {
    const solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
      }),
    };
    const documentoRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'doc-1',
        solicitudId: 'sol-001',
        tipoDocumento: 'RUT',
        nombreArchivoSeguro: 'rut-123.pdf',
      }),
    };
    const module = await createModule({ solicitudRepo, documentoRepo });
    const svc = module.get<TravelExpensesService>(TravelExpensesService);

    await expect(svc.eliminarDocumento('sol-001', 'doc-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
