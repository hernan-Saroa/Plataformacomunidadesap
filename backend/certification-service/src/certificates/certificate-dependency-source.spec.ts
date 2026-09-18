import { Certificate } from './certificate.entity';
import { CertificateRequest } from './certificate-request.entity';
import { CertificatesService } from './certificates.service';
import { LaborCertificatePdfService } from './labor-certificate-pdf.service';
import { LaborFunctionsService } from './labor-functions.service';

describe('[DEPENDENCIA] de la vinculacion normal durante un encargo', () => {
  const service = Object.create(CertificatesService.prototype) as CertificatesService;
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;
  const normal = (overrides = {}) => ({
    id: 'normal', id_number: '123', status: 'A', observations: 'N',
    position_category: 'Cra. Administrativa',
    career_category: 'Profesional Universitario Grado 09',
    position_name: 'Profesional Universitario',
    cod_cargo: '204409', cod_grade: '09',
    hiring_date: '2024-05-14', request_date: '2026-04-01',
    department: 'Direccion de Talento Humano',
    organization_department: 'Direccion de Talento Humano',
    internal_group: 'Grupo de Seguridad y Salud en el Trabajo',
    cost_center: null, monthly_salary: 4772636,
    ...overrides,
  }) as unknown as CertificateRequest;
  const encargo = (overrides = {}) => ({
    ...normal(), id: 'encargo', observations: 'E',
    career_category: 'Profesional Especializado Grado 12 Grado 12',
    position_name: 'Profesional Especializado Grado 12',
    cod_cargo: '202812', cod_grade: '12',
    hiring_date: '2025-04-01', request_date: '2025-06-05',
    department: 'Subdireccion Nacional de Gestion Corporativa',
    organization_department: 'Subdireccion Nacional de Gestion Corporativa',
    internal_group: 'Grupo del encargo', cost_center: 'Centro del encargo',
    position_location: 'Ubicacion del encargo', monthly_salary: 5099764,
    ...overrides,
  }) as unknown as CertificateRequest;
  const render = (request: CertificateRequest, templateType: 'administrador' | 'docente' = 'administrador') =>
    pdf['buildCertificateContent']({
      certificate: { ...request, request } as unknown as Certificate,
      templateType, includeSalary: true, includeTechnicalBonus: false,
      templateHtml: '<p>DEP:[DEPENDENCIA]</p><p>CARGO:[CARGO]</p><p>SAL:[SALARIO]</p><p>GRUPO:[GRUPO]</p><p>DATO7:[DATO7]</p>',
    });

  it.each(['administrador', 'docente'] as const)(
    'imprime el grupo normal y conserva cargo, salario y contexto del encargo (%s)',
    (templateType) => {
      const base = normal();
      const assignment = encargo();
      const result = service.resolveRequestUsedForCertificate([base, assignment])!;
      expect(result).toMatchObject({
        id: 'encargo', cod_cargo: '202812', cod_grade: '12', observations: 'E',
        monthly_salary: 5099764, hiring_date: '2024-05-14',
        department: assignment.department,
        organization_department: assignment.organization_department,
        internal_group: assignment.internal_group, cost_center: assignment.cost_center,
        certificate_dependency: base.department,
      });
      const html = render(result, templateType);
      expect(html).toContain(`DEP:${base.department}`);
      expect(html).toContain('Profesional Especializado');
      expect(html).toContain(templateType === 'administrador' ? 'Grado 12 (E)' : 'Codigo 2028 (E)');
      expect(html).toContain('5.099.764');
      // [GRUPO] sale de la MISMA vinculacion que [DEPENDENCIA] (la normal
      // vigente): las dos variables describen un solo lugar, no uno el del
      // nombramiento normal y otro el del encargo.
      expect(html).toContain(`GRUPO:${base.internal_group}`);
      expect(html).not.toContain('GRUPO:Grupo del encargo');
      expect(html).toContain(`DATO7:${assignment.department}`);
      expect(base).not.toHaveProperty('certificate_dependency');
      expect(assignment).not.toHaveProperty('certificate_dependency');
    },
  );

  it.each([
    { internal_group: 'Grupo local', cost_center: 'Centro Oracle', expected: 'Direccion de Talento Humano' },
    // Forma Oracle: `department` guarda el CENTROCOSTO y la dependencia real
    // vive en `organization_department`; se imprime la dependencia, no el grupo.
    { department: 'Centro Oracle', internal_group: 'Grupo local', cost_center: 'Centro Oracle', expected: 'Direccion de Talento Humano' },
    // El grupo solo entra cuando no hay ninguna dependencia.
    { department: null, organization_department: null, internal_group: 'Grupo local', cost_center: 'Centro Oracle', expected: 'Grupo local' },
    { department: null, organization_department: null, internal_group: 'N/A', cost_center: 'Centro Oracle', expected: 'Centro Oracle' },
    { department: null, internal_group: null, cost_center: null, expected: 'Direccion de Talento Humano' },
    { internal_group: null, cost_center: null, department: null, organization_department: null, expected: '' },
  ])('resuelve las fuentes locales y Oracle sin completar con datos del encargo: $expected', ({ expected, ...fields }) => {
    const result = service.resolveRequestUsedForCertificate([encargo(), normal(fields)])!;
    expect(result.certificate_dependency).toBe(expected);
    expect(render(result)).toContain(`<p>DEP:${expected}</p>`);
  });

  it('descarta normales inactivas y elige la normal vigente mas reciente', () => {
    // Las dos columnas de dependencia se mueven juntas: lo que se prueba aqui es
    // QUE FILA se elige, no de que columna sale el texto.
    const requests = [
      encargo(),
      normal({ id: 'antigua', request_date: '2024-01-01', department: 'Antiguo', organization_department: 'Antiguo' }),
      normal({ id: 'inactiva', status: 'I', request_date: '2027-01-01', department: 'Inactivo', organization_department: 'Inactivo' }),
      normal({ id: 'vigente', request_date: '2026-04-01', department: 'Vigente', organization_department: 'Vigente' }),
    ];
    expect(service.resolveRequestUsedForCertificate(requests)?.certificate_dependency).toBe('Vigente');
    expect(service.resolveRequestUsedForCertificate([...requests].reverse())?.certificate_dependency).toBe('Vigente');
  });

  it('conserva la prioridad del nombramiento principal de carrera administrativa', () => {
    const result = service.resolveRequestUsedForCertificate([
      encargo(), normal(), normal({ id: 'otra', position_category: 'Provisional', request_date: '2027-01-01', department: 'Otro' }),
    ])!;
    expect(result.certificate_dependency).toBe(normal().department);
  });

  it('sin encargo sigue usando el contrato normal seleccionado', () => {
    const result = service.resolveRequestUsedForCertificate([
      encargo({ status: 'I' }), normal(),
    ])!;
    expect(result.id).toBe('normal');
    expect(result.certificate_dependency).toBeUndefined();
    expect(render(result)).toContain(`DEP:${normal().department}`);
    expect(result.monthly_salary).toBe(4772636);
  });

  it('sin normal vigente conserva el respaldo del encargo', () => {
    const result = service.resolveRequestUsedForCertificate([encargo(), normal({ status: 'I' })])!;
    expect(result.certificate_dependency).toBeUndefined();
    expect(render(result)).toContain(`DEP:${encargo().department}`);
  });

  it('los encargos empatados conservan la misma dependencia normal', () => {
    const requests = [encargo({ id: 'e1', internal_group: null, cost_center: null }), encargo({ id: 'e2' }), normal()];
    for (const rows of [requests, [...requests].reverse()]) {
      expect(service.resolveRequestUsedForCertificate(rows)?.certificate_dependency).toBe(normal().department);
    }
  });

  it('hidrata certificados existentes sin alterar el registro original', () => {
    const assignment = encargo();
    const certificate = { request_id: assignment.id, request: assignment } as Certificate;
    service['applyRequestContextToCertificate'](certificate, [assignment, normal()]);
    expect(certificate.request.certificate_dependency).toBe(normal().department);
    expect(assignment).not.toHaveProperty('certificate_dependency');
  });

  it('la consulta y el cruce de funciones usan grupo normal con codigo y grado del encargo', async () => {
    const profile = {
      id: 'perfil', combined_code: '202812', position_code: '2028', grade_code: '12',
      is_active: true, position_name: 'Profesional Especializado', hierarchical_level: 'Profesional',
      department_name: normal().organization_department, internal_group: normal().internal_group,
      functions: [{ ordinal: 1, description: 'Funcion del perfil aplicable' }],
    };
    const functions = new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue([profile]) } as any, {} as any,
      { find: jest.fn().mockResolvedValue([normal(), encargo()]) } as any,
      {} as any, { isEnabled: () => false } as any,
    );
    const result = await functions.lookupPerson('123', {
      selectPreferred: rows => service.resolveRequestUsedForCertificate(rows),
    });
    expect(result.items[0].certificate_dependency).toBe(normal().department);
    expect(result.items[0].matrix).toMatchObject({
      combined_code: '202812', grade_code: '12',
      department_name: normal().organization_department,
      internal_group: normal().internal_group,
    });
    expect(result.items[0].matched_profile?.id).toBe('perfil');
    const selected = service.resolveRequestUsedForCertificate([normal(), encargo()])!;
    expect((await functions.resolveForRequest(selected)).profile?.id).toBe('perfil');
  });

  it.each(['administrador', 'docente'] as const)('solo modifica el placeholder [DEPENDENCIA] (%s)', templateType => {
    const result = service.resolveRequestUsedForCertificate([normal(), encargo()])!;
    const withNormal = render(result, templateType);
    const withoutNormal = render({ ...result, certificate_dependency: undefined }, templateType);
    expect(withNormal).toBe(
      withoutNormal.replace(`DEP:${encargo().department}`, `DEP:${normal().department}`),
    );
  });

  it.each(['local', 'oracle', 'mixto'] as const)('el certificado conserva el contexto de la normal sin un cruce masivo (%s)', async source => {
    const profile = {
      id: 'perfil', combined_code: '202812', position_code: '2028', grade_code: '12',
      is_active: true, position_name: 'Profesional Especializado', hierarchical_level: 'Profesional',
      department_name: normal().organization_department, internal_group: normal().internal_group,
      functions: [{ ordinal: 1, description: 'Funcion aplicable' }],
    };
    const rows = [encargo(), normal()];
    const localRows = source === 'local' ? rows : source === 'mixto' ? [encargo()] : [];
    const oracleRows = source === 'local' ? [] : rows.map(row => ({ ...row, id: undefined }));
    const oracle = {
      isEnabled: () => source !== 'local',
      findSuggestedRequestsByPositionCodes: jest.fn().mockResolvedValue(oracleRows),
    };
    const functions = new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue([profile]), findOne: jest.fn().mockResolvedValue(profile) } as any,
      {} as any, { find: jest.fn().mockResolvedValue(localRows) } as any, {} as any, oracle as any,
    );
    const list = await functions.list();
    expect(list.items[0]).not.toHaveProperty('association_count');
    expect(oracle.findSuggestedRequestsByPositionCodes).not.toHaveBeenCalled();
    // Public issuance selects persisted requests after per-document Oracle sync.
    const selected = service.resolveRequestUsedForCertificate([
      ...localRows, ...oracleRows.map((row, index) => ({ ...row, id: `synced-${index}` })),
    ]);
    const resolution = await functions.resolveForRequest(selected!);
    expect(resolution.available).toBe(true);
    expect(resolution.profile?.id).toBe('perfil');
    expect(resolution.profile?.department_name).toBe(normal().organization_department);
    expect(resolution.profile?.internal_group).toBe(normal().internal_group);
  });

  it('nunca usa el contrato normal de otra persona', () => {
    const result = service.resolveRequestUsedForCertificate([encargo(), normal({ id_number: '999' })])!;
    expect(result.certificate_dependency).toBeUndefined();
    expect(result.hiring_date).toBe('2025-04-01');
  });

  it('no reemplaza la precedencia de un certificado corregido', () => {
    const assignment = encargo({ internal_group: null, cost_center: null });
    const certificate = {
      request_id: assignment.id, request: assignment,
      is_corrected: true, department: 'Dependencia corregida',
    } as Certificate;
    service['applyRequestContextToCertificate'](certificate, [assignment, normal()]);
    expect(certificate.request.certificate_dependency).toBeUndefined();
    const html = pdf['buildCertificateContent']({
      certificate, templateType: 'administrador', includeSalary: false,
      includeTechnicalBonus: false, templateHtml: '<p>[DEPENDENCIA]</p>',
    });
    expect(html).toContain('Dependencia corregida');
  });
});

describe('[DEPENDENCIA] en certificados corregidos', () => {
  const service = Object.create(CertificatesService.prototype) as CertificatesService;
  const pdf = Object.create(LaborCertificatePdfService.prototype) as LaborCertificatePdfService;

  // Caso real del certificado 12_620_700_20_CD 104: la solicitud trae el grupo
  // interno y la correccion cambio la dependencia del certificado.
  const solicitud = (overrides = {}) =>
    ({
      id: 'solicitud',
      id_number: '53062883',
      status: 'A',
      observations: 'E',
      position_category: 'Cra. Administrativa',
      career_category: 'Profesional Especializado Grado 16',
      cod_cargo: '2028',
      cod_grade: '16',
      hiring_date: '2024-05-14',
      department: 'Dirección de Talento Humano',
      organization_department: 'Dirección de Talento Humano',
      internal_group: 'Grupo de Administración de Personal y de Carrera Administrativa',
      cost_center: null,
      position_location: 'Grupo de Administración de Personal y de Carrera Administrativa',
      monthly_salary: 1000000,
      ...overrides,
    }) as unknown as CertificateRequest;

  const certificado = (overrides: Record<string, unknown> = {}) => {
    const request = solicitud();
    return {
      ...request,
      certificate_number: '12_620_700_20_CD 104',
      full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
      request,
      ...overrides,
    } as unknown as Certificate;
  };

  const render = (certificate: Certificate) =>
    pdf['buildCertificateContent']({
      certificate,
      templateType: 'administrador',
      includeSalary: true,
      includeTechnicalBonus: false,
      templateHtml: '<p>DEP:[DEPENDENCIA]</p><p>DATO7:[DATO7]</p>',
    });

  it('imprime la dependencia que guardó el coordinador y no el centro de costo', () => {
    const html = render(
      certificado({
        is_corrected: true,
        department: 'Dirección de Talento Humano CORREGIDA',
      }),
    );

    expect(html).toContain('DEP:Dirección de Talento Humano CORREGIDA');
    expect(html).toContain('DATO7:Dirección de Talento Humano CORREGIDA');
    expect(html).not.toContain('DEP:Grupo de Administración de Personal');
  });

  it('cae al centro de costo si la corrección dejó la dependencia vacía', () => {
    const html = render(certificado({ is_corrected: true, department: '' }));

    expect(html).toContain(
      'DEP:Grupo de Administración de Personal y de Carrera Administrativa',
    );
  });

  it('el certificado sin corregir imprime la dependencia de la solicitud', () => {
    const html = render(certificado({ is_corrected: false }));

    expect(html).toContain('DEP:Dirección de Talento Humano');
    expect(html).not.toContain(
      'DEP:Grupo de Administración de Personal y de Carrera Administrativa',
    );
  });

  it('precarga la corrección con la dependencia efectiva, no con la columna cruda', () => {
    // Sin corregir: el formulario debe arrancar con lo que imprime el PDF.
    expect(
      service['resolveEffectiveCertificateDependency'](certificado()),
    ).toBe('Dirección de Talento Humano');

    // Ya corregido: manda lo que quedó guardado en la corrección.
    expect(
      service['resolveEffectiveCertificateDependency'](
        certificado({ is_corrected: true, department: 'Dependencia corregida' }),
      ),
    ).toBe('Dependencia corregida');
  });

  it('una corrección que no toca la dependencia imprime exactamente lo mismo', () => {
    const original = certificado();
    const antes = render(original);

    // El formulario precarga la dependencia efectiva y el coordinador la deja
    // igual; al aprobar, ese valor queda en certificate.department.
    const corregido = certificado({
      is_corrected: true,
      department: service['resolveEffectiveCertificateDependency'](original),
    });

    expect(render(corregido)).toBe(antes.replace(/$^/, ''));
  });

  it('el snapshot de la corrección expone la dependencia efectiva', () => {
    const snapshot = service['certificateCorrectionSnapshot'](certificado());

    expect(snapshot.department).toBe('Dirección de Talento Humano');
  });
});
