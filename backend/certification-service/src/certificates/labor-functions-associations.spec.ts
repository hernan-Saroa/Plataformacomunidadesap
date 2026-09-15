import { NotFoundException } from '@nestjs/common';
import { LaborFunctionsService } from './labor-functions.service';

describe('LaborFunctionsService.listAssociations', () => {
  const profile = {
    id: 'profile-1',
    position_code: '2028',
    grade_code: '14',
    combined_code: '202814',
    position_name: 'PROFESIONAL ESPECIALIZADO',
    hierarchical_level: 'Profesional',
    department_name: 'DIRECCIÓN TERRITORIAL',
    department_key: 'direccion territorial',
    internal_group: 'GRUPO ACADÉMICO',
    internal_group_key: 'grupo academico',
    cost_center: null,
    is_active: true,
    functions: [
      { ordinal: 1, description: 'Formular planes institucionales.' },
      { ordinal: 2, description: 'Presentar informes de gestión.' },
    ],
  };

  // Mismo cod_cargo pero otra dependencia: no debe capturar las vinculaciones
  // del primero.
  const otherProfile = {
    ...profile,
    id: 'profile-2',
    department_name: 'DIRECCIÓN DE TALENTO HUMANO',
    department_key: 'direccion de talento humano',
    internal_group: 'GRUPO DE SEGURIDAD Y SALUD EN EL TRABAJO',
    internal_group_key: 'grupo de seguridad y salud en el trabajo',
  };

  const matchingRequest = (overrides: Record<string, unknown> = {}) => ({
    id: 'req-1',
    request_number: 'CL-0001',
    full_name: 'ANA MARÍA GÓMEZ',
    id_number: '1010101010',
    document_type: 'CC',
    email: 'ana.gomez@esap.edu.co',
    campus: 'Bogotá',
    status: 'APPROVED',
    hiring_date: '2020-03-01',
    request_date: '2026-01-15T10:00:00.000Z',
    created_at: '2026-01-15T10:00:00.000Z',
    cod_cargo: '202814',
    cod_grade: '14',
    base_position_code: '2028',
    hierarchical_level: 'PROFESIONAL',
    position_name: 'Profesional Especializado',
    position_category: 'Profesional',
    organization_department: 'Dirección Territorial',
    internal_group: 'Grupo Académico',
    cost_center: null,
    department: 'Dirección Territorial',
    position_location: 'Dirección Territorial',
    career_category: 'Profesional Especializado Grado 14',
    ...overrides,
  });

  const buildService = (profiles: any[], requests: any[]) =>
    new LaborFunctionsService(
      {
        findOne: jest
          .fn()
          .mockImplementation(async ({ where }: any) =>
            profiles.find((item) => item.id === where.id) || null,
          ),
        find: jest
          .fn()
          .mockImplementation(async (options: any) =>
            options?.where?.combined_code
              ? profiles.filter(
                  (item) => item.combined_code === options.where.combined_code,
                )
              : profiles,
          ),
      } as any,
      {} as any,
      { find: jest.fn().mockResolvedValue(requests) } as any,
      {} as any,
      { isEnabled: () => false } as any,
    );

  it('devuelve solo las vinculaciones que resuelven contra ese perfil exacto', async () => {
    const service = buildService(
      [profile, otherProfile],
      [
        matchingRequest(),
        // Coincide en cod_cargo pero pertenece al otro perfil.
        matchingRequest({
          id: 'req-2',
          request_number: 'CL-0002',
          full_name: 'CARLOS RUIZ',
          id_number: '2020202020',
          organization_department: 'Dirección de Talento Humano',
          department: 'Dirección de Talento Humano',
          position_location: 'Dirección de Talento Humano',
          internal_group: 'Grupo de Seguridad y Salud en el Trabajo',
        }),
        // Otro cod_cargo: nunca debe aparecer.
        matchingRequest({
          id: 'req-3',
          request_number: 'CL-0003',
          full_name: 'LUISA PEÑA',
          id_number: '3030303030',
          cod_cargo: '421015',
          cod_grade: '15',
          base_position_code: '4210',
        }),
      ],
    );

    const result = await service.listAssociations('profile-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].full_name).toBe('ANA MARÍA GÓMEZ');
    expect(result.items[0].request_number).toBe('CL-0001');
    expect(result.total).toBe(1);
    expect(result.summary.associations).toBe(1);
    expect(result.profile.id).toBe('profile-1');
    expect(result.profile.function_count).toBe(2);
  });

  it('coincide con el contador association_count: misma lógica de resolución', async () => {
    const requests = [
      matchingRequest(),
      matchingRequest({ id: 'req-2', request_number: 'CL-0002', id_number: '4040404040' }),
    ];
    const service = buildService([profile], requests);

    const listado = await service.listAssociations('profile-1');
    const matriz = await service.list();
    const fila = matriz.items.find((item: any) => item.id === 'profile-1');

    expect(listado.summary.associations).toBe(fila?.association_count);
    expect(listado.summary.associations).toBe(2);
  });

  it('cuenta personas únicas aunque tengan varias solicitudes', async () => {
    const service = buildService(
      [profile],
      [
        matchingRequest(),
        matchingRequest({ id: 'req-2', request_number: 'CL-0002' }), // mismo documento
        matchingRequest({ id: 'req-3', request_number: 'CL-0003', id_number: '5050505050' }),
      ],
    );

    const result = await service.listAssociations('profile-1');

    expect(result.summary.associations).toBe(3);
    expect(result.summary.uniquePeople).toBe(2);
  });

  it('filtra por nombre, documento y número de solicitud', async () => {
    const service = buildService(
      [profile],
      [
        matchingRequest(),
        matchingRequest({
          id: 'req-2',
          request_number: 'CL-0002',
          full_name: 'PEDRO NAVAJA',
          id_number: '9090909090',
        }),
      ],
    );

    const porNombre = await service.listAssociations('profile-1', { search: 'navaja' });
    expect(porNombre.items).toHaveLength(1);
    expect(porNombre.items[0].id_number).toBe('9090909090');
    // El resumen sigue reportando el total real, no el filtrado.
    expect(porNombre.summary.associations).toBe(2);

    const porDocumento = await service.listAssociations('profile-1', { search: '1010101010' });
    expect(porDocumento.items).toHaveLength(1);
    expect(porDocumento.items[0].full_name).toBe('ANA MARÍA GÓMEZ');

    const porSolicitud = await service.listAssociations('profile-1', { search: 'CL-0002' });
    expect(porSolicitud.items).toHaveLength(1);
    expect(porSolicitud.items[0].request_number).toBe('CL-0002');
  });

  it('pagina sin perder el total real', async () => {
    const requests = Array.from({ length: 7 }, (_, index) =>
      matchingRequest({
        id: `req-${index}`,
        request_number: `CL-000${index}`,
        id_number: `10000000${index}`,
      }),
    );
    const service = buildService([profile], requests);

    const primera = await service.listAssociations('profile-1', { page: 1, limit: 3 });
    expect(primera.items).toHaveLength(3);
    expect(primera.total).toBe(7);
    expect(primera.totalPages).toBe(3);

    const ultima = await service.listAssociations('profile-1', { page: 3, limit: 3 });
    expect(ultima.items).toHaveLength(1);
    expect(ultima.page).toBe(3);

    // Una página fuera de rango se ancla a la última disponible.
    const desbordada = await service.listAssociations('profile-1', { page: 99, limit: 3 });
    expect(desbordada.page).toBe(3);
    expect(desbordada.items).toHaveLength(1);
  });

  it('no expone el salario de las personas', async () => {
    const service = buildService([profile], [matchingRequest()]);
    const result = await service.listAssociations('profile-1');
    expect(result.items[0]).not.toHaveProperty('monthly_salary');
    expect(result.items[0]).not.toHaveProperty('salary_text');
  });

  it('lanza NotFound cuando el perfil no existe', async () => {
    const service = buildService([profile], []);
    await expect(service.listAssociations('inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('devuelve listado vacío sin romperse cuando no hay coincidencias', async () => {
    const service = buildService([profile], []);
    const result = await service.listAssociations('profile-1');
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.summary.uniquePeople).toBe(0);
  });
});
