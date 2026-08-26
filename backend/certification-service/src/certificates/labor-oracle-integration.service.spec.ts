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
