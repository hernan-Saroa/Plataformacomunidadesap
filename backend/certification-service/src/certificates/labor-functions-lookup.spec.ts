import { BadRequestException } from '@nestjs/common';
import { LaborFunctionsService } from './labor-functions.service';

/**
 * Consulta informativa de empleado: dice con qué datos exactos hay que crear el
 * perfil para que le cruce. Usa la MISMA resolución que el cruce real, así que
 * lo que aquí se reporta como "ya tiene perfil" es exactamente lo que el badge
 * de la matriz va a contar.
 */
describe('LaborFunctionsService.lookupPerson', () => {
  const perfilQueCruza = {
    id: 'profile-ok',
    position_code: '2028',
    grade_code: '14',
    combined_code: '202814',
    position_name: 'PROFESIONAL ESPECIALIZADO',
    hierarchical_level: 'Profesional',
    department_name: 'DIRECCIÓN DE TALENTO HUMANO',
    internal_group: 'GRUPO DE ADMINISTRACIÓN DE PERSONAL Y DE CARRERA ADMINISTRATIVA',
    cost_center: null,
    is_active: true,
    functions: [{ ordinal: 1, description: 'Formular planes institucionales.' }],
  };

  // Mismo cod_cargo, otro grupo interno: no le aplica a Diana.
  const perfilOtroGrupo = {
    ...perfilQueCruza,
    id: 'profile-otro',
    internal_group: 'GRUPO DE SEGURIDAD Y SALUD EN EL TRABAJO',
    functions: [
      { ordinal: 1, description: 'Atender el sistema de seguridad y salud.' },
    ],
  };

  const diana = (overrides: Record<string, unknown> = {}) => ({
    id: 'req-1',
    request_number: 'CL-0001',
    full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
    id_number: '53062883',
    document_type: 'CC',
    email: 'dianagut8425@gmail.com',
    status: 'APPROVED',
    hiring_date: '2024-05-14',
    position_category: 'Cra. Administrativa',
    cod_cargo: '202814',
    cod_grade: '14',
    base_position_code: '2028',
    hierarchical_level: 'PROFESIONAL',
    position_name: 'Profesional Especializado',
    organization_department: 'Dirección de Talento Humano',
    internal_group: 'Grupo de Administración de Personal y de Carrera Administrativa',
    cost_center: null,
    department: 'Dirección de Talento Humano',
    position_location: 'Dirección de Talento Humano',
    career_category: 'Profesional Especializado Grado 14',
    created_at: '2026-04-15T10:00:00.000Z',
    ...overrides,
  });

  /** Imita la selección real: activo con encargo primero, luego el más reciente. */
  const selectPreferred = (requests: any[]) => {
    const encargo = requests.find(
      (request) => String(request.observations || '').toUpperCase() === 'E',
    );
    return encargo || requests[0] || null;
  };

  const buildService = (opts: {
    profiles?: any[];
    localRequests?: any[];
    oracleRows?: any[];
    oracleEnabled?: boolean;
    oracleThrows?: boolean;
  }) => {
    const oracle = {
      isEnabled: () => opts.oracleEnabled ?? false,
      findSuggestedRequestsBySearch: jest.fn(async () => {
        if (opts.oracleThrows) throw new Error('ORA-12541: no listener');
        return opts.oracleRows || [];
      }),
      findSuggestedRequestsByPositionCodes: jest.fn(async () => []),
    };
    const service = new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue(opts.profiles || []) } as any,
      {} as any,
      { find: jest.fn().mockResolvedValue(opts.localRequests || []) } as any,
      {} as any,
      oracle as any,
    );
    return { service, oracle };
  };

  it('exige al menos 3 caracteres', async () => {
    const { service } = buildService({});
    await expect(service.lookupPerson('ab')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('devuelve los datos exactos con los que hay que crear el perfil', async () => {
    const { service } = buildService({ localRequests: [diana()], profiles: [] });

    const result = await service.lookupPerson('53062883');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].matrix).toEqual({
      position_code: '2028',
      grade_code: '14',
      combined_code: '202814',
      hierarchical_level: 'PROFESIONAL',
      position_name: 'Profesional Especializado',
      department_name: 'Dirección de Talento Humano',
      internal_group: 'Grupo de Administración de Personal y de Carrera Administrativa',
    });
  });

  it('avisa cuando la persona YA tiene un perfil que le cruza', async () => {
    const { service } = buildService({
      localRequests: [diana()],
      profiles: [perfilQueCruza],
    });

    const result = await service.lookupPerson('diana');

    expect(result.items[0].matched_profile?.id).toBe('profile-ok');
    expect(result.items[0].matched_profile?.function_count).toBe(1);
  });

  it('cuando no cruza, lista los perfiles del mismo cod_cargo para comparar', async () => {
    const { service } = buildService({
      localRequests: [diana()],
      profiles: [perfilOtroGrupo],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items[0].matched_profile).toBeNull();
    expect(result.items[0].near_matches).toHaveLength(1);
    expect(result.items[0].near_matches[0].internal_group).toBe(
      'GRUPO DE SEGURIDAD Y SALUD EN EL TRABAJO',
    );
    // El diagnóstico dice exactamente qué dato está distinto.
    expect(result.items[0].near_matches[0].differing_fields).toEqual([
      'Grupo interno',
    ]);
  });

  it('reproduce el caso real: grado distinto, cod_cargo distinto, no cruza', async () => {
    // El perfil está creado para 202816; la vinculación real es grado 14.
    const perfil202816 = {
      ...perfilQueCruza,
      id: 'profile-16',
      grade_code: '16',
      combined_code: '202816',
    };
    const { service } = buildService({
      localRequests: [diana()],
      profiles: [perfil202816],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items[0].matrix.combined_code).toBe('202814');
    expect(result.items[0].matched_profile).toBeNull();
    // Ni siquiera aparece como cercano: es otro cod_cargo.
    expect(result.items[0].near_matches).toHaveLength(0);
    expect(result.items[0].profiles_same_code).toBe(0);
  });

  it('encuentra a la persona en Oracle cuando no está en la tabla local', async () => {
    const { service } = buildService({
      localRequests: [],
      oracleEnabled: true,
      oracleRows: [diana({ id: undefined, request_number: null })],
      profiles: [perfilQueCruza],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].origen).toBe('oracle');
    expect(result.items[0].matched_profile?.id).toBe('profile-ok');
    expect(result.sources.oracleAvailable).toBe(true);
  });

  it('no repite la vinculación cuando está en local y en Oracle', async () => {
    const { service } = buildService({
      localRequests: [diana()],
      oracleEnabled: true,
      oracleRows: [diana({ id: undefined, request_number: null })],
      profiles: [],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].origen).toBe('local');
  });

  it('si Oracle falla responde igual con los datos locales', async () => {
    const { service } = buildService({
      localRequests: [diana()],
      oracleEnabled: true,
      oracleThrows: true,
      profiles: [],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items).toHaveLength(1);
    expect(result.sources.oracleAvailable).toBe(false);
  });

  it('muestra UNA sola vinculación por persona, no todas', async () => {
    // Diana aparece dos veces en la fuente laboral: grado 14 y grado 16.
    const { service } = buildService({
      localRequests: [
        diana({ id: 'req-14', cod_cargo: '202814', cod_grade: '14' }),
        diana({ id: 'req-16', cod_cargo: '202816', cod_grade: '16' }),
      ],
    });

    const result = await service.lookupPerson('53062883', { selectPreferred });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].total_vinculaciones).toBe(2);
  });

  it('usa la misma selección del certificado: el encargo vigente manda', async () => {
    const { service } = buildService({
      localRequests: [
        diana({ id: 'req-base', cod_cargo: '202814', cod_grade: '14', observations: 'N' }),
        diana({ id: 'req-encargo', cod_cargo: '202816', cod_grade: '16', observations: 'E' }),
      ],
    });

    const result = await service.lookupPerson('53062883', { selectPreferred });

    expect(result.items).toHaveLength(1);
    // Gana el encargo, igual que en el certificado.
    expect(result.items[0].matrix.combined_code).toBe('202816');
  });

  it('no lista decenas de perfiles: solo los que fallan por un único dato', async () => {
    const ruido = Array.from({ length: 25 }, (_, index) => ({
      ...perfilQueCruza,
      id: `ruido-${index}`,
      // Difieren en dependencia Y en grupo interno: no son cercanos.
      department_name: `DIRECCIÓN ${index}`,
      internal_group: `GRUPO ${index}`,
    }));
    const { service } = buildService({
      localRequests: [diana()],
      profiles: [...ruido, perfilOtroGrupo],
    });

    const result = await service.lookupPerson('53062883', { selectPreferred });

    expect(result.items[0].profiles_same_code).toBe(26);
    // Solo el que difiere en un único campo.
    expect(result.items[0].near_matches).toHaveLength(1);
    expect(result.items[0].near_matches[0].differing_fields).toEqual([
      'Grupo interno',
    ]);
  });

  it('con los datos reales de Diana devuelve el encargo ACTIVO, no el cargo base', async () => {
    // Filas reales en certification.certificate_requests para el 53062883:
    //   10551 · 202814 · grado 14 · observations N · status A  (cargo base)
    //   10552 · 202816 · grado 16 · observations E · status I  (encargo vencido)
    //   10553 · 202816 · grado 16 · observations E · status A  (encargo vigente)
    // El certificado imprime "Codigo 2028 Grado 16 (E)", asi que la consulta
    // debe decir 202816. El bug era descartar la 10553 por compartir documento
    // y cod_cargo con la 10552: se perdia justo la vinculacion activa.
    const filas = [
      diana({
        id: 'req-10551',
        request_number: '12_620_700_20_CD 10551',
        cod_cargo: '202814',
        cod_grade: '14',
        career_category: 'Profesional Especializado Grado 14',
        observations: 'N',
        status: 'A',
        hiring_date: '2024-05-14',
        request_date: null,
      }),
      diana({
        id: 'req-10552',
        request_number: '12_620_700_20_CD 10552',
        cod_cargo: '202816',
        cod_grade: '16',
        career_category: 'Profesional Especializado Grado 16',
        observations: 'E',
        status: 'I',
        hiring_date: '2025-04-01',
        request_date: '2025-04-30T00:00:00.000Z',
      }),
      diana({
        id: 'req-10553',
        request_number: '12_620_700_20_CD 10553',
        cod_cargo: '202816',
        cod_grade: '16',
        career_category: 'Profesional Especializado Grado 16',
        observations: 'E',
        status: 'A',
        hiring_date: '2025-05-01',
        request_date: '2025-05-01T00:00:00.000Z',
      }),
    ];
    const { service } = buildService({ localRequests: filas });

    const result = await service.lookupPerson('53062883', {
      // Selección real: entre las activas gana el encargo.
      selectPreferred: (requests: any[]) => {
        const activas = requests.filter((request) => request.status === 'A');
        return (
          activas.find(
            (request) => String(request.observations).toUpperCase() === 'E',
          ) ||
          activas[0] ||
          requests[0]
        );
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].total_vinculaciones).toBe(3);
    expect(result.items[0].matrix.combined_code).toBe('202816');
    expect(result.items[0].matrix.grade_code).toBe('16');
  });

  it('no descarta filas locales distintas que comparten documento y cod_cargo', async () => {
    const { service } = buildService({
      localRequests: [
        diana({ id: 'req-a', cod_cargo: '202816', cod_grade: '16', status: 'I' }),
        diana({ id: 'req-b', cod_cargo: '202816', cod_grade: '16', status: 'A' }),
      ],
    });

    const result = await service.lookupPerson('53062883', { selectPreferred });

    // Las dos llegan a la selección; antes solo sobrevivía la primera.
    expect(result.items[0].total_vinculaciones).toBe(2);
  });

  it('no expone el salario de la persona', async () => {
    const { service } = buildService({
      localRequests: [diana({ monthly_salary: 6326832, salary_text: 'SEIS MILLONES' })],
    });

    const result = await service.lookupPerson('53062883');

    expect(result.items[0]).not.toHaveProperty('monthly_salary');
    expect(result.items[0]).not.toHaveProperty('salary_text');
  });
});
