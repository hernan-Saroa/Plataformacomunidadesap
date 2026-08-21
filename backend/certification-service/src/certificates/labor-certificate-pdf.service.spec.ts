import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { Certificate } from './certificate.entity';

describe('LaborCertificatePdfService', () => {
  let service: LaborCertificatePdfService;

  beforeEach(() => {
    service = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;
  });

  it('da prioridad a los datos corregidos del certificado sobre la solicitud original', () => {
    const certificate = {
      full_name: 'Persona Prueba',
      id_number: '123456',
      career_category: 'Cargo corregido',
      position_category: 'Vinculacion corregida',
      position_location: 'Grupo corregido',
      department: 'Dependencia corregida',
      cod_cargo: '2028',
      cod_grade: '16',
      hiring_date: new Date('2024-05-14'),
      issue_date: new Date('2026-08-21'),
      monthly_salary: 1000000,
      salary_text: '',
      technical_bonus: 0,
      is_corrected: true,
      request: {
        career_category: 'Cargo original',
        position_category: 'Vinculacion original',
        department: 'Dependencia original',
        cod_cargo: '9999',
        cod_grade: '01',
      },
    } as unknown as Certificate;

    const content = service['buildCertificateContent']({
      certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>[CARGO]</p><p>[DEPENDENCIA]</p>',
    });

    expect(content).toContain('Cargo corregido');
    expect(content).toContain('Dependencia corregida');
    expect(content).not.toContain('Cargo original');
    expect(content).not.toContain('Dependencia original');
  });

  it('conserva el día de una fecha laboral almacenada a medianoche UTC', () => {
    const content = service['buildCertificateContent']({
      certificate: {
        hiring_date: new Date('2024-05-14T00:00:00.000Z'),
        issue_date: new Date('2026-08-21T00:00:00.000Z'),
      } as Certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>[FECHA_INICIO] · [FECHA_EXPEDICION_COMPLETA]</p>',
    });

    expect(content).toContain('14 de mayo de 2024');
    expect(content).toContain('21 de agosto de 2026');
  });

  it('identifica y resalta solo las variables utilizadas por la plantilla de revisión', () => {
    let variables: Array<{ code: string; value: string; source_fields: string[] }> = [];
    const content = service['buildCertificateContent']({
      certificate: {
        full_name: 'PERSONA PRUEBA',
        id_number: '123456',
        career_category: 'Profesional Especializado',
        cod_cargo: '202816',
        cod_grade: '16',
        hiring_date: new Date('2024-05-14T00:00:00.000Z'),
        issue_date: new Date('2026-08-21T00:00:00.000Z'),
        is_corrected: true,
      } as unknown as Certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>[NOMBRE_EMPLEADO] · [CARGO] · [FECHA_INICIO]</p>',
      highlightVariables: true,
      collectTemplateVariables: (resolved) => {
        variables = resolved;
      },
    });

    expect(variables.map((variable) => variable.code)).toEqual([
      '[NOMBRE_EMPLEADO]',
      '[CARGO]',
      '[FECHA_INICIO]',
    ]);
    expect(variables.find((variable) => variable.code === '[CARGO]')?.source_fields)
      .toEqual(['career_category', 'cod_cargo', 'cod_grade', 'encargo_type']);
    expect(content).toContain('<mark>PERSONA PRUEBA</mark>');
    expect(content).toContain('<mark>Profesional Especializado Codigo 2028 Grado 16</mark>');
    expect(content).toContain('<mark>14 de mayo de 2024</mark>');
  });

  it.each([
    {
      templateType: 'administrador' as const,
      careerCategory: 'Profesional Especializado',
      positionCategory: 'Carrera Administrativa',
      cargoCode: '202816',
      gradeCode: '16',
      expectedCargo: 'Profesional Especializado Codigo 2028 Grado 16',
      gradeFeedsCargo: true,
      usesTeachingVariables: false,
    },
    {
      templateType: 'docente' as const,
      careerCategory: '9030 DOC. ASISTENTE',
      positionCategory: 'Ocasional',
      cargoCode: '9030',
      gradeCode: '30',
      expectedCargo: 'DOC. ASISTENTE Codigo 9030',
      gradeFeedsCargo: false,
      usesTeachingVariables: true,
    },
  ])(
    'previsualiza una corrección con el snapshot y reglas de la plantilla $templateType',
    async ({
      templateType,
      careerCategory,
      positionCategory,
      cargoCode,
      gradeCode,
      expectedCargo,
      gradeFeedsCargo,
      usesTeachingVariables,
    }) => {
      const preview = await service.buildCertificatePreview({
        certificate_number: `CERT-${templateType}`,
        full_name: 'PERSONA DE PRUEBA',
        document_type: 'CC',
        id_number: '123456',
        career_category: careerCategory,
        position_category: positionCategory,
        position_location: 'Grupo de prueba',
        department: 'Dependencia de prueba',
        campus: 'Sede Central',
        cod_cargo: cargoCode,
        cod_grade: gradeCode,
        hiring_date: new Date('2024-05-14T00:00:00.000Z'),
        issue_date: new Date('2026-08-21T00:00:00.000Z'),
        monthly_salary: 1000000,
        include_salary: false,
        include_technical_bonus: false,
        is_corrected: true,
        template_type: templateType,
        template_snapshot: {
          templateType,
          version: 'prueba-1',
          cargoTitle: 'DIRECCIÓN DE TALENTO HUMANO',
          certificateContentHtml: usesTeachingVariables
            ? '<p>[NOMBRE_EMPLEADO] | [CARGO] | [TIPO_DATO] | [FECHA_INICIO] | [DEPENDENCIA] | [GRUPO] | [DATO5] | [DATO6] | [SEDE]</p>'
            : '<p>[NOMBRE_EMPLEADO] | [CARGO] | [TIPO_DATO] | [FECHA_INICIO] | [DEPENDENCIA]</p>',
          typography: { font: 'Arial' },
          firmante: { nombreCompleto: 'FIRMANTE PRUEBA', cargo: 'Directora' },
        },
      } as unknown as Certificate);

      const cargoVariable = preview.template_variables.find(
        (variable) => variable.code === '[CARGO]',
      );
      expect(preview.template_type).toBe(templateType);
      expect(preview.template_version).toBe('prueba-1');
      expect(preview.content_html).toContain(`<mark>${expectedCargo}</mark>`);
      expect(cargoVariable?.value).toBe(expectedCargo);
      expect(cargoVariable?.source_fields.includes('cod_grade')).toBe(
        gradeFeedsCargo,
      );
      if (usesTeachingVariables) {
        expect(preview.content_html).toContain('<mark>Grupo de prueba</mark>');
        expect(preview.content_html).toContain('<mark>Dependencia de prueba</mark>');
        expect(preview.content_html).toContain('<mark>Sede Central</mark>');
        expect(
          preview.template_variables.find((variable) => variable.code === '[DATO6]')
            ?.source_fields,
        ).toEqual(['department', 'position_location', 'campus']);
      }
      expect(preview.content_html).not.toMatch(/\[[A-ZÁÉÍÓÚÑ0-9_ ]+\]/);
    },
  );

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

  it('permite corregir el indicador de encargo sin depender de la solicitud laboral', () => {
    const baseCertificate = {
      career_category: 'Profesional Especializado',
      cod_cargo: '2028',
      cod_grade: '16',
      is_corrected: true,
      request: { observations: 'E' },
    } as unknown as Certificate;

    const withEncargo = service['buildCertificateContent']({
      certificate: { ...baseCertificate, encargo_type: 'E' } as Certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>[CARGO]</p>',
    });
    const withoutEncargo = service['buildCertificateContent']({
      certificate: { ...baseCertificate, encargo_type: 'N' } as Certificate,
      templateType: 'administrador',
      includeSalary: false,
      includeTechnicalBonus: false,
      templateHtml: '<p>[CARGO]</p>',
    });

    expect(withEncargo).toContain('Grado 16 (E)');
    expect(withoutEncargo).toContain('Grado 16');
    expect(withoutEncargo).not.toContain('(E)');
  });

  it('genera la prima técnica con codificación española correcta', () => {
    const paragraph = service['renderTechnicalBonusParagraph']({
      category: 'DIRECTIVOS',
      percentage: 10,
      value: 100000,
      templateText: '',
      displayOrder: 1,
    } as any);

    expect(paragraph).toContain('asignación básica mensual');
    expect(paragraph).not.toContain('Ã');

    const repairedCustomParagraph = service['renderTechnicalBonusParagraph']({
      category: 'DIRECTIVOS',
      percentage: 10,
      value: 100000,
      templateText: 'Prima sobre la asignaciÃ³n bÃ¡sica mensual.',
      displayOrder: 1,
    } as any);

    expect(repairedCustomParagraph).toContain('asignación básica mensual');
    expect(repairedCustomParagraph).not.toContain('Ã');

    const reorderedLegacyTemplate = service['renderTechnicalBonusParagraph']({
      category: 'DIRECTIVOS',
      percentage: 10,
      value: 100000,
      templateText: 'Prima de {valor_letras} (${valor_numerico}) pesos.',
      displayOrder: 1,
    } as any);

    expect(reorderedLegacyTemplate).toContain('Prima de ($100.000) cien mil pesos.');
  });

  it('expone y resalta la prima técnica como variable activa de la vista previa', async () => {
    const preview = await service.buildCertificatePreview({
      certificate_number: 'CERT-PRIMA',
      monthly_salary: 1000000,
      technical_bonus: 800000,
      include_salary: true,
      include_technical_bonus: true,
      issue_date: new Date('2026-08-21T00:00:00.000Z'),
      is_corrected: true,
      template_type: 'administrador',
      template_snapshot: {
        templateType: 'administrador',
        version: 'prueba-prima',
        cargoTitle: 'DIRECCIÓN DE TALENTO HUMANO',
        certificateContentHtml: '<p>Asignación [SALARIO] [SALARIO_LETRAS].</p><p>Se expide a solicitud.</p>',
        typography: { font: 'Arial' },
        firmante: { nombreCompleto: 'FIRMANTE PRUEBA', cargo: 'Directora' },
      },
    } as unknown as Certificate);

    const bonusVariable = preview.template_variables.find(
      (variable) => variable.code === '[PRIMA_TECNICA]',
    );

    expect(bonusVariable?.source_fields).toEqual([
      'technical_bonus',
      'include_technical_bonus',
    ]);
    expect(bonusVariable?.value).toBe('80% · $800.000');
    expect(preview.content_html).toContain('<mark>(80%)</mark>');
    expect(preview.content_html).toContain('<mark>ochocientos mil</mark>');
    expect(preview.content_html).toContain('<mark>($800.000)</mark>');
  });

  it('calcula siempre el salario en letras y descarta el texto manual heredado', async () => {
    const preview = await service.buildCertificatePreview({
      certificate_number: 'CERT-SALARIO-AUTOMATICO',
      monthly_salary: 1000010,
      salary_text: 'texto manual incorrecto',
      include_salary: true,
      include_technical_bonus: false,
      issue_date: new Date('2026-08-21T00:00:00.000Z'),
      template_type: 'administrador',
      template_snapshot: {
        templateType: 'administrador',
        version: 'prueba-salario-automatico',
        cargoTitle: 'DIRECCIÓN DE TALENTO HUMANO',
        certificateContentHtml: '<p>Salario [DATO8].</p>',
        typography: { font: 'Arial' },
        firmante: { nombreCompleto: 'FIRMANTE PRUEBA', cargo: 'Directora' },
      },
    } as unknown as Certificate);

    const wordsVariable = preview.template_variables.find(
      (variable) => variable.code === '[DATO8]',
    );
    expect(wordsVariable?.value).toBe('un millón diez');
    expect(wordsVariable?.value).not.toBe('texto manual incorrecto');
    expect(preview.content_html).not.toContain('texto manual incorrecto');
  });

  it.each(['administrador', 'docente'] as const)(
    'mantiene salario y prima en orden numérico seguido de letras en la plantilla %s',
    async (templateType) => {
      const preview = await service.buildCertificatePreview({
        certificate_number: `CERT-ORDEN-${templateType}`,
        monthly_salary: 1000000,
        technical_bonus: 800000,
        include_salary: true,
        include_technical_bonus: true,
        issue_date: new Date('2026-08-21T00:00:00.000Z'),
        is_corrected: true,
        template_type: templateType,
        template_snapshot: {
          templateType,
          version: 'prueba-orden',
          cargoTitle: 'DIRECCIÓN DE TALENTO HUMANO',
          certificateContentHtml: '<p>Asignación [SALARIO] [SALARIO_LETRAS] pesos.</p><p>Se expide a solicitud.</p>',
          typography: { font: 'Arial' },
          firmante: { nombreCompleto: 'FIRMANTE PRUEBA', cargo: 'Directora' },
        },
      } as unknown as Certificate);

      const salaryWordsValue = preview.template_variables.find(
        (variable) => variable.code === '[SALARIO_LETRAS]',
      )?.value;
      const salaryNumber = preview.content_html.indexOf('<mark>($1.000.000)</mark>');
      const salaryWords = preview.content_html.indexOf(
        `<mark>${salaryWordsValue}</mark>`,
      );
      const bonusNumber = preview.content_html.indexOf('<mark>($800.000)</mark>');
      const bonusWords = preview.content_html.indexOf('<mark>ochocientos mil</mark>');

      expect(salaryNumber).toBeGreaterThan(-1);
      expect(salaryWordsValue).toBeTruthy();
      expect(salaryWords).toBeGreaterThan(-1);
      expect(salaryNumber).toBeLessThan(salaryWords);
      expect(bonusNumber).toBeGreaterThan(-1);
      expect(bonusNumber).toBeLessThan(bonusWords);
    },
  );
});
