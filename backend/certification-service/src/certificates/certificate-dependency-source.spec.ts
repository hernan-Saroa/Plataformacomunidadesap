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
        certificate_dependency: base.internal_group,
      });
      const html = render(result, templateType);
      expect(html).toContain(`DEP:${base.internal_group}`);
      expect(html).toContain('Profesional Especializado');
      expect(html).toContain(templateType === 'administrador' ? 'Grado 12 (E)' : 'Codigo 2028 (E)');
      expect(html).toContain('5.099.764');
      expect(html).toContain('GRUPO:Ubicacion del encargo');
      expect(html).toContain('DATO7:Grupo del encargo');
      expect(base).not.toHaveProperty('certificate_dependency');
      expect(assignment).not.toHaveProperty('certificate_dependency');
    },
  );

  it.each([
    { internal_group: 'Grupo local', cost_center: 'Centro Oracle', expected: 'Grupo local' },
    { internal_group: 'N/A', cost_center: 'Centro Oracle', expected: 'Centro Oracle' },
    { internal_group: null, cost_center: null, expected: 'Direccion de Talento Humano' },
    { internal_group: null, cost_center: null, department: null, expected: 'Direccion de Talento Humano' },
    { internal_group: null, cost_center: null, department: null, organization_department: null, expected: '' },
  ])('resuelve las fuentes locales y Oracle sin completar con datos del encargo: $expected', ({ expected, ...fields }) => {
    const result = service.resolveRequestUsedForCertificate([encargo(), normal(fields)])!;
    expect(result.certificate_dependency).toBe(expected);
    expect(render(result)).toContain(`<p>DEP:${expected}</p>`);
  });

  it('descarta normales inactivas y elige la normal vigente mas reciente', () => {
    const requests = [
      encargo(), normal({ id: 'antigua', request_date: '2024-01-01', internal_group: 'Antiguo' }),
      normal({ id: 'inactiva', status: 'I', request_date: '2027-01-01', internal_group: 'Inactivo' }),
      normal({ id: 'vigente', request_date: '2026-04-01', internal_group: 'Vigente' }),
    ];
    expect(service.resolveRequestUsedForCertificate(requests)?.certificate_dependency).toBe('Vigente');
    expect(service.resolveRequestUsedForCertificate([...requests].reverse())?.certificate_dependency).toBe('Vigente');
  });

  it('conserva la prioridad del nombramiento principal de carrera administrativa', () => {
    const result = service.resolveRequestUsedForCertificate([
      encargo(), normal(), normal({ id: 'otra', position_category: 'Provisional', request_date: '2027-01-01', internal_group: 'Otro' }),
    ])!;
    expect(result.certificate_dependency).toBe(normal().internal_group);
  });

  it('sin encargo sigue usando el contrato normal seleccionado', () => {
    const result = service.resolveRequestUsedForCertificate([
      encargo({ status: 'I' }), normal(),
    ])!;
    expect(result.id).toBe('normal');
    expect(result.certificate_dependency).toBeUndefined();
    expect(render(result)).toContain(`DEP:${normal().internal_group}`);
    expect(result.monthly_salary).toBe(4772636);
  });

  it('sin normal vigente conserva el respaldo del encargo', () => {
    const result = service.resolveRequestUsedForCertificate([encargo(), normal({ status: 'I' })])!;
    expect(result.certificate_dependency).toBeUndefined();
    expect(render(result)).toContain('DEP:Grupo del encargo');
  });

  it('los encargos empatados conservan la misma dependencia normal', () => {
    const requests = [encargo({ id: 'e1', internal_group: null, cost_center: null }), encargo({ id: 'e2' }), normal()];
    for (const rows of [requests, [...requests].reverse()]) {
      expect(service.resolveRequestUsedForCertificate(rows)?.certificate_dependency).toBe(normal().internal_group);
    }
  });

  it('hidrata certificados existentes sin alterar el registro original', () => {
    const assignment = encargo();
    const certificate = { request_id: assignment.id, request: assignment } as Certificate;
    service['applyRequestContextToCertificate'](certificate, [assignment, normal()]);
    expect(certificate.request.certificate_dependency).toBe(normal().internal_group);
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
    expect(result.items[0].certificate_dependency).toBe(normal().internal_group);
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
    expect(withNormal).toBe(withoutNormal.replace('DEP:Grupo del encargo', `DEP:${normal().internal_group}`));
  });

  it.each(['local', 'oracle', 'mixto'] as const)('el contador y los asociados resuelven la normal de otro codigo (%s)', async source => {
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
    const associated = await functions.listAssociations('perfil');
    expect(list.items[0].association_count).toBe(1);
    expect(associated.total).toBe(1);
    expect(associated.items[0]).toMatchObject({
      combined_code: '202812', internal_group: normal().internal_group,
      department_name: normal().organization_department,
    });
    if (source !== 'local') {
      expect(oracle.findSuggestedRequestsByPositionCodes).toHaveBeenCalledWith(['202812'], 10000, true);
    }
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
