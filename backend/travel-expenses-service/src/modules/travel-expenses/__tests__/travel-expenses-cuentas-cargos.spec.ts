import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TravelExpensesService } from '../travel-expenses.service';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';
import { NotificationClientService } from '../../../common/notification-client.service';
import { HumanResourcesClientService } from '../../../common/human-resources-client.service';

describe('TravelExpensesService — Cuentas Bancarias y Cargos con Salario Relacional', () => {
  let service: TravelExpensesService;
  let comisionadoRepo: { findOne: jest.Mock; save: jest.Mock };
  let solicitudRepo: Partial<Record<keyof Repository<SolicitudComisionEntity>, jest.Mock>>;
  let dataSource: any;

  beforeEach(async () => {
    comisionadoRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    solicitudRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({
          id: 'sol-123',
          consecutivoUnico: 'SOL-2026-001',
          ...entity,
        }),
      ),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const fakeManager = {
          save: jest.fn().mockImplementation((ent) => Promise.resolve(ent)),
          findOne: jest.fn().mockImplementation((_, opts) => {
            if (opts?.where?.numeroDocumento) {
              return comisionadoRepo.findOne();
            }
            return null;
          }),
          create: jest.fn().mockImplementation((_, d) => d),
          query: jest.fn().mockResolvedValue([]),
          withRepository: jest.fn().mockReturnValue(solicitudRepo),
          getRepository: jest.fn().mockReturnValue({
            save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
            }),
          }),
        };
        return cb(fakeManager);
      }),
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn().mockReturnValue({
        save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
        findOne: jest.fn().mockResolvedValue(null),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelExpensesService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(ComisionadoEntity),
          useValue: comisionadoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudComisionEntity),
          useValue: solicitudRepo,
        },
        {
          provide: getRepositoryToken(DocumentoSoporteEntity),
          useValue: { save: jest.fn() },
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: { save: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null),
            obtenerConfiguracionPorCodigoFormulario: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            send: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: HumanResourcesClientService,
          useValue: {
            consultarFuncionarioPorDocumento: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  describe('agregarCuentaBancariaComisionado', () => {
    it('agrega una nueva cuenta bancaria y preserva las existentes en el historial JSON', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cuentasBancarias = [
        {
          id: 'cta-1',
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: 'https://storage/cert1.pdf',
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      const resultado = await service.agregarCuentaBancariaComisionado('12345678', {
        banco: 'DAVIVIENDA',
        tipoCuenta: 'CORRIENTE',
        numeroCuenta: '99998888',
        urlCertificadoBancario: 'https://storage/cert2.pdf',
        esPrincipal: false,
      });

      expect(resultado.cuentasBancarias).toHaveLength(2);
      expect(resultado.cuentasBancarias[1].banco).toBe('DAVIVIENDA');
      expect(resultado.cuentasBancarias[1].numeroCuenta).toBe('99998888');
      expect(comisionadoRepo.save).toHaveBeenCalledWith(comisionado);
    });

    it('actualiza una cuenta existente si coincide el número de cuenta y banco', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cuentasBancarias = [
        {
          id: 'cta-1',
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: null,
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      const resultado = await service.agregarCuentaBancariaComisionado('12345678', {
        banco: 'BANCOLOMBIA',
        tipoCuenta: 'AHORROS',
        numeroCuenta: '11112222',
        urlCertificadoBancario: 'https://storage/cert-actualizado.pdf',
      });

      expect(resultado.cuentasBancarias).toHaveLength(1);
      expect(resultado.cuentasBancarias[0].urlCertificadoBancario).toBe('https://storage/cert-actualizado.pdf');
    });
  });

  describe('agregarCargoComisionado', () => {
    it('agrega un nuevo cargo con salario relacional', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cargos = [
        {
          id: 'crg-1',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      const resultado = await service.agregarCargoComisionado('12345678', {
        cargo: 'DIRECTOR TÉCNICO',
        salario: 7800000,
        esPrincipal: false,
      });

      expect(resultado.cargos).toHaveLength(2);
      expect(resultado.cargos[1].cargo).toBe('DIRECTOR TÉCNICO');
      expect(resultado.cargos[1].salario).toBe(7800000);
      expect(comisionadoRepo.save).toHaveBeenCalledWith(comisionado);
    });

    it('actualiza el salario relacional si el cargo ya existía', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cargos = [
        {
          id: 'crg-1',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      const resultado = await service.agregarCargoComisionado('12345678', {
        cargo: 'PROFESIONAL ESPECIALIZADO',
        salario: 4900000,
      });

      expect(resultado.cargos).toHaveLength(1);
      expect(resultado.cargos[0].salario).toBe(4900000);
      expect(comisionado.salarioBasico).toBe(4900000);
    });
  });

  describe('crearSolicitud — actualización condicional de cuentas bancarias', () => {
    it('no actualiza el comisionado si la solicitud usa una cuenta existente y no cambió el certificado', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cargo = 'PROFESIONAL ESPECIALIZADO';
      comisionado.salarioBasico = 4500000;
      comisionado.autorizacionHabeasData = true;
      comisionado.cuentasBancarias = [
        {
          id: 'cta-1',
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: 'https://storage/cert1.pdf',
          esPrincipal: true,
        },
      ];
      comisionado.cargos = [
        {
          id: 'crg-1',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      await service.crearSolicitud({
        comisionadoId: 'com-1',
        objetoComision: 'Capacitación territorial',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-03',
        cuentaBancariaSeleccionada: {
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: 'https://storage/cert1.pdf', // Mismo certificado
        },
        cargoSeleccionado: {
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
        },
      } as any);

      // NO debe guardar comisionado porque no hubo cambios en la cuenta ni en el certificado
      expect(comisionadoRepo.save).not.toHaveBeenCalled();
    });

    it('actualiza el comisionado si la solicitud incluye un NUEVO certificado bancario para la cuenta existente', async () => {
      const comisionado = new ComisionadoEntity();
      comisionado.id = 'com-1';
      comisionado.numeroDocumento = '12345678';
      comisionado.cargo = 'PROFESIONAL ESPECIALIZADO';
      comisionado.salarioBasico = 4500000;
      comisionado.autorizacionHabeasData = true;
      comisionado.cuentasBancarias = [
        {
          id: 'cta-1',
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: 'https://storage/cert-viejo.pdf',
          esPrincipal: true,
        },
      ];
      comisionado.cargos = [
        {
          id: 'crg-1',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
          esPrincipal: true,
        },
      ];

      comisionadoRepo.findOne.mockResolvedValue(comisionado);

      await service.crearSolicitud({
        comisionadoId: 'com-1',
        objetoComision: 'Capacitación territorial',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-03',
        cuentaBancariaSeleccionada: {
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '11112222',
          urlCertificadoBancario: 'https://storage/cert-nuevo-2026.pdf', // Nuevo certificado cargado
          nombreArchivoCertificado: 'cert-nuevo.pdf',
        },
        cargoSeleccionado: {
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4500000,
        },
      } as any);

      // SÍ debe actualizar el comisionado con el nuevo certificado
      expect(comisionadoRepo.save).toHaveBeenCalled();
      expect(comisionado.cuentasBancarias[0].urlCertificadoBancario).toBe('https://storage/cert-nuevo-2026.pdf');
    });
  });
});
