import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConsolidacionService } from '../consolidacion.service';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { RutaRestringidaEntity } from '../../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../../entities/tickets/excepcion-tiquete.entity';
import { SaldoTiqueteEntity } from '../../../entities/tickets/saldo-tiquete.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';

/**
 * Suite de pruebas de la consolidación y cierre de expediente (RF-LIQ-004).
 *
 * Cubre los tres escenarios Gherkin de la HU:
 *   1. Consolidación exitosa de un expediente oportuno y completo.
 *   2. Rechazo por checklist de soportes incompleto (Contratista sin RUT).
 *   3. Validación de excepción aérea en rutas cortas restringidas.
 * Adicionalmente valida el bloqueo (400) ante un expediente ya consolidado.
 */

/** Base de expediente RADICADA y lista para consolidar. */
function crearExpedienteBase(overrides: Record<string, any> = {}) {
  return {
    id: 'sol-001',
    consecutivoUnico: 'COM-2026-0001',
    comisionadoId: 'com-001',
    comisionado: {
      id: 'com-001',
      numeroDocumento: '123456789',
      tipoComisionado: 'FUNCIONARIO',
    },
    destinoCiudad: 'Medellín',
    destinoDepartamento: 'Antioquia',
    fechaInicio: new Date('2026-10-01T00:00:00'),
    fechaFin: new Date('2026-10-05T00:00:00'),
    objetoComision: 'Comision institucional',
    prioridad: 'ALTA',
    rubroPresupuestal: 'Rubro 01',
    requiereTiquetes: false,
    montoViaticos: 700000,
    montoGastosViaje: 100000,
    diasComision: 5,
    estadoSolicitud: 'RADICADA',
    esInternacional: false,
    tipoComision: 'TERRESTRE',
    creadoPorUsuarioId: '00000000-0000-0000-0000-000000000000',
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    documentosSoporte: [],
    ...overrides,
  };
}

/** ConfigService que devuelve los documentos obligatorios según el rol. */
function configServiceMock(rol: string = 'FUNCIONARIO') {
  const obligatoriosPorRol: Record<string, string[]> = {
    FUNCIONARIO: ['CDP'],
    CONTRATISTA: ['CDP', 'RUT', 'CERT_BANCARIA', 'SEGURIDAD_SOCIAL', 'CONTRATO_SECOP'],
  };
  return {
    obtenerConfiguracionPorTipo: jest.fn().mockImplementation(
      (tipo: string) =>
        Promise.resolve({
          tipoComisionado: tipo,
          documentos: (obligatoriosPorRol[tipo] || ['CDP']).map((codigo) => ({
            tipoRequisito: 'OBLIGATORIO',
            tipoDocumentoSoporte: { codigo, nombre: codigo, descripcion: null },
          })),
        }),
    ),
  };
}

function pdf(codigo: string): DocumentoSoporteEntity {
  return {
    id: `doc-${codigo}`,
    solicitudId: 'sol-001',
    tipoDocumento: codigo,
    nombreArchivoOriginal: `${codigo}.pdf`,
    nombreArchivoSeguro: `${codigo}_seg.pdf`,
    urlRepositorio: `/uploads/sol-001/${codigo}_seg.pdf`,
    tipoMime: 'application/pdf',
    creadoEn: new Date(),
  } as DocumentoSoporteEntity;
}

/** Manager simulado dentro de la transacción ACID. */
function crearManager(mocks: {
  expediente?: any;
  rutas?: any[];
  excepciones?: any[];
  saldo?: any | null;
  onSave?: jest.Mock;
} = {}) {
  const manager: any = {
    createQueryBuilder: jest.fn().mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mocks.expediente ?? null),
    }),
    save: mocks.onSave ?? jest.fn().mockImplementation(async (_e: any, ent: any) => ent),
    create: jest.fn().mockImplementation((_entity: any, data: any) => data ?? {}),
    find: jest.fn().mockImplementation((entityClass: any) => {
      if (entityClass === RutaRestringidaEntity) return Promise.resolve(mocks.rutas ?? []);
      if (entityClass === ExcepcionTiqueteEntity) return Promise.resolve(mocks.excepciones ?? []);
      return Promise.resolve([]);
    }),
    findOne: jest.fn().mockImplementation((entityClass: any) => {
      // Carga de relaciones del expediente (ya bloqueado) vs. saldo de tiquetes.
      if (entityClass === SolicitudComisionEntity) {
        return Promise.resolve(mocks.expediente ?? null);
      }
      return Promise.resolve(mocks.saldo !== undefined ? mocks.saldo : null);
    }),
  };
  return manager;
}

describe('ConsolidacionService', () => {
  let service: ConsolidacionService;

  const createModule = (overrides: {
    solicitudRepo?: any;
    documentoRepo?: any;
    rutaRepo?: any;
    excepcionRepo?: any;
    saldoRepo?: any;
    historialRepo?: any;
    dataSource?: any;
    configService?: any;
  } = {}) => {
    const {
      solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) },
      documentoRepo = {},
      rutaRepo = {},
      excepcionRepo = {},
      saldoRepo = { findOne: jest.fn().mockResolvedValue(null) },
      historialRepo = { create: jest.fn(), save: jest.fn() },
      dataSource = { transaction: jest.fn() },
      configService = configServiceMock('FUNCIONARIO'),
    } = overrides;

    return Test.createTestingModule({
      providers: [
        ConsolidacionService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: solicitudRepo },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: documentoRepo },
        { provide: getRepositoryToken(RutaRestringidaEntity), useValue: rutaRepo },
        { provide: getRepositoryToken(ExcepcionTiqueteEntity), useValue: excepcionRepo },
        { provide: getRepositoryToken(SaldoTiqueteEntity), useValue: saldoRepo },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: historialRepo,
        },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createModule();
    service = module.get<ConsolidacionService>(ConsolidacionService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('consolidarExpediente — Escenario 1: Consolidación exitosa', () => {
    it('debe pasar a SOLICITADO, registrar el historial y no mutar cuando todo es válido', async () => {
      const expediente = crearExpedienteBase({
        documentosSoporte: [pdf('CDP')],
      });

      const onSave = jest.fn().mockImplementation(async (_e: any, ent: any) => ent);
      const manager = crearManager({ expediente, onSave });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };

      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resultado = await svc.consolidarExpediente('sol-001', 'user-enlace-1');

      // Estado transicionado a SOLICITADO y respuesta de éxito.
      expect(resultado.success).toBe(true);
      expect(resultado.estadoSolicitud).toBe('SOLICITADO');
      expect(resultado.estadoAnterior).toBe('RADICADA');
      expect(resultado.consecutivoUnico).toBe('COM-2026-0001');

      // Se persistió la solicitud consolidada + el log del historial.
      expect(manager.save).toHaveBeenCalled();
      expect(expediente.estadoSolicitud).toBe('SOLICITADO');
    });

    it('debe registrar la transición en solicitudes_historial_estados', async () => {
      const expediente = crearExpedienteBase({ documentosSoporte: [pdf('CDP')] });
      const manager = crearManager({ expediente });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };

      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      await svc.consolidarExpediente('sol-001', 'user-enlace-1');

      const historialGuardado = manager.save.mock.calls.find(
        (call: any[]) => call[0] === SolicitudHistorialEstadoEntity,
      )?.[1];
      expect(historialGuardado).toBeDefined();
      expect(historialGuardado.solicitudId).toBe('sol-001');
      expect(historialGuardado.estadoAnterior).toBe('RADICADA');
      expect(historialGuardado.estadoNuevo).toBe('SOLICITADO');
      expect(historialGuardado.usuarioId).toBe('user-enlace-1');
    });
  });

  describe('consolidarExpediente — Escenario 2: Checklist incompleto (Contratista sin RUT)', () => {
    it('debe detener la transacción, mantener RADICADA y retornar 422 con el faltante', async () => {
      const expediente = crearExpedienteBase({
        comisionado: {
          id: 'com-002',
          numeroDocumento: '1004734004',
          tipoComisionado: 'CONTRATISTA',
        },
        // Falta el RUT obligatorio para contratista.
        documentosSoporte: [pdf('CDP'), pdf('CERT_BANCARIA'), pdf('SEGURIDAD_SOCIAL'), pdf('CONTRATO_SECOP')],
      });

      const onSave = jest.fn().mockImplementation(async (_e: any, ent: any) => ent);
      const manager = crearManager({ expediente, onSave });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };

      const module = await createModule({
        dataSource,
        configService: configServiceMock('CONTRATISTA'),
      });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const promesa = svc.consolidarExpediente('sol-001', 'user-enlace-1');
      await expect(promesa).rejects.toBeInstanceOf(HttpException);

      try {
        await promesa;
      } catch (error) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(422);
        const body = err.getResponse() as { success: boolean; errors: string[] };
        expect(body.success).toBe(false);
        expect(body.errors.some((e) => e.includes('RUT'))).toBe(true);
      }

      // No se transicionó: el expediente sigue RADICADA y no hubo save.
      expect(expediente.estadoSolicitud).toBe('RADICADA');
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('consolidarExpediente — Escenario 3: Excepción aérea en ruta corta', () => {
    it('debe emitir error 422 cuando la ruta restringida no tiene excepción RUTA_CORTA', async () => {
      const expediente = crearExpedienteBase({
        destinoCiudad: 'Ibagué',
        destinoDepartamento: 'Tolima',
        requiereTiquetes: true,
        documentosSoporte: [pdf('CDP')],
      });

      // Ruta restringida Bogotá-Ibagué en catálogo y SIN excepción registrada.
      const manager = crearManager({
        expediente,
        rutas: [
          {
            id: 1,
            origenCiudad: 'IBAGUE',
            destinoCiudad: 'BOGOTA',
            descripcionRestriccion: 'Ruta corta restringida.',
            activo: true,
          },
        ],
        excepciones: [],
        saldo: { id: 'saldo-1', activo: true },
      });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };

      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const promesa = svc.consolidarExpediente('sol-001', 'user-enlace-1');
      await expect(promesa).rejects.toBeInstanceOf(HttpException);

      try {
        await promesa;
      } catch (error) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(422);
        const body = err.getResponse() as { errors: string[] };
        expect(
          body.errors.some((e) => /excepci|excepcion|ruta corta|soporte/i.test(e)),
        ).toBe(true);
      }
      expect(expediente.estadoSolicitud).toBe('RADICADA');
    });

    it('debe permitir la consolidación cuando existe la excepción RUTA_CORTA con PDF', async () => {
      const expediente = crearExpedienteBase({
        destinoCiudad: 'Ibagué',
        destinoDepartamento: 'Tolima',
        requiereTiquetes: true,
        documentosSoporte: [pdf('CDP')],
      });

      const manager = crearManager({
        expediente,
        rutas: [
          {
            id: 1,
            origenCiudad: 'IBAGUE',
            destinoCiudad: 'BOGOTA',
            descripcionRestriccion: 'Ruta corta restringida.',
            activo: true,
          },
        ],
        excepciones: [
          {
            id: 'exc-1',
            solicitudId: 'sol-001',
            tipoExcepcion: 'RUTA_CORTA',
            numeroDocumentoSoporte: 'RES-023-2026',
            documentoSoporteUrl: 'data:application/pdf;base64,xxx',
          },
        ],
        saldo: { id: 'saldo-1', activo: true },
      });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };

      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resultado = await svc.consolidarExpediente('sol-001', 'user-enlace-1');
      expect(resultado.estadoSolicitud).toBe('SOLICITADO');
      expect(expediente.estadoSolicitud).toBe('SOLICITADO');
    });
  });

  describe('consolidarExpediente — Bloqueos', () => {
    it('debe lanzar 404 cuando el expediente no existe', async () => {
      const manager = crearManager({ expediente: null });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };
      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      await expect(svc.consolidarExpediente('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar 400 cuando el expediente ya está consolidado (SOLICITADO)', async () => {
      const expediente = crearExpedienteBase({ estadoSolicitud: 'SOLICITADO' });
      const manager = crearManager({ expediente });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };
      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      await expect(svc.consolidarExpediente('sol-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar 400 cuando el expediente aún no está radicado (PENDIENTE)', async () => {
      const expediente = crearExpedienteBase({ estadoSolicitud: 'PENDIENTE' });
      const manager = crearManager({ expediente });
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
      };
      const module = await createModule({ dataSource });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      await expect(svc.consolidarExpediente('sol-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenerResumenConsolidacion', () => {
    it('debe devolver esConsolidable=false y errores cuando falta un soporte', async () => {
      const expediente = crearExpedienteBase({
        comisionado: {
          id: 'com-002',
          numeroDocumento: '1004734004',
          tipoComisionado: 'CONTRATISTA',
        },
        documentosSoporte: [pdf('CDP'), pdf('CERT_BANCARIA')],
      });

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(expediente),
      };
      const module = await createModule({
        solicitudRepo,
        configService: configServiceMock('CONTRATISTA'),
      });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resumen = await svc.obtenerResumenConsolidacion('sol-001');

      expect(resumen.esConsolidable).toBe(false);
      expect(resumen.errores.some((e) => e.includes('RUT'))).toBe(true);
      expect(resumen.documentos.find((d) => d.codigo === 'RUT')?.cargado).toBe(false);
    });

    it('debe devolver esConsolidable=true cuando el expediente está completo', async () => {
      const expediente = crearExpedienteBase({
        documentosSoporte: [pdf('CDP')],
      });

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(expediente),
      };
      const module = await createModule({
        solicitudRepo,
        configService: configServiceMock('FUNCIONARIO'),
      });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resumen = await svc.obtenerResumenConsolidacion('sol-001');
      expect(resumen.esConsolidable).toBe(true);
      expect(resumen.errores).toHaveLength(0);
    });
  });

  describe('Validación DINÁMICA de campos del Formato 023 (config_tipo_comisionado)', () => {
    it('debe exigir únicamente los campos parametrizados como obligatorios', async () => {
      const expediente = crearExpedienteBase({
        destinoCiudad: '',
        destinoDepartamento: '',
        documentosSoporte: [pdf('CDP')],
      });
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          tipoComisionado: 'FUNCIONARIO',
          camposObligatorios: [
            'destinoCiudad',
            'destinoDepartamento',
            'objetoComision',
          ],
          camposOpcionales: [],
          camposOcultos: [],
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP' },
            },
          ],
        }),
      };
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(expediente) };
      const module = await createModule({ solicitudRepo, configService });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resumen = await svc.obtenerResumenConsolidacion('sol-001');
      expect(resumen.esConsolidable).toBe(false);
      expect(resumen.errores.some((e) => e.includes('Ciudad de destino'))).toBe(true);
      expect(
        resumen.errores.some((e) => e.includes('Departamento de destino')),
      ).toBe(true);
      // El objeto sí está diligenciado: no debe reportarse como faltante.
      expect(resumen.errores.some((e) => e.includes('Objeto'))).toBe(false);
    });

    it('debe respetar camposOpcionales y camposOcultos (no exigir esos campos)', async () => {
      const expediente = crearExpedienteBase({
        destinoCiudad: '',
        destinoDepartamento: '',
        documentosSoporte: [pdf('CDP')],
      });
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          tipoComisionado: 'FUNCIONARIO',
          camposObligatorios: ['destinoCiudad', 'destinoDepartamento'],
          camposOpcionales: ['destinoCiudad'],
          camposOcultos: ['destinoDepartamento'],
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP' },
            },
          ],
        }),
      };
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(expediente) };
      const module = await createModule({ solicitudRepo, configService });
      const svc = module.get<ConsolidacionService>(ConsolidacionService);

      const resumen = await svc.obtenerResumenConsolidacion('sol-001');
      // Ciudad es opcional y departamento está oculto => no bloquean la consolidación.
      expect(resumen.esConsolidable).toBe(true);
    });
  });
});
