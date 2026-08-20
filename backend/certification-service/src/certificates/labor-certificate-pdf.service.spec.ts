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

  it.each(['docente', 'administrador'] as const)(
    'usa department para [DEPENDENCIA] en la plantilla %s',
    (templateType) => {
      const result = service['buildCertificateContent']({
        certificate: {
          department: 'Grupo de Seguridad y Salud en el Trabajo',
          position_location: 'Subdireccion Nacional de Gestion Corporativa',
          request: {
            department: 'Grupo de Seguridad y Salud en el Trabajo',
            position_location: 'Subdireccion Nacional de Gestion Corporativa',
          },
        } as any,
        templateType,
        includeSalary: true,
        includeTechnicalBonus: false,
        templateHtml: '<p>[DEPENDENCIA]</p>',
      });

      expect(result).toContain('Grupo de Seguridad y Salud en el Trabajo');
      expect(result).not.toContain(
        'Subdireccion Nacional de Gestion Corporativa',
      );
    },
  );

  it.each(['docente', 'administrador'] as const)(
    'no usa position_location como respaldo de [DEPENDENCIA] en la plantilla %s',
    (templateType) => {
      const result = service['buildCertificateContent']({
        certificate: {
          department: null,
          position_location: 'SEDE CENTRAL',
          request: {
            department: null,
            position_location: 'SEDE CENTRAL',
          },
        } as any,
        templateType,
        includeSalary: true,
        includeTechnicalBonus: false,
        templateHtml: '<p>Inicio[DEPENDENCIA]Fin</p>',
      });

      expect(result).toContain('InicioFin');
      expect(result).not.toContain('SEDE CENTRAL');
    },
  );

  it('renderiza varias primas tecnicas en el orden configurado', () => {
    const certificate = {
      technical_bonuses: [
        {
          category: 'COORDINADORES',
          percentage: 20,
          value: 200000,
          template_text: 'Coordinadores {porcentaje}% {valor_numerico}',
          display_order: 20,
        },
        {
          category: 'DIRECTIVOS',
          percentage: 10,
          value: 100000,
          template_text: 'Directivos {porcentaje}% {valor_numerico}',
          display_order: 10,
        },
      ],
      technical_bonus: 300000,
    } as any;

    const items = service['resolveTechnicalBonusItems'](certificate, 1000000);
    const html = '<p>Devenga salario mensual.</p><p>Se expide a solicitud.</p>';
    const result = service['insertTechnicalBonuses'](html, items);

    expect(items.map((item) => item.category)).toEqual([
      'DIRECTIVOS',
      'COORDINADORES',
    ]);
    expect(result.indexOf('Directivos 10% 100.000')).toBeGreaterThan(-1);
    expect(result.indexOf('Directivos 10% 100.000')).toBeLessThan(
      result.indexOf('Coordinadores 20% 200.000'),
    );
    expect(result.indexOf('Coordinadores 20% 200.000')).toBeLessThan(
      result.indexOf('Se expide'),
    );
  });
});
