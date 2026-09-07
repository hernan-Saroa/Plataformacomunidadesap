import { LaborFunctionsService } from './labor-functions.service';

describe('LaborFunctionsService strict association', () => {
  const profile = {
    id: 'profile-1',
    position_code: '2028',
    grade_code: '24',
    combined_code: '202824',
    position_name: 'PROFESIONAL ESPECIALIZADO',
    hierarchical_level: 'Profesional',
    department_name: 'DIRECCIÓN DE FORMACIÓN',
    department_key: 'direccion de formacion',
    internal_group: 'GRUPO ACADÉMICO',
    internal_group_key: 'grupo academico',
    cost_center: 'CC-100',
    is_active: true,
    functions: [
      { ordinal: 1, description: 'Formular planes.' },
      { ordinal: 2, description: 'Presentar informes.' },
    ],
  };

  const buildService = (profiles: any[] = [profile]) =>
    new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue(profiles) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

  const exactRequest = {
    cod_cargo: '202824',
    cod_grade: '24',
    base_position_code: '2028',
    hierarchical_level: 'PROFESIONAL',
    position_name: 'Profesional Especializado',
    organization_department: 'Dirección de Formación',
    internal_group: 'Grupo Académico',
    cost_center: 'CC-100',
    department: 'CC-100',
    position_location: 'Dirección de Formación',
    career_category: 'Profesional Especializado Grado 24',
  };

  it('enables functions only when every supplied labor field matches', async () => {
    const result = await buildService().resolveForRequest(exactRequest as any);
    expect(result.available).toBe(true);
    expect(result.count).toBe(2);
    expect(result.profile?.id).toBe('profile-1');
  });

  it('maps the legacy platform department and position location to dependency and group', async () => {
    const legacyProfile = { ...profile, cost_center: 'N/A' };
    const result = await buildService([legacyProfile]).resolveForRequest({
      ...exactRequest,
      organization_department: null,
      internal_group: null,
      cost_center: null,
      department: 'Dirección de Formación',
      position_location: 'Grupo Académico',
    } as any);

    expect(result.available).toBe(true);
  });

  it.each([
    ['grade', { cod_grade: '23', cod_cargo: '202823' }],
    ['position name', { position_name: 'Profesional Universitario', career_category: 'Profesional Universitario Grado 24' }],
    ['hierarchical level', { hierarchical_level: 'Asistencial' }],
    ['department', { organization_department: 'Oficina Jurídica', position_location: 'Oficina Jurídica' }],
    ['internal group', { internal_group: 'Grupo Financiero' }],
    ['cost center', { cost_center: 'CC-999', department: 'CC-999' }],
  ])('rejects a same-code profile when %s differs', async (_field, patch) => {
    const result = await buildService().resolveForRequest({
      ...exactRequest,
      ...patch,
    } as any);
    expect(result.available).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  it('requires the canonical position denomination to match exactly', async () => {
    const result = await buildService().resolveForRequest({
      ...exactRequest,
      position_name: 'Profesional Universitario',
      career_category: 'Profesional Especializado Grado 24',
    } as any);

    expect(result.available).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  it('asocia correctamente un contrato cuyo grado 09 llega como 9', async () => {
    const zeroGradeProfile = {
      ...profile,
      id: 'profile-grade-09',
      position_code: '4064',
      grade_code: '09',
      combined_code: '406409',
      position_name: 'AUXILIAR DE SERVICIOS GENERALES',
      hierarchical_level: 'Asistencial',
      department_name: 'DIRECCIÓN TERRITORIAL',
      department_key: 'direccion territorial',
      internal_group: null,
      internal_group_key: null,
      cost_center: null,
    };
    const result = await buildService([zeroGradeProfile]).resolveForRequest({
      cod_cargo: '406409',
      cod_grade: '9',
      base_position_code: null,
      hierarchical_level: 'ASISTENCIAL',
      position_name: 'Auxiliar de Servicios Generales',
      organization_department: 'Dirección Territorial',
      internal_group: null,
      cost_center: null,
      department: 'Dirección Territorial',
      position_location: 'Dirección Territorial',
      career_category: 'Auxiliar de Servicios Generales Grado 9',
    } as any);

    expect(result.available).toBe(true);
    expect(result.profile?.id).toBe('profile-grade-09');
  });

  it('normaliza un registro individual válido y conserva los ceros iniciales', () => {
    const result = (buildService() as any).normalizePayload({
      positionCode: '0015',
      gradeCode: '',
      combinedCode: '0015',
      hierarchicalLevel: 'Directivo',
      positionName: 'Director Nacional',
      departmentName: 'Despacho Dirección Nacional',
      functions: '1. Dirigir los procesos institucionales. 2. Presentar informes de gestión.',
    });

    expect(result.position_code).toBe('0015');
    expect(result.combined_code).toBe('0015');
    expect(result.functions).toHaveLength(2);
  });

  it('acepta cod_cargo cuando el grado institucional comienza por cero', () => {
    const result = (buildService() as any).normalizePayload({
      positionCode: '4064',
      gradeCode: '09',
      combinedCode: '406409',
      hierarchicalLevel: 'Asistencial',
      positionName: 'Auxiliar de Servicios Generales',
      departmentName: 'Dirección Territorial',
      functions: '1. Apoyar la prestación de los servicios generales.',
    });

    expect(result.grade_code).toBe('09');
    expect(result.combined_code).toBe('406409');
  });

  it('rechaza cod_cargo cuando no coincide con código y grado', () => {
    expect(() => (buildService() as any).normalizePayload({
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202823',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Dirección de Formación',
      functions: '1. Formular planes institucionales.',
    })).toThrow('El valor esperado es 202824');
  });

  it.each([
    ['Nivel Jerárquico', { hierarchicalLevel: '' }],
    ['Dependencia/Área', { departmentName: '' }],
  ])('exige el campo institucional %s', (expectedMessage, patch) => {
    expect(() => (buildService() as any).normalizePayload({
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202824',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Dirección de Formación',
      functions: '1. Formular planes institucionales.',
      ...patch,
    })).toThrow(expectedMessage);
  });

  it('rechaza funciones duplicadas antes de persistir', () => {
    expect(() => (buildService() as any).normalizePayload({
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202824',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Dirección de Formación',
      functions: '1. Formular planes institucionales. 2. Formular planes institucionales.',
    })).toThrow(
      'funciones duplicadas: la función 2 repite la función 1: «Formular planes institucionales.»',
    );
  });

  it('valida todas las filas de una carga antes de persistir', async () => {
    const service = buildService([]);
    const result = await service.validateBulk([
      {
        rowNumber: 4,
        positionCode: '2028',
        gradeCode: '24',
        combinedCode: '202824',
        hierarchicalLevel: 'Profesional',
        positionName: 'Profesional Especializado',
        departmentName: 'Dirección de Formación',
        functions: '1. Formular planes institucionales.',
      },
      {
        rowNumber: 5,
        positionCode: '2028',
        gradeCode: '24',
        combinedCode: '202824',
        hierarchicalLevel: 'Profesional',
        positionName: '',
        departmentName: 'Dirección de Formación',
        functions: '1. Formular planes institucionales.',
      },
    ]);

    expect(result.summary).toEqual({
      total: 2,
      valid: 1,
      invalid: 1,
      toCreate: 1,
      toUpdate: 0,
    });
    expect(result.results[0]).toMatchObject({ rowNumber: 4, status: 'valid', action: 'created' });
    expect(result.results[1]).toMatchObject({ rowNumber: 5, status: 'error' });
  });

  it('bloquea en la carga masiva una combinación que ya existe', async () => {
    const payload = {
      rowNumber: 4,
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202824',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Dirección de Formación',
      internalGroup: 'Grupo Académico',
      costCenter: 'CC-100',
      functions: '1. Formular planes institucionales.',
    };
    const normalized = (buildService([]) as any).normalizePayload(payload);
    const service = buildService([{ ...profile, match_key: normalized.match_key }]);

    const result = await service.validateBulk([payload]);

    expect(result.summary).toEqual({
      total: 1,
      valid: 0,
      invalid: 1,
      toCreate: 0,
      toUpdate: 0,
    });
    expect(result.results[0]).toMatchObject({
      rowNumber: 4,
      status: 'error',
      action: null,
    });
    expect(result.results[0].message).toContain('ya existe en la matriz');
  });

  it('explica si una fila repetida es idéntica o tiene funciones diferentes', async () => {
    const baseRow = {
      positionCode: '2028',
      gradeCode: '19',
      combinedCode: '202819',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Oficina de Planeación',
      internalGroup: 'N/A',
      functions: '1. Preparar los informes institucionales.',
    };
    const result = await buildService([]).validateBulk([
      { ...baseRow, rowNumber: 35 },
      { ...baseRow, rowNumber: 36 },
      {
        ...baseRow,
        rowNumber: 37,
        functions: '1. Realizar el seguimiento a los indicadores institucionales.',
      },
    ]);

    expect(result.summary).toMatchObject({ total: 3, valid: 1, invalid: 2 });
    expect(result.results[1].message).toContain('idéntica a la fila 35');
    expect(result.results[2].message).toContain('funciones diferentes');
  });

  it('ajusta una página solicitada cuando queda por fuera del total disponible', async () => {
    const profiles = Array.from({ length: 16 }, (_, index) => ({
      ...profile,
      id: `profile-${index + 1}`,
      position_code: String(index + 1).padStart(4, '0'),
      combined_code: String(index + 1).padStart(4, '0'),
    }));
    const service = new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue(profiles) } as any,
      {} as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
    );

    const result = await service.list({ page: 24, limit: 15 });

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
  });

  it('lista primero los perfiles creados más recientemente', async () => {
    const findProfiles = jest.fn().mockResolvedValue([]);
    const service = new LaborFunctionsService(
      { find: findProfiles } as any,
      {} as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
    );

    await service.list({ page: 1, limit: 15 });

    expect(findProfiles).toHaveBeenCalledWith({
      relations: ['functions'],
      order: {
        created_at: 'DESC',
        position_code: 'ASC',
        grade_code: 'ASC',
        department_name: 'ASC',
      },
    });
  });

  it('edita un perfil y reemplaza sus funciones dentro de una transacción', async () => {
    const currentProfile = { ...profile, match_key: 'previous-match-key' };
    const profileRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(currentProfile)
        .mockResolvedValueOnce(currentProfile),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: currentProfile.id })),
      findOneOrFail: jest.fn(async () => ({
        ...currentProfile,
        position_name: 'PROFESIONAL ESPECIALIZADO ACTUALIZADO',
        functions: [
          { id: 'function-1', ordinal: 1, description: 'Actualizar los planes institucionales.' },
          { id: 'function-2', ordinal: 2, description: 'Presentar los informes de seguimiento.' },
        ],
      })),
    };
    const functionRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 2 }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce(profileRepository)
        .mockReturnValueOnce(functionRepository),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );

    const result = await service.update(currentProfile.id, {
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202824',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado Actualizado',
      departmentName: 'Dirección de Formación',
      internalGroup: 'Grupo Académico',
      costCenter: 'CC-100',
      functions:
        '1. Actualizar los planes institucionales. 2. Presentar los informes de seguimiento.',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(functionRepository.delete).toHaveBeenCalledWith({
      profile_id: currentProfile.id,
    });
    expect(functionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ ordinal: 1, description: 'Actualizar los planes institucionales.' }),
      expect.objectContaining({ ordinal: 2, description: 'Presentar los informes de seguimiento.' }),
    ]);
    expect(result).toMatchObject({ action: 'updated', function_count: 2 });
  });

  it('impide editar un perfil para convertirlo en una combinación ya existente', async () => {
    const currentProfile = { ...profile, id: 'profile-to-update', match_key: 'old-key' };
    const conflictingProfile = { ...profile, id: 'another-profile', match_key: 'new-key' };
    const profileRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(currentProfile)
        .mockResolvedValueOnce(conflictingProfile),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValueOnce(profileRepository).mockReturnValueOnce({}),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );

    await expect(service.update(currentProfile.id, {
      positionCode: '2028',
      gradeCode: '24',
      combinedCode: '202824',
      hierarchicalLevel: 'Profesional',
      positionName: 'Profesional Especializado',
      departmentName: 'Dirección de Formación',
      internalGroup: 'Grupo Académico',
      costCenter: 'CC-100',
      functions: '1. Formular los planes institucionales.',
    })).rejects.toThrow('Ya existe un registro con el mismo código');
  });

  it('elimina el perfil seleccionado y confirma el identificador eliminado', async () => {
    const profileRepository = {
      findOne: jest.fn().mockResolvedValue(profile),
      remove: jest.fn().mockResolvedValue(profile),
    };
    const service = new LaborFunctionsService(
      profileRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.remove(profile.id)).resolves.toEqual({
      id: profile.id,
      deleted: true,
    });
    expect(profileRepository.remove).toHaveBeenCalledWith(profile);
  });

  it('elimina múltiples perfiles en una sola transacción y devuelve el resumen', async () => {
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    const selectedProfiles = [
      { ...profile, id: ids[0], functions: [{ id: 'f-1' }, { id: 'f-2' }] },
      { ...profile, id: ids[1], functions: [{ id: 'f-3' }] },
    ];
    const profileRepository = {
      find: jest.fn().mockResolvedValue(selectedProfiles),
      remove: jest.fn().mockResolvedValue(selectedProfiles),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(profileRepository) };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );

    await expect(service.removeMany([...ids, ids[0]])).resolves.toEqual({
      deleted: true,
      deletedCount: 2,
      functionCount: 3,
      ids,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(profileRepository.find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
      relations: ['functions'],
    });
    expect(profileRepository.remove).toHaveBeenCalledWith(selectedProfiles);
  });

  it('rechaza una eliminación múltiple vacía o con identificadores inválidos', async () => {
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      { transaction: jest.fn() } as any,
    );

    await expect(service.removeMany([])).rejects.toThrow(
      'Selecciona al menos un registro',
    );
    await expect(service.removeMany(['registro-invalido'])).rejects.toThrow(
      'identificadores de registro inválidos',
    );
  });

  it('no elimina parcialmente si uno de los perfiles seleccionados ya no existe', async () => {
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];
    const profileRepository = {
      find: jest.fn().mockResolvedValue([{ ...profile, id: ids[0] }]),
      remove: jest.fn(),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(profileRepository) };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
    );

    await expect(service.removeMany(ids)).rejects.toThrow(
      'No se eliminó ningún registro',
    );
    expect(profileRepository.remove).not.toHaveBeenCalled();
  });
});
