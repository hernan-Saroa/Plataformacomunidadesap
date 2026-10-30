import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { TipoFirmaAprobacion } from '../../../dto/firmar-solicitud.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';

describe('Regla Institucional: VoBo y Justificación para Comisiones > 3 Días Calendario (3.5 Días Valor)', () => {
  let service: TravelExpensesService;
  let solicitudRepo: any;
  let comisionadoRepo: any;
  let documentoRepo: any;
  let historialRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    solicitudRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      createQueryBuilder: jest.fn(),
    };
    comisionadoRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    documentoRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    historialRepo = {
      save: jest.fn().mockImplementation((h) => Promise.resolve({ id: 'hist-1', ...h })),
    };
    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudHistorialEstadoEntity) return historialRepo;
        if (entity === SolicitudComisionEntity) return solicitudRepo;
        return { save: jest.fn() };
      }),
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpensesService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: solicitudRepo },
        { provide: getRepositoryToken(ComisionadoEntity), useValue: comisionadoRepo },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: documentoRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            obtenerJornadaLaboralActiva: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            send: jest.fn().mockResolvedValue(undefined),
            sendMany: jest.fn().mockResolvedValue(undefined),
            sendEmail: jest.fn().mockResolvedValue(undefined),
            notifyByPermission: jest.fn().mockResolvedValue(undefined),
            notifyEnvioAFirmas023: jest.fn().mockResolvedValue(undefined),
            getRecipientsByPermissions: jest.fn().mockResolvedValue([]),
            getRecipientsByPermission: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  describe('evaluarRequisitoVoBoDuracion', () => {
    it('1. Debe exigir VoBo para funcionario administrativo con duración de 4 días calendario (3.5 días valor)', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-10'),
        fechaFin: new Date('2026-11-13'), // 4 días calendario
        diasComision: 3.5,
        diasPernoctados: 3,
        diasNoPernoctados: 1,
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Profesional Universitario' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Subdirección de Gestión Corporativa');
      expect(res.aplica).toBe(true);
      expect(res.diasCalendario).toBe(4);
      expect(res.diasValor).toBe(3.5);
      expect(res.instanciaVoBo).toBe('DIRECCION_NACIONAL');
      expect(res.tituloInstancia).toBe('Dirección Nacional');
      expect(res.esEximidoDocente).toBe(false);
    });

    it('2. Debe exigir VoBo de Director Territorial para contratista en sede territorial con > 3 días calendario', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'), // 5 días calendario
        diasComision: 4.5,
        comisionado: { tipoComisionado: 'CONTRATISTA', cargo: 'Contratista de Apoyo a la Gestión' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Dirección Territorial Antioquia');
      expect(res.aplica).toBe(true);
      expect(res.instanciaVoBo).toBe('DIRECTOR_TERRITORIAL');
      expect(res.tituloInstancia).toBe('Director Territorial');
    });

    it('3. Debe exigir VoBo para estudiante (auxilio económico) con duración superior a 3 días', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-04'),
        diasComision: 3.5,
        comisionado: { tipoComisionado: 'ESTUDIANTE', cargo: 'Estudiante de Pregrado' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Facultad de Pregrado');
      expect(res.aplica).toBe(true);
    });

    it('4. Debe eximir a docente y docente capacitador cuando su actividad es dictar clase o cátedra', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-06'), // 6 días
        diasComision: 5.5,
        objetoComision: 'Dictar cátedra presencial del módulo de Gestión Pública Territorial',
        comisionado: { tipoComisionado: 'DOCENTE', cargo: 'Docente Ocasional' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Subdirección Académica');
      expect(res.aplica).toBe(false);
      expect(res.esEximidoDocente).toBe(true);
      expect(res.motivo).toContain('Docente o docente capacitador eximido');
    });

    it('5. Debe eximir a docente cuando presenta justificación detallada en la agenda', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'),
        diasComision: 4.5,
        objetoComision: 'Acompañamiento a semillero de investigación',
        camposAdicionales: {
          agenda: 'Desarrollo de talleres académicos y sustentaciones de trabajos de grado con estudiantes.',
        },
        comisionado: { tipoComisionado: 'DOCENTE', cargo: 'Docente de Planta' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Subdirección Académica');
      expect(res.aplica).toBe(false);
      expect(res.esEximidoDocente).toBe(true);
    });

    it('6. NO debe eximir a docente si no va a dictar clase y no presenta justificación en agenda', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'),
        diasComision: 4.5,
        objetoComision: 'Reunión administrativa de empalme',
        camposAdicionales: {},
        comisionado: { tipoComisionado: 'DOCENTE', cargo: 'Docente Catedrático' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Sede Central');
      expect(res.aplica).toBe(true);
      expect(res.esEximidoDocente).toBe(false);
    });

    it('7. NO debe aplicar la regla si la comisión dura 3 días o menos (2.5 días valor o menos)', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-03'), // 3 días
        diasComision: 2.5,
        diasPernoctados: 2,
        diasNoPernoctados: 1,
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Asesor' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Dirección General');
      expect(res.aplica).toBe(false);
      expect(res.motivo).toContain('no supera tres (3) días calendario');
    });

    it('8. NO debe aplicar a comisiones internacionales', () => {
      const solicitud: Partial<SolicitudComisionEntity> = {
        esInternacional: true,
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-10'),
        diasComision: 9.5,
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Director' } as any,
      };

      const res = service.evaluarRequisitoVoBoDuracion(solicitud, 'Dirección General');
      expect(res.aplica).toBe(false);
    });
  });

  describe('solicitarFirmasAprobacion — Validación obligatoria de justificación', () => {
    it('Debe rechazar con BadRequestException si la comisión supera 3 días y no se diligenció justificación', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-1',
        estadoSolicitud: EstadoSolicitud.PENDIENTE,
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'),
        diasComision: 4.5,
        comisionadoId: 'com-1',
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Profesional' },
        camposAdicionales: {},
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);
      jest.spyOn(service, 'validarLegalizacionesPendientes').mockResolvedValue(undefined as any);
      jest.spyOn(service, 'validarChecklistCompleto').mockResolvedValue({
        completo: true,
        faltantes: [],
        noPdf: [],
        documentosValidos: [],
      } as any);

      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      solicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(
        service.solicitarFirmasAprobacion('sol-dur-1', 'user-enlace', { justificacionDuracion: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registrarVoBoDuracion — Trazabilidad inmutable y validación de roles', () => {
    it('Debe registrar aprobación de VoBo en Dirección Nacional y guardar trazabilidad', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-2',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'),
        diasComision: 4.5,
        comisionadoId: 'com-2',
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Profesional Especializado' },
        camposAdicionales: {
          requiereVoBoDuracion: true,
          instanciaVoBoDuracion: 'DIRECCION_NACIONAL',
          tituloVoBoDuracion: 'Dirección Nacional',
          justificacionDuracion: 'Atención a auditoría nacional en territorio por 5 días hábiles.',
          firmasAprobacion: [],
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      const resultado = await service.registrarVoBoDuracion(
        'sol-dur-2',
        {
          decision: 'APROBADO',
          comentarios: 'Se autoriza la duración extendida conforme al plan de trabajo.',
          nombreFirmante: 'Dr. Director Nacional',
          cargoFirmante: 'Director Nacional ESAP',
        },
        'user-dir-nac',
        ['DIRECTOR_NACIONAL'],
      );

      expect(resultado.success).toBe(true);
      expect(resultado.decision).toBe('APROBADO');
      expect(resultado.certificadoId).toMatch(/^ESAP-CERT-VIAT-/);
      expect(resultado.hashSha256).toBeDefined();

      // Verificar trazabilidad inmutable en el repositorio de historial
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-dur-2',
          comentarios: expect.stringContaining('[VoBo Duración > 3 días] APROBADO por Dirección Nacional'),
        }),
      );
    });

    it('Debe impedir que un usuario sin rol de Dirección Nacional firme el VoBo de Sede Central', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-3',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-05'),
        camposAdicionales: {
          requiereVoBoDuracion: true,
          instanciaVoBoDuracion: 'DIRECCION_NACIONAL',
          tituloVoBoDuracion: 'Dirección Nacional',
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      await expect(
        service.registrarVoBoDuracion(
          'sol-dur-3',
          { decision: 'APROBADO' },
          'user-cualquiera',
          ['COMISIONADO'],
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Secuencia Estricta y Flujo Completo: VoBo obligatorio antes de firmas Jefe y Gerente', () => {
    it('Debe BLOQUEAR la firma del Jefe de Dependencia si la comisión requiere VoBo y este NO está aprobado', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-bloqueo-jefe',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-10'),
        fechaFin: new Date('2026-11-14'), // 5 días cal.
        diasComision: 4.5,
        camposAdicionales: {
          requiereVoBoDuracion: true,
          instanciaVoBoDuracion: 'DIRECCION_NACIONAL',
          tituloVoBoDuracion: 'Dirección Nacional',
          voboDuracion: { estado: 'PENDIENTE' },
          firmasAprobacion: [],
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      await expect(
        service.firmarAprobacionSolicitud(
          'sol-dur-bloqueo-jefe',
          {
            tipoFirma: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
            cargoFirmante: 'Jefe de Dependencia',
            nombreFirmante: 'Juan Jefe',
          },
          'user-jefe',
          ['JEFE_DEPENDENCIA'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Debe BLOQUEAR la firma del Gerente de Proyecto si la comisión requiere VoBo y este NO está aprobado', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-bloqueo-gerente',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-10'),
        fechaFin: new Date('2026-11-14'),
        diasComision: 4.5,
        camposAdicionales: {
          requiereVoBoDuracion: true,
          instanciaVoBoDuracion: 'DIRECCION_NACIONAL',
          tituloVoBoDuracion: 'Dirección Nacional',
          voboDuracion: { estado: 'PENDIENTE' },
          firmasAprobacion: [],
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      await expect(
        service.firmarAprobacionSolicitud(
          'sol-dur-bloqueo-gerente',
          {
            tipoFirma: TipoFirmaAprobacion.GERENTE_PROYECTO,
            cargoFirmante: 'Gerente de Proyecto',
            nombreFirmante: 'Pedro Gerente',
          },
          'user-gerente',
          ['GERENTE_PROYECTO'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Flujo completo: Tras aprobarse el VoBo, Jefe y Gerente firman y la solicitud avanza a RADICADA / SOLICITADO', async () => {
      const solicitudMock: any = {
        id: 'sol-dur-flujo-exitoso',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-10'),
        fechaFin: new Date('2026-11-14'),
        diasComision: 4.5,
        comisionado: { tipoComisionado: 'FUNCIONARIO', cargo: 'Profesional' },
        camposAdicionales: {
          requiereVoBoDuracion: true,
          instanciaVoBoDuracion: 'DIRECCION_NACIONAL',
          tituloVoBoDuracion: 'Dirección Nacional',
          voboDuracion: { estado: 'PENDIENTE' },
          firmasAprobacion: [],
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      // 1. Dirección Nacional aprueba VoBo
      const resVoBo = await service.registrarVoBoDuracion(
        'sol-dur-flujo-exitoso',
        {
          decision: 'APROBADO',
          comentarios: 'VoBo aprobado institucionalmente',
          nombreFirmante: 'Dr. Director Nacional',
          cargoFirmante: 'Director Nacional',
        },
        'user-dir',
        ['DIRECTOR_NACIONAL'],
      );
      expect(resVoBo.success).toBe(true);
      expect(solicitudMock.camposAdicionales.voboDuracion.estado).toBe('APROBADO');

      // 2. Ahora el Jefe de Dependencia firma satisfactoriamente
      const resFirmaJefe = await service.firmarAprobacionSolicitud(
        'sol-dur-flujo-exitoso',
        {
          tipoFirma: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
          cargoFirmante: 'Jefe de Dependencia',
          nombreFirmante: 'Juan Jefe',
          otp: '123456',
        },
        'user-jefe',
        ['JEFE_DEPENDENCIA', 'SUPER_ADMIN'],
      );
      expect(resFirmaJefe.radicada).toBe(false); // Aún falta la firma del gerente

      // 3. El Gerente de Proyecto firma y se completa la radicación
      const resFirmaGerente = await service.firmarAprobacionSolicitud(
        'sol-dur-flujo-exitoso',
        {
          tipoFirma: TipoFirmaAprobacion.GERENTE_PROYECTO,
          cargoFirmante: 'Gerente de Proyecto',
          nombreFirmante: 'Pedro Gerente',
          otp: '123456',
        },
        'user-gerente',
        ['GERENTE_PROYECTO', 'SUPER_ADMIN'],
      );
      expect(resFirmaGerente.radicada).toBe(true);
      expect(solicitudMock.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADO);
    });

    it('Pasa DERECHO a firmas de Jefe y Gerente si la comisión NO supera 3 días calendario (<= 3.5 días de valor)', async () => {
      const solicitudCorta: any = {
        id: 'sol-dur-corta',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        fechaInicio: new Date('2026-11-10'),
        fechaFin: new Date('2026-11-12'), // 3 días cal.
        diasComision: 2.5,
        diasPernoctados: 2,
        diasNoPernoctados: 1,
        camposAdicionales: {
          requiereVoBoDuracion: false, // NO requiere VoBo
          firmasAprobacion: [],
        },
      };

      solicitudRepo.findOne.mockResolvedValue(solicitudCorta);

      // Pasa derecho a firma de Jefe sin requerir VoBo
      const resJefe = await service.firmarAprobacionSolicitud(
        'sol-dur-corta',
        {
          tipoFirma: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
          cargoFirmante: 'Jefe de Dependencia',
          nombreFirmante: 'Juan Jefe',
          otp: '123456',
        },
        'user-jefe',
        ['JEFE_DEPENDENCIA', 'SUPER_ADMIN'],
      );
      expect(resJefe.radicada).toBe(false);

      // Pasa derecho a firma de Gerente y se radica
      const resGerente = await service.firmarAprobacionSolicitud(
        'sol-dur-corta',
        {
          tipoFirma: TipoFirmaAprobacion.GERENTE_PROYECTO,
          cargoFirmante: 'Gerente de Proyecto',
          nombreFirmante: 'Pedro Gerente',
          otp: '123456',
        },
        'user-gerente',
        ['GERENTE_PROYECTO', 'SUPER_ADMIN'],
      );
      expect(resGerente.radicada).toBe(true);
      expect(solicitudCorta.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADO);
    });
  });
});
