import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { DataSource } from 'typeorm';
import { ConfigService } from '../../config/config.service';
import { NotificationClientService } from '../../../common/notification-client.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { TipoFirmaAprobacion } from '../../../dto/firmar-solicitud.dto';

describe('TravelExpensesService — Firma Digital y Validación OTP', () => {
  let service: TravelExpensesService;
  let dataSource: any;
  let notificationClient: any;
  let solicitudRepo: any;
  let documentoRepo: any;

  beforeEach(async () => {
    solicitudRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };

    documentoRepo = {
      find: jest.fn().mockResolvedValue([
        { tipoDocumento: 'MEMORANDO_SOLICITUD', rutaArchivo: 'soporte.pdf' },
        { tipoDocumento: 'AGENDA_ACTIVIDADES', rutaArchivo: 'agenda.pdf' },
      ]),
    };

    const managerMock = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudComisionEntity) return solicitudRepo;
        return {
          save: jest.fn().mockResolvedValue({ id: 'h-1' }),
          findOne: jest.fn().mockResolvedValue(null),
        };
      }),
    };

    dataSource = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue({ id: 'h-1' }),
      }),
      transaction: jest.fn().mockImplementation((cb) => cb(managerMock)),
    };

    notificationClient = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
      notifyEnvioAFirmas023: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TravelExpensesService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: solicitudRepo },
        { provide: getRepositoryToken(ComisionadoEntity), useValue: {} },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: documentoRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({ documentos: [] }),
          },
        },
        { provide: NotificationClientService, useValue: notificationClient },
      ],
    }).compile();

    service = moduleRef.get<TravelExpensesService>(TravelExpensesService);
  });

  describe('solicitarOtpFirma', () => {
    it('genera código de 6 dígitos numéricos y envía email al correo institucional', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id: 'user-jefe-1',
          email: 'jefe.dependencia@esap.edu.co',
          full_name: 'Dr. Roberto Gómez',
          username: 'rgomez',
        },
      ]);

      const res = await service.solicitarOtpFirma(
        'sol-001',
        { tipoFirma: 'JEFE_DEPENDENCIA', etapaLabel: 'Aprobación Formato 023' },
        'user-jefe-1',
      );

      expect(res.verificationId).toContain('viat:sol-001:JEFE_DEPENDENCIA:user-jefe-1');
      expect(res.devCode).toBeDefined();
      expect(res.devCode).toMatch(/^\d{6}$/);
      expect(res.email).toContain('@esap.edu.co');
      expect(notificationClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jefe.dependencia@esap.edu.co',
          subject: expect.stringContaining(res.devCode!),
        }),
      );
    });

    it('falla con BadRequestException si el usuario no tiene correo registrado y no es mock', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await expect(
        service.solicitarOtpFirma(
          'sol-001',
          { tipoFirma: 'JEFE_DEPENDENCIA' },
          'user-sin-correo',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verificarOtpFirma', () => {
    it('valida exitosamente el código generado y lo consume', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id: 'user-jefe-2',
          email: 'jefe2@esap.edu.co',
          full_name: 'Dra. María Castro',
        },
      ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-002',
        { tipoFirma: 'JEFE_DEPENDENCIA' },
        'user-jefe-2',
      );

      const isValid = service.verificarOtpFirma({
        verificationId: otpRes.verificationId,
        code: otpRes.devCode!,
        consume: true,
      });

      expect(isValid).toBe(true);

      // Al haber sido consumido, no se puede reutilizar
      expect(() =>
        service.verificarOtpFirma({
          verificationId: otpRes.verificationId,
          code: otpRes.devCode!,
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza código incorrecto', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id: 'user-jefe-3',
          email: 'jefe3@esap.edu.co',
          full_name: 'Dr. Pedro Pérez',
        },
      ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-003',
        { tipoFirma: 'JEFE_DEPENDENCIA' },
        'user-jefe-3',
      );

      expect(() =>
        service.verificarOtpFirma({
          verificationId: otpRes.verificationId,
          code: '000000',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('firmarAprobacionSolicitud con OTP y Certificado Digital', () => {
    it('registra la firma con certificado criptográfico y no repudio', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id: 'user-jefe-4',
          email: 'jefe4@esap.edu.co',
          full_name: 'Dr. Alberto Suárez',
        },
      ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-004',
        { tipoFirma: 'JEFE_DEPENDENCIA' },
        'user-jefe-4',
      );

      const solicitudMock = {
        id: 'sol-004',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        comisionado: { primerNombre: 'Laura', primerApellido: 'Mora' },
        camposAdicionales: { firmasAprobacion: [] },
      } as any;

      solicitudRepo.findOne.mockResolvedValueOnce(solicitudMock);

      const resultado = await service.firmarAprobacionSolicitud(
        'sol-004',
        {
          tipoFirma: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
          nombreFirmante: 'Dr. Alberto Suárez',
          cargoFirmante: 'Jefe de Dependencia Solicitante',
          otp: otpRes.devCode,
          verificationId: otpRes.verificationId,
        },
        'user-jefe-4',
      );

      expect(resultado.certificadoId).toBeDefined();
      expect(resultado.certificadoId).toMatch(/^ESAP-CERT-VIAT-/);
      expect(resultado.firmas[0].certificadoId).toBe(resultado.certificadoId);
      expect(resultado.firmas[0].hashSha256).toBeDefined();
      expect(resultado.firmas[0].firmadoDigitalmente).toBe(true);
      expect(resultado.firmas[0].otpVerificado).toBe(true);
    });

    it('registra la firma digital del analista de viáticos y actualiza el campo revisó', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          id: 'user-analista-1',
          email: 'analista1@esap.edu.co',
          full_name: 'Lic. Marcela Castro',
        },
      ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-004-analista',
        { tipoFirma: 'ANALISTA' },
        'user-analista-1',
      );

      const solicitudMock = {
        id: 'sol-004-analista',
        estadoSolicitud: EstadoSolicitud.PENDIENTE_FIRMAS,
        comisionado: { primerNombre: 'Diego', primerApellido: 'García' },
        camposAdicionales: { firmasAprobacion: [] },
      } as any;

      solicitudRepo.findOne.mockResolvedValueOnce(solicitudMock);

      const resultado = await service.firmarAprobacionSolicitud(
        'sol-004-analista',
        {
          tipoFirma: TipoFirmaAprobacion.ANALISTA,
          nombreFirmante: 'Lic. Marcela Castro',
          cargoFirmante: 'Analista de Viáticos',
          otp: otpRes.devCode,
          verificationId: otpRes.verificationId,
        },
        'user-analista-1',
      );

      expect(resultado.certificadoId).toBeDefined();
      expect(resultado.firmas[0].tipo).toBe(TipoFirmaAprobacion.ANALISTA);
      expect(resultado.firmas[0].firmadoDigitalmente).toBe(true);
      expect(resultado.firmas[0].otpVerificado).toBe(true);
      expect(solicitudMock.camposAdicionales.reviso).toContain('Revisó: Lic. Marcela Castro');
      expect(solicitudMock.camposAdicionales.firmaAnalista).toBeDefined();
    });
  });

  describe('solicitarFirmasAprobacion — Firma de Elaboración del Enlace', () => {
    it('certifica digitalmente la elaboración del enlace al enviar a firmas', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          {
            id: 'user-enlace-1',
            email: 'enlace@esap.edu.co',
            full_name: 'Juan Enlace',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'user-enlace-1',
            email: 'enlace@esap.edu.co',
            full_name: 'Juan Enlace',
          },
        ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-005',
        { tipoFirma: 'ENLACE_ELABORO' },
        'user-enlace-1',
      );

      const solicitudMock = {
        id: 'sol-005',
        estadoSolicitud: EstadoSolicitud.PENDIENTE,
        comisionado: { tipoComisionado: 'FUNCIONARIO', primerNombre: 'Pedro' },
        camposAdicionales: {},
      } as any;

      solicitudRepo.findOne
        .mockResolvedValueOnce(solicitudMock)
        .mockResolvedValueOnce(solicitudMock);

      const saved = await service.solicitarFirmasAprobacion(
        'sol-005',
        'user-enlace-1',
        {
          otp: otpRes.devCode,
          verificationId: otpRes.verificationId,
          nombreFirmante: 'Juan Enlace',
          cargoFirmante: 'Enlace de Dependencia',
        },
      );

      expect(saved.estadoSolicitud).toBe(EstadoSolicitud.PENDIENTE_FIRMAS);
      expect(saved.camposAdicionales?.firmaElaboro).toBeDefined();
      expect(saved.camposAdicionales?.firmaElaboro.certificadoId).toMatch(/^ESAP-CERT-VIAT-/);
      expect(saved.camposAdicionales?.firmaElaboro.firmadoDigitalmente).toBe(true);
      expect(saved.camposAdicionales?.firmaElaboro.otpVerificado).toBe(true);
      expect(saved.camposAdicionales?.elaboro).toContain('Certificado:');
    });
  });

  describe('expedirRp y registrarRP con Firma OTP de Presupuesto', () => {
    it('valida OTP, genera certificado digital y guarda firmaPresupuesto al expedir RP', async () => {
      dataSource.query.mockResolvedValue([
        {
          id: 'user-presupuesto-1',
          email: 'presupuesto@esap.edu.co',
          dir_email: 'presupuesto@esap.edu.co',
          full_name: 'Dra. Claudia Presupuesto',
          nom_largo: 'Dra. Claudia Presupuesto',
          cargo: 'Profesional Especializado de Presupuesto',
        },
      ]);

      const otpRes = await service.solicitarOtpFirma(
        'sol-rp-01',
        { tipoFirma: 'PRESUPUESTO' },
        'user-presupuesto-1',
      );

      const solicitudMock = {
        id: 'sol-rp-01',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        comisionado: { primerNombre: 'Carlos', primerApellido: 'Gómez' },
        camposAdicionales: { firmasAprobacion: [] },
      } as any;

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      const res = await service.expedirRp(
        'sol-rp-01',
        'user-presupuesto-1',
        ['PRESUPUESTO'],
        {
          numeroRp: '99887',
          fechaRp: '2026-10-06',
          valorComprometido: 2500000,
          rubroPresupuestal: 'C-2101-02-001',
          otp: otpRes.devCode,
          verificationId: otpRes.verificationId,
          certificadoId: 'ESAP-CERT-VIAT-20261006-PRESUP',
        },
      );

      expect(res.estadoSolicitud).toBe(EstadoSolicitud.COMPROMETIDA);
      expect(res.numeroRp).toBe('99887');
      expect(res.valorComprometido).toBe(2500000);
      expect(res.rubroRp).toBe('C-2101-02-001');
      expect(res.camposAdicionales?.firmaPresupuesto).toBeDefined();
      expect(res.camposAdicionales?.firmaPresupuesto.firmadoDigitalmente).toBe(true);
      expect(res.camposAdicionales?.firmaPresupuesto.certificadoId).toBe('ESAP-CERT-VIAT-20261006-PRESUP');
      expect(res.camposAdicionales?.firmaPresupuesto.nombreFirmante).toBe('Dra. Claudia Presupuesto');
    });

    it('falla si el OTP de presupuesto es inválido', async () => {
      const solicitudMock = {
        id: 'sol-rp-02',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        camposAdicionales: {},
      } as any;

      solicitudRepo.findOne.mockResolvedValue(solicitudMock);

      await expect(
        service.expedirRp(
          'sol-rp-02',
          'user-presupuesto-2',
          ['PRESUPUESTO'],
          {
            numeroRp: '11223',
            fechaRp: '2026-10-06',
            valorComprometido: 1000000,
            rubroPresupuestal: 'C-2101-02-001',
            otp: '000000',
            verificationId: 'viat:sol-rp-02:PRESUPUESTO:user-presupuesto-2',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

