import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { KlicService, KLIC_SQL } from '../klic.service';
import { mapRawRowToKlicContratoDto, RawKlicContratoRow } from '../dto/klic-contrato.dto';

describe('KlicService', () => {
  let service: KlicService;
  let configService: ConfigService;

  const mockSql = {
    VarChar: jest.fn().mockImplementation((len) => ({ type: 'varchar', len })),
    Int: { type: 'int' },
    ConnectionPool: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        KLIC_DB_ENABLED: 'true',
        KLIC_DB_HOST: '172.16.202.145',
        KLIC_DB_PORT: '1433',
        KLIC_DB_NAME: 'Klic',
        KLIC_DB_USER: 'usrIntegracionKlic',
        KLIC_DB_PASS: 'F3$t1n412426.',
        KLIC_DB_ENCRYPT: 'true',
        KLIC_DB_TRUST_SERVER_CERTIFICATE: 'true',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlicService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: KLIC_SQL,
          useValue: mockSql,
        },
      ],
    }).compile();

    service = module.get<KlicService>(KlicService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await service.closePool();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('mapRawRowToKlicContratoDto', () => {
    it('debe mapear correctamente una fila con formato SQL Server de Klic', () => {
      const raw: RawKlicContratoRow = {
        'N CONTRATO': 'BOG-1222-2024',
        'N IDENTIFICACION': '1118562823',
        NOMBRE: 'JUAN DAVID MORALES ALFONSO',
        'FECHA INICIAL': new Date('2024-09-16T05:00:00.000Z'),
        'FECHA FINAL': new Date('2024-12-31T05:00:00.000Z'),
        CDP: '157824',
        RP: '480024',
        'VALOR CONTRATO': 1000000,
        AREA: 'OFICINA DE LAS TECNOLOGIAS DE LA INFORMACION',
        AFECTACIÓN: 'INVERSION',
        'CUENTA BANCARIA': '1234567890',
      };

      const mapped = mapRawRowToKlicContratoDto(raw);

      expect(mapped.numeroContrato).toBe('BOG-1222-2024');
      expect(mapped.numeroIdentificacion).toBe('1118562823');
      expect(mapped.nombre).toBe('JUAN DAVID MORALES ALFONSO');
      expect(mapped.fechaInicial).toBe('2024-09-16T05:00:00.000Z');
      expect(mapped.fechaFinal).toBe('2024-12-31T05:00:00.000Z');
      expect(mapped.cdp).toBe('157824');
      expect(mapped.rp).toBe('480024');
      expect(mapped.valorContrato).toBe(1000000);
      expect(mapped.area).toBe('OFICINA DE LAS TECNOLOGIAS DE LA INFORMACION');
      expect(mapped.afectacion).toBe('INVERSION');
      expect(mapped.cuentaBancaria).toBe('1234567890');
    });

    it('debe soportar la columna AFECTACION sin tilde y valores nulos', () => {
      const raw: RawKlicContratoRow = {
        'N CONTRATO': 'BOG-192-2025',
        'N IDENTIFICACION': '1118562823',
        NOMBRE: 'JUAN DAVID MORALES ALFONSO',
        'FECHA INICIAL': null,
        'FECHA FINAL': null,
        CDP: null,
        RP: null,
        'VALOR CONTRATO': null,
        AREA: null,
        AFECTACION: 'FUNCIONAMIENTO',
        'CUENTA BANCARIA': null,
      };

      const mapped = mapRawRowToKlicContratoDto(raw);

      expect(mapped.numeroContrato).toBe('BOG-192-2025');
      expect(mapped.afectacion).toBe('FUNCIONAMIENTO');
      expect(mapped.cdp).toBeNull();
      expect(mapped.rp).toBeNull();
      expect(mapped.valorContrato).toBeNull();
    });
  });

  describe('checkHealth', () => {
    it('debe indicar disabled cuando KLIC_DB_ENABLED es false', async () => {
      mockConfigService.get.mockImplementationOnce(() => 'false');
      const disabledService = new KlicService(mockConfigService as any, mockSql as any);

      const health = await disabledService.checkHealth();
      expect(health.status).toBe('disabled');
      expect(health.message).toContain('deshabilitada');
    });
  });

  describe('getContratosByIdentificacion', () => {
    it('debe retornar arreglo vacío si numeroIdentificacion es vacío', async () => {
      const result = await service.getContratosByIdentificacion('');
      expect(result).toEqual([]);
    });

    it('debe lanzar ServiceUnavailableException si el servicio Klic está deshabilitado', async () => {
      mockConfigService.get.mockImplementationOnce(() => 'false');
      const disabledService = new KlicService(mockConfigService as any, mockSql as any);

      await expect(
        disabledService.getContratosByIdentificacion('1118562823'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
