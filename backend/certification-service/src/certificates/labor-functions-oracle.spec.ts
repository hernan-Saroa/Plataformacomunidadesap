import { LaborFunctionsService } from './labor-functions.service';

/**
 * En PRE los empleados llegan por Oracle y `certificate_request` solo se llena
 * bajo demanda (autoservicio y prima técnica, siempre por documento). Sin este
 * cruce, la matriz mostraba 0 asociados para perfiles que sí tienen gente.
 *
 * Estas pruebas fijan tres cosas: que Oracle suma, que no duplica a quien ya
 * está en local, y que si Oracle falla la matriz sigue funcionando igual que
 * antes con los datos locales.
 */
describe('LaborFunctionsService — asociados desde Oracle', () => {
  const profile = {
    id: 'profile-1',
    position_code: '2028',
    grade_code: '16',
    combined_code: '202816',
    position_name: 'PROFESIONAL ESPECIALIZADO',
    hierarchical_level: 'Profesional',
    department_name: 'DIRECCIÓN DE TALENTO HUMANO',
    department_key: 'direccion de talento humano',
    internal_group: 'GRUPO DE ADMINISTRACIÓN DE PERSONAL Y DE CARRERA ADMINISTRATIVA',
    internal_group_key: 'grupo de administracion de personal y de carrera administrativa',
    cost_center: null,
    is_active: true,
    functions: [
      { ordinal: 1, description: 'Formular planes institucionales.' },
      { ordinal: 2, description: 'Presentar informes de gestión.' },
    ],
  };

  const persona = (overrides: Record<string, unknown> = {}) => ({
    full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
    id_number: '53062883',
    cod_cargo: '202816',
    cod_grade: '16',
    base_position_code: '2028',
    hierarchical_level: 'PROFESIONAL',
    position_name: 'Profesional Especializado',
    organization_department: 'Dirección de Talento Humano',
    internal_group: 'Grupo de Administración de Personal y de Carrera Administrativa',
    cost_center: null,
    department: 'Dirección de Talento Humano',
    position_location: 'Dirección de Talento Humano',
    career_category: 'Profesional Especializado Grado 16',
    ...overrides,
  });

  const localRequest = (overrides: Record<string, unknown> = {}) => ({
    id: 'req-local-1',
    request_number: 'CL-0001',
    document_type: 'CC',
    email: 'esap.pruebas@gmail.com',
    campus: null,
    status: 'APPROVED',
    hiring_date: '2025-04-30',
    request_date: '2026-04-15T10:00:00.000Z',
    created_at: '2026-04-15T10:00:00.000Z',
    position_category: 'Profesional',
    ...persona(),
    ...overrides,
  });

  const buildService = (opts: {
    requests?: any[];
    oracleRows?: any[];
    oracleEnabled?: boolean;
    oracleThrows?: boolean;
  }) => {
    const profileRepo = {
      findOne: jest.fn().mockResolvedValue(profile),
      find: jest.fn().mockResolvedValue([profile]),
    };
    const oracle = {
      isEnabled: () => opts.oracleEnabled ?? true,
      findSuggestedRequestsByPositionCodes: jest.fn(async () => {
        if (opts.oracleThrows) throw new Error('ORA-12541: no listener');
        return opts.oracleRows || [];
      }),
    };
    const service = new LaborFunctionsService(
      profileRepo as any,
      {} as any,
      { find: jest.fn().mockResolvedValue(opts.requests || []) } as any,
      {} as any,
      oracle as any,
    );
    return { service, oracle };
  };

  it('lista a la persona aunque solo exista en Oracle y no en la tabla local', async () => {
    const { service } = buildService({ requests: [], oracleRows: [persona()] });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].full_name).toBe('DIANA MARIA GUTIERREZ RAMIREZ');
    expect(result.items[0].origen).toBe('oracle');
    expect(result.summary.fromOracle).toBe(1);
    expect(result.summary.fromLocal).toBe(0);
  });

  it('cuenta esa vinculación en el badge de la matriz', async () => {
    const { service } = buildService({ requests: [], oracleRows: [persona()] });

    const matriz = await service.list();
    const fila = matriz.items.find((item: any) => item.id === 'profile-1');

    expect(fila?.association_count).toBe(1);
    expect(matriz.stats.associatedRequests).toBe(1);
  });

  it('no cuenta dos veces a quien está en local y en Oracle a la vez', async () => {
    const { service } = buildService({
      requests: [localRequest()],
      oracleRows: [persona()], // mismo documento y mismo cargo
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    // La fila local manda: trae número de solicitud y estado reales.
    expect(result.items[0].origen).toBe('local');
    expect(result.items[0].request_number).toBe('CL-0001');
    expect(result.summary.associations).toBe(1);
  });

  it('suma personas distintas de cada fuente', async () => {
    const { service } = buildService({
      requests: [localRequest()],
      oracleRows: [persona({ id_number: '79999999', full_name: 'CARLOS RUIZ' })],
    });

    const result = await service.listAssociations('profile-1');

    expect(result.summary.associations).toBe(2);
    expect(result.summary.fromLocal).toBe(1);
    expect(result.summary.fromOracle).toBe(1);
    expect(result.summary.uniquePeople).toBe(2);
  });

  it('exige la misma coincidencia exacta a las filas de Oracle', async () => {
    // Otro grupo interno: no pertenece a este perfil aunque el cargo coincida.
    const { service } = buildService({
      requests: [],
      oracleRows: [
        persona({ internal_group: 'Grupo de Bienestar Social y Formación' }),
      ],
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(0);
    expect(result.summary.associations).toBe(0);
  });

  it('si Oracle falla, la matriz sigue funcionando con los datos locales', async () => {
    const { service } = buildService({
      requests: [localRequest()],
      oracleThrows: true,
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].origen).toBe('local');
    expect(result.summary.oracleAvailable).toBe(false);

    // Y el listado de la matriz tampoco revienta.
    await expect(service.list()).resolves.toBeDefined();
  });

  // ── Solo vinculaciones vigentes ──────────────────────────────────────
  // Un contrato terminado no genera certificado, asi que no aporta nada a la
  // matriz de funciones y solo estorba en el listado.

  it('no lista las vinculaciones inactivas', async () => {
    const { service } = buildService({
      requests: [
        localRequest({ id: 'req-activo', request_number: 'CL-A', status: 'A' }),
        localRequest({
          id: 'req-inactivo',
          request_number: 'CL-I',
          id_number: '79999999',
          full_name: 'CARLOS RUIZ',
          status: 'I',
        }),
      ],
      oracleRows: [],
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].request_number).toBe('CL-A');
    expect(result.summary.associations).toBe(1);
  });

  it('el badge cuenta lo mismo que lista el modal', async () => {
    const { service } = buildService({
      requests: [
        localRequest({ id: 'req-activo', request_number: 'CL-A', status: 'A' }),
        localRequest({
          id: 'req-inactivo',
          request_number: 'CL-I',
          id_number: '79999999',
          status: 'I',
        }),
      ],
      oracleRows: [],
    });

    const listado = await service.listAssociations('profile-1');
    const matriz = await service.list();
    const fila = matriz.items.find((item: any) => item.id === 'profile-1');

    expect(fila?.association_count).toBe(listado.summary.associations);
    expect(fila?.association_count).toBe(1);
  });

  it('tambien descarta las filas inactivas que llegan de Oracle', async () => {
    const { service } = buildService({
      requests: [],
      oracleRows: [
        persona({ id_number: '11111111', status: 'I' }),
        persona({ id_number: '22222222', status: 'A' }),
      ],
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id_number).toBe('22222222');
  });

  it('conserva la vinculacion cuando la fuente no informa estado', async () => {
    // Oracle puede no traer ESTADO: preferible mostrarla a que desaparezca.
    const { service } = buildService({
      requests: [],
      oracleRows: [persona({ id_number: '33333333', status: null })],
    });

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
  });

  it('pide status en la consulta: sin ese campo el badge contaba las inactivas', async () => {
    // Los mocks devuelven el objeto completo sin importar el `select`, asi que
    // un campo faltante no se nota en los demas tests. Aqui se verifica la
    // consulta misma: `status` tiene que viajar o el filtro de vigencia ve
    // undefined y deja pasar todo.
    const requestRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue([profile]) } as any,
      {} as any,
      requestRepo as any,
      {} as any,
      { isEnabled: () => false } as any,
    );

    await service.list();

    const opciones = requestRepo.find.mock.calls[0]?.[0];
    expect(opciones?.select?.status).toBe(true);
    // Y los campos que necesita el cruce exacto.
    expect(opciones?.select?.id_number).toBe(true);
    expect(opciones?.select?.internal_group).toBe(true);
    expect(opciones?.select?.cost_center).toBe(true);
  });

  it('no consulta Oracle cuando la integración está apagada', async () => {
    const { service, oracle } = buildService({
      requests: [localRequest()],
      oracleEnabled: false,
    });

    const result = await service.listAssociations('profile-1');

    expect(oracle.findSuggestedRequestsByPositionCodes).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.summary.oracleAvailable).toBe(false);
  });

  it('reutiliza la caché en lugar de golpear Oracle en cada consulta', async () => {
    const { service, oracle } = buildService({ requests: [], oracleRows: [persona()] });

    await service.listAssociations('profile-1');
    await service.listAssociations('profile-1');
    await service.listAssociations('profile-1');

    expect(oracle.findSuggestedRequestsByPositionCodes).toHaveBeenCalledTimes(1);
  });
});
