import { LaborOracleIntegrationService } from './labor-oracle-integration.service';

describe('LaborOracleIntegrationService', () => {
  let service: LaborOracleIntegrationService;

  beforeEach(() => {
    service = Object.create(
      LaborOracleIntegrationService.prototype,
    ) as LaborOracleIntegrationService;
  });

  const buildSuggestedRequest = (row: Record<string, unknown>) =>
    service['buildSuggestedRequest'](row);

  it('consulta por documento las vinculaciones relacionadas al cargo en un solo SELECT', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [
      { CEDULA: '123', COD_CARGO: '202812', GRADO: '12', TIPO: 'E' },
      { CEDULA: '123', COD_CARGO: '204409', GRADO: '09', TIPO: 'N', CENTROCOSTO: 'Grupo normal' },
    ] });
    const connection = { execute, callTimeout: 0 };
    jest.spyOn(service as any, 'withConnection').mockImplementation(async (callback: any) =>
      callback(connection, { OUT_FORMAT_OBJECT: 1 }, { qualifiedView: 'SCHEMA.VISTA' }),
    );
    const rows = await service.findSuggestedRequestsByPositionCodes(['202812'], 10000, true);
    expect(connection.callTimeout).toBe(8000);
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, binds] = execute.mock.calls[0];
    expect(sql).toContain("WHERE REGEXP_REPLACE(TO_CHAR(CEDULA), '[^0-9]', '') IN");
    expect(sql).toContain("WHERE REGEXP_REPLACE(TO_CHAR(COD_CARGO), '[^0-9]', '') IN (:cod0)");
    expect(binds).toEqual({ cod0: '202812', limite: 10000 });
    expect(rows.map(row => row.cod_cargo)).toEqual(['202812', '204409']);
    expect(rows[1].internal_group).toBe('Grupo normal');
  });

  it('permite configurar el timeout de la consulta masiva', async () => {
    const previous = process.env.ORACLE_FNC_MATRIX_TIMEOUT_MS;
    process.env.ORACLE_FNC_MATRIX_TIMEOUT_MS = '12000';
    const connection = {
      callTimeout: 0,
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };
    jest.spyOn(service as any, 'withConnection').mockImplementation(async (callback: any) =>
      callback(connection, { OUT_FORMAT_OBJECT: 1 }, { qualifiedView: 'SCHEMA.VISTA' }),
    );

    try {
      await service.findSuggestedRequestsByPositionCodes(['202812']);
      expect(connection.callTimeout).toBe(12000);
    } finally {
      if (previous === undefined) delete process.env.ORACLE_FNC_MATRIX_TIMEOUT_MS;
      else process.env.ORACLE_FNC_MATRIX_TIMEOUT_MS = previous;
    }
  });

  it('mapea CENTROCOSTO como grupo interno cuando Oracle no informa otro grupo', () => {
    expect(buildSuggestedRequest({ CENTROCOSTO: 'Grupo Académico' }).internal_group)
      .toBe('Grupo Académico');
  });

  it('prioriza el grupo explícito y usa CENTROCOSTO si contiene N/A', () => {
    expect(buildSuggestedRequest({ GRUPO_INTERNO: 'Grupo Académico', CENTROCOSTO: 'CC-100' }).internal_group)
      .toBe('Grupo Académico');
    expect(buildSuggestedRequest({ GRUPO_INTERNO: 'N/A', CENTROCOSTO: 'Grupo Académico' }).internal_group)
      .toBe('Grupo Académico');
  });

  it('prioriza CENTROCOSTO para la dependencia del certificado', () => {
    const request = buildSuggestedRequest({
      CENTROCOSTO: 'Grupo de Seguridad y Salud en el Trabajo',
      DEPENDENCIA: 'Subdireccion Nacional de Gestion Corporativa',
      SUCURSAL: 'SEDE CENTRAL',
    });

    expect(request.department).toBe(
      'Grupo de Seguridad y Salud en el Trabajo',
    );
  });

  it('usa DEPENDENCIA cuando CENTROCOSTO esta vacio', () => {
    const request = buildSuggestedRequest({
      CENTROCOSTO: '   ',
      DEPENDENCIA: 'Subdireccion Nacional de Gestion Corporativa',
      SUCURSAL: 'SEDE CENTRAL',
    });

    expect(request.department).toBe(
      'Subdireccion Nacional de Gestion Corporativa',
    );
  });

  it('no usa SUCURSAL como respaldo de la dependencia', () => {
    const request = buildSuggestedRequest({
      CENTROCOSTO: null,
      DEPENDENCIA: null,
      SUCURSAL: 'SEDE CENTRAL',
    });

    expect(request.department).toBeNull();
  });

  it('mantiene DEPENDENCIA como fuente principal de GRUPO', () => {
    const request = buildSuggestedRequest({
      CENTROCOSTO: 'Grupo de Seguridad y Salud en el Trabajo',
      DEPENDENCIA: 'Subdireccion Nacional de Gestion Corporativa',
      SUCURSAL: 'SEDE CENTRAL',
    });

    expect(request.position_location).toBe(
      'Subdireccion Nacional de Gestion Corporativa',
    );
  });

  it('conserva como base un codigo de cuatro digitos aunque termine en el grado', () => {
    const request = buildSuggestedRequest({
      COD_CARGO: '9090',
      GRADO: '90',
      CARGO: 'DOCENTE VISITANTE',
    });

    expect(request.base_position_code).toBe('9090');
  });

  it('separa el grado cuando COD_CARGO ya viene combinado', () => {
    const request = buildSuggestedRequest({
      COD_CARGO: '202816',
      GRADO: '16',
      CARGO: 'PROFESIONAL ESPECIALIZADO',
    });

    expect(request.base_position_code).toBe('2028');
  });
});
