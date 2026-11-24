import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';

describe('GraduationCertificatesService candidate search failures', () => {
  const graduate = {
    id: 'graduate-1',
    idNumber: '1234567',
    fullName: 'Persona Graduada',
    programName: 'Administración Pública',
    degreeTitle: 'Administrador Público',
    graduationDate: '2020-01-01',
  };
  const mysqlGraduate = {
    IDENTIFICACION: graduate.idNumber,
    ESTUDIANTE: graduate.fullName,
    TITULO: graduate.programName,
    FECHAREGISTRO: graduate.graduationDate,
    DIPLOMA: 'DIPLOMA-1',
    REGISTRO: '123',
    ACTA: '1',
    LIBRO: '1',
  };

  const setup = () => {
    const repository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const requestRepository = { save: jest.fn() };
    const certificateRepository = { save: jest.fn() };
    const mysql = {
      isEnabled: jest.fn().mockReturnValue(true),
      findGraduatesByDocument: jest.fn().mockResolvedValue([]),
    };
    const oracle = {
      isEnabled: jest.fn().mockReturnValue(true),
      findGraduatesByDocument: jest.fn().mockResolvedValue([]),
    };
    const service = new GraduationCertificatesService(
      repository as never,
      requestRepository as never,
      certificateRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      mysql as never,
      oracle as never,
      {} as never,
    );
    const log = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation();
    return {
      service,
      repository,
      requestRepository,
      certificateRepository,
      mysql,
      oracle,
      log,
    };
  };

  afterEach(() => jest.restoreAllMocks());

  it.each(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'])(
    'reports a MySQL connection failure (%s) without returning false no-matches',
    async (code) => {
      const {
        service,
        repository,
        requestRepository,
        certificateRepository,
        mysql,
        oracle,
        log,
      } = setup();
      mysql.findGraduatesByDocument.mockRejectedValue(
        Object.assign(new Error('private driver details'), { code }),
      );

      await expect(
        service.buscarCoincidenciasGraduado('1234567'),
      ).rejects.toMatchObject({ status: 503 });

      expect(log).toHaveBeenCalledWith(
        `[buscar-coincidencias] stage=mysql_sync code=${code}`,
        expect.any(String),
      );
      expect(oracle.findGraduatesByDocument).not.toHaveBeenCalled();
      expect(repository.find).not.toHaveBeenCalled();
      expect(requestRepository.save).not.toHaveBeenCalled();
      expect(certificateRepository.save).not.toHaveBeenCalled();
    },
  );

  it('identifies a missing PostgreSQL column without exposing the query or its parameters', async () => {
    const { service, repository, log } = setup();
    repository.find.mockRejectedValue(
      Object.assign(new Error('query and document 1234567'), {
        driverError: { code: '42703' },
      }),
    );

    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining(
        'No fue posible consultar los registros académicos',
      ),
    });
    expect(log).toHaveBeenCalledWith(
      '[buscar-coincidencias] stage=local_lookup code=42703',
      expect.any(String),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('1234567');
    expect(JSON.stringify(log.mock.calls)).not.toContain('query and document');
  });

  it('identifies an Oracle query failure and stops before reading local results', async () => {
    const { service, repository, oracle, log } = setup();
    oracle.findGraduatesByDocument.mockRejectedValue(
      Object.assign(new Error('private Oracle details'), { code: 'ORA-00942' }),
    );

    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).rejects.toMatchObject({ status: 500 });
    expect(log).toHaveBeenCalledWith(
      '[buscar-coincidencias] stage=oracle_sync code=ORA-00942',
      expect.any(String),
    );
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('keeps a source unavailable response at 503 and hides its connection configuration', async () => {
    const { service, mysql } = setup();
    mysql.findGraduatesByDocument.mockRejectedValue(
      new ServiceUnavailableException('private connection configuration'),
    );

    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).rejects.toMatchObject({
      status: 503,
      message:
        'No fue posible consultar los registros académicos en este momento. Intente nuevamente en unos minutos.',
    });
  });

  it('preserves validation errors', async () => {
    const { service, mysql, log } = setup();
    await expect(
      service.buscarCoincidenciasGraduado('1234'),
    ).rejects.toMatchObject({ status: 400 });
    expect(mysql.findGraduatesByDocument).not.toHaveBeenCalled();
    const error = new BadRequestException('Datos inválidos');
    mysql.findGraduatesByDocument.mockRejectedValue(error);
    await expect(service.buscarCoincidenciasGraduado('1234567')).rejects.toBe(
      error,
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('returns genuine no-matches only after all configured sources respond successfully', async () => {
    const { service, mysql, oracle, requestRepository, certificateRepository } =
      setup();
    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).resolves.toMatchObject({
      hasMatches: false,
      totalMatches: 0,
      suggestions: [],
    });
    expect(mysql.findGraduatesByDocument).toHaveBeenCalledWith('1234567', 100);
    expect(oracle.findGraduatesByDocument).toHaveBeenCalledWith('1234567', 100);
    expect(requestRepository.save).not.toHaveBeenCalled();
    expect(certificateRepository.save).not.toHaveBeenCalled();
  });

  it('preserves local matches when external integrations are disabled', async () => {
    const { service, repository, mysql, oracle } = setup();
    mysql.isEnabled.mockReturnValue(false);
    oracle.isEnabled.mockReturnValue(false);
    repository.find.mockResolvedValue([graduate]);

    await expect(
      service.buscarCoincidenciasGraduado(
        '1234567',
        undefined,
        'Persona Graduada',
      ),
    ).resolves.toMatchObject({
      hasMatches: true,
      totalMatches: 1,
      fuente: 'postgres',
      suggestions: [expect.objectContaining({ graduateId: graduate.id })],
    });
    expect(mysql.findGraduatesByDocument).not.toHaveBeenCalled();
    expect(oracle.findGraduatesByDocument).not.toHaveBeenCalled();
  });

  it('preserves MySQL priority, synchronization and the explicit certificate selection step', async () => {
    const {
      service,
      repository,
      mysql,
      oracle,
      requestRepository,
      certificateRepository,
    } = setup();
    repository.find.mockResolvedValue([{ ...graduate }]);
    repository.save.mockImplementation(async (record) => record);
    mysql.findGraduatesByDocument.mockResolvedValue([mysqlGraduate]);

    const result = await service.buscarCoincidenciasGraduado(
      '1234567',
      undefined,
      'Persona Graduada',
    );

    expect(result).toMatchObject({
      hasMatches: true,
      fuente: 'mysql',
      mysqlSync: { found: true, synced: true, updated: 1 },
      suggestions: [expect.objectContaining({ graduateId: graduate.id })],
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: graduate.id,
        idNumber: graduate.idNumber,
        updatedBy: 'mysql:graduados',
      }),
    );
    expect(oracle.findGraduatesByDocument).not.toHaveBeenCalled();
    expect(requestRepository.save).not.toHaveBeenCalled();
    expect(certificateRepository.save).not.toHaveBeenCalled();
  });

  it('preserves Oracle synchronization when MySQL has no records', async () => {
    const { service, repository, mysql, oracle } = setup();
    repository.find.mockResolvedValue([{ ...graduate }]);
    repository.save.mockImplementation(async (record) => record);
    oracle.findGraduatesByDocument.mockResolvedValue([{ ...graduate }]);

    const result = await service.buscarCoincidenciasGraduado(
      '1234567',
      undefined,
      'Persona Graduada',
    );

    expect(result).toMatchObject({
      hasMatches: true,
      fuente: 'oracle-sinu',
      oracleSync: { found: true, synced: true, updated: 1 },
      suggestions: [expect.objectContaining({ graduateId: graduate.id })],
    });
    expect(mysql.findGraduatesByDocument).toHaveBeenCalledTimes(1);
    expect(oracle.findGraduatesByDocument).toHaveBeenCalledWith('1234567', 100);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: graduate.id,
        updatedBy: 'oracle:sinu',
      }),
    );
  });

  it('stops if synchronization cannot persist a graduate instead of offering an unverified match', async () => {
    const {
      service,
      repository,
      mysql,
      oracle,
      log,
      requestRepository,
      certificateRepository,
    } = setup();
    repository.find.mockResolvedValue([{ ...graduate }]);
    mysql.findGraduatesByDocument.mockResolvedValue([mysqlGraduate]);
    repository.save.mockRejectedValue(
      Object.assign(new Error('private duplicate record details'), {
        driverError: { code: '23505' },
      }),
    );

    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).rejects.toMatchObject({ status: 500 });

    expect(log).toHaveBeenCalledWith(
      '[buscar-coincidencias] stage=mysql_sync code=23505',
      expect.any(String),
    );
    expect(oracle.findGraduatesByDocument).not.toHaveBeenCalled();
    expect(requestRepository.save).not.toHaveBeenCalled();
    expect(certificateRepository.save).not.toHaveBeenCalled();
  });

  it('preserves the refusal to issue certificates for a future graduation date', async () => {
    const { service, repository, log } = setup();
    repository.find.mockResolvedValue([
      { ...graduate, graduationDate: '2999-01-01' },
    ]);
    await expect(
      service.buscarCoincidenciasGraduado('1234567'),
    ).rejects.toMatchObject({ status: 422 });
    expect(log).not.toHaveBeenCalled();
  });
});
