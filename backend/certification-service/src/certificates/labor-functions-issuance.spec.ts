import { CertificatesService } from './certificates.service';
import { LaborFunctionsService } from './labor-functions.service';

describe('Public issuance keeps authoritative per-person matching', () => {
  function fixture(oracleEnabled = true) {
    const request: any = {
      id: 'request-1', id_number: '12345678', document_type: 'CC', full_name: 'Persona de prueba',
      status: 'A', observations: 'N', position_category: 'Cra. Administrativa',
      career_category: 'Profesional', position_name: 'Profesional',
      cod_cargo: '202812', cod_grade: '12', hierarchical_level: 'Profesional',
      organization_department: 'Dirección', department: 'Dirección', internal_group: 'Grupo',
      hiring_date: new Date('2020-01-01'), created_at: new Date('2020-01-01'),
      monthly_salary: 1234567, salary_text: 'SALARIO ORIGINAL', email: 'persona@example.test',
    };
    let profiles: any[] = [{
      id: 'profile-1', is_active: true, combined_code: '202812', position_code: '2028', grade_code: '12',
      position_name: 'Profesional', hierarchical_level: 'Profesional', department_name: 'Dirección',
      internal_group: 'Grupo', functions: [{ ordinal: 1, description: 'Función vigente.' }],
    }];
    const profileRepo = { find: jest.fn(async () => profiles) };
    const functions = new LaborFunctionsService(profileRepo as any, {} as any, {} as any, {} as any, {} as any);
    const service = Object.create(CertificatesService.prototype) as CertificatesService;
    const query: any = { where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(), getMany: jest.fn(async () => [request]) };
    const certificates = { count: jest.fn(async () => 0), create: jest.fn(v => v),
      save: jest.fn(async v => ({ ...v, id: 'certificate-1' })), findOne: jest.fn(async () => null) };
    Object.assign(service, {
      laborFunctionsService: functions,
      requestRepo: { createQueryBuilder: jest.fn(() => query) }, certificateRepo: certificates,
      signerRepo: { findOne: jest.fn(async () => ({ full_name: 'Firmante', position: 'Jefatura', department: 'Dirección' })) },
      templateConfigService: { getActiveConfig: jest.fn(async () => null) }, logger: { warn: jest.fn() },
    });
    jest.spyOn(service, 'findSolicitudById').mockResolvedValue(request);
    const sync = jest.spyOn(service as any, 'syncRequestsFromOracle').mockResolvedValue({
      enabled: oracleEnabled, found: true, synced: oracleEnabled,
    });
    jest.spyOn(service as any, 'findLocalRequestsByDocument').mockResolvedValue([request]);
    jest.spyOn(service as any, 'resolveTechnicalBonusForRequest').mockResolvedValue({
      available: false, value: 0, percentage: 0, category: null, items: [],
    });
    return { service, functions, request, certificates, query, sync, profileRepo,
      removeProfiles: () => { profiles = []; },
      makeAmbiguous: () => { profiles = [...profiles, { ...profiles[0], id: 'conflict', functions: [{ ordinal: 1, description: 'Otra función.' }] }]; },
    };
  }

  it.each([true, false])('matches the requested employee and stores functions without changing salary/source fields (Oracle=%s)', async enabled => {
    const { service, sync, query, certificates, request } = fixture(enabled);
    const eligibility = await service.verificarDocumentoPorSolicitud('12345678');
    expect(sync).toHaveBeenCalledWith('12345678');
    expect(eligibility).toMatchObject({ existe: true, functions_available: true, functions_count: 1 });
    await service.createCertificado(request.id, { includeFunctions: true, includeSalary: true });
    expect(query.where).toHaveBeenCalledWith('request.id_number = :documento', { documento: '12345678' });
    expect(certificates.save).toHaveBeenCalledWith(expect.objectContaining({
      id_number: request.id_number, full_name: request.full_name, monthly_salary: request.monthly_salary,
      salary_text: request.salary_text, include_functions: true,
      functions_snapshot: expect.objectContaining({ profile_id: 'profile-1', functions: [{ ordinal: 1, description: 'Función vigente.' }] }),
    }));
  });

  it('revalidates at issuance when a profile was removed after the initial check', async () => {
    const { service, certificates, request, removeProfiles } = fixture();
    expect((await service.verificarDocumentoPorSolicitud(request.id_number)).functions_available).toBe(true);
    removeProfiles();
    await expect(service.createCertificado(request.id, { includeFunctions: true })).rejects.toThrow('No es posible incluir funciones');
    expect(certificates.save).not.toHaveBeenCalled();
  });

  it('rejects ambiguous functions on the server regardless of the client checkbox', async () => {
    const { service, certificates, request, makeAmbiguous } = fixture();
    makeAmbiguous();
    await expect(service.createCertificado(request.id, { includeFunctions: true })).rejects.toThrow('No es posible incluir funciones');
    expect(certificates.save).not.toHaveBeenCalled();
  });

  it('still issues without functions when no matching profile exists', async () => {
    const { service, certificates, request, removeProfiles, profileRepo } = fixture(false);
    removeProfiles();
    await service.createCertificado(request.id, { includeFunctions: false, includeSalary: false });
    expect(profileRepo.find).not.toHaveBeenCalled();
    expect(certificates.save).toHaveBeenCalledWith(expect.objectContaining({ include_functions: false,
      functions_snapshot: null, include_salary: false, monthly_salary: request.monthly_salary }));
  });
});
