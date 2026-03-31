import { LaborCertificatePdfService } from './labor-certificate-pdf.service';

describe('LaborCertificatePdfService', () => {
  let service: LaborCertificatePdfService;

  beforeEach(() => {
    service = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;
  });

  it('normaliza a 4 digitos el codigo administrativo dentro del texto y conserva el grado', () => {
    const cargo = service['buildCargoVariable'](
      'Auxiliar de Servicios Generales Codigo 40640 Grado 9',
      null,
      null,
      {
        templateType: 'administrador',
        includeCodeLabel: true,
        codeLabel: 'Codigo',
      },
    );

    expect(cargo).toBe('Auxiliar de Servicios Generales Codigo 4064 Grado 9');
  });

  it('normaliza a 4 digitos el codigo docente dentro del texto', () => {
    const cargo = service['buildCargoVariable'](
      'DOC. TITULAR Codigo 90101',
      null,
      null,
      {
        templateType: 'docente',
        includeCodeLabel: true,
        codeLabel: 'Codigo',
      },
    );

    expect(cargo).toBe('DOC. TITULAR Codigo 9010');
  });

  it('mantiene el flujo administrativo actual cuando el codigo llega unido al grado', () => {
    const cargo = service['buildCargoVariable'](
      'Profesional Especializado',
      '202814',
      '14',
      {
        templateType: 'administrador',
        includeCodeLabel: true,
        codeLabel: 'Codigo',
      },
    );

    expect(cargo).toBe('Profesional Especializado Codigo 2028 Grado 14');
  });

  it('conserva el cero inicial cuando viene presente en el codigo compacto', () => {
    const cargo = service['buildCargoVariable'](
      'Jefe de Oficina',
      '013718',
      '18',
      {
        templateType: 'administrador',
        includeCodeLabel: true,
        codeLabel: 'Codigo',
      },
    );

    expect(cargo).toBe('Jefe de Oficina Codigo 0137 Grado 18');
  });

  it('no inventa un cero a la izquierda cuando el compacto no lo trae', () => {
    const cargo = service['buildCargoVariable'](
      'Jefe de Oficina',
      '13718',
      '18',
      {
        templateType: 'administrador',
        includeCodeLabel: true,
        codeLabel: 'Codigo',
      },
    );

    expect(cargo).toBe('Jefe de Oficina Codigo 1371 Grado 18');
  });
});
