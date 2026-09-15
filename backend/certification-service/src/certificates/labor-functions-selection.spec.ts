import { LaborFunctionsService } from './labor-functions.service';

/**
 * "Seleccionar todos" necesita los ids de TODAS las páginas, no solo la visible.
 * El endpoint recorre la paginación en el servidor y devuelve una forma compacta
 * (sin las funciones completas de cada perfil), aplicando exactamente el mismo
 * filtro de búsqueda que la tabla.
 */
describe('LaborFunctionsService.listAllForSelection', () => {
  const perfil = (index: number) => ({
    id: `profile-${index}`,
    position_code: '2028',
    grade_code: '12',
    combined_code: '202812',
    position_name: `PROFESIONAL ESPECIALIZADO ${index}`,
    hierarchical_level: 'Profesional',
    department_name: `DIRECCIÓN ${index}`,
    internal_group: null,
    cost_center: null,
    is_active: true,
    created_at: new Date('2026-01-01'),
    functions: [
      { ordinal: 1, description: 'Formular planes institucionales.' },
      { ordinal: 2, description: 'Presentar informes de gestión.' },
    ],
  });

  const buildService = (profiles: any[]) =>
    new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue(profiles) } as any,
      {} as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {} as any,
      { isEnabled: () => false } as any,
    );

  it('devuelve todos los perfiles aunque haya varias páginas', async () => {
    // 250 perfiles = 3 páginas de 100.
    const profiles = Array.from({ length: 250 }, (_, index) => perfil(index));
    const service = buildService(profiles);

    const result = await service.listAllForSelection();

    expect(result.total).toBe(250);
    expect(result.items).toHaveLength(250);
    // Sin ids repetidos entre páginas.
    expect(new Set(result.items.map((item) => item.id)).size).toBe(250);
  });

  it('respeta el filtro de búsqueda', async () => {
    const profiles = [
      { ...perfil(1), position_name: 'PROFESIONAL ESPECIALIZADO' },
      { ...perfil(2), position_name: 'SECRETARIO EJECUTIVO', combined_code: '421015' },
    ];
    const service = buildService(profiles);

    const result = await service.listAllForSelection({ search: 'secretario' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].position_name).toBe('SECRETARIO EJECUTIVO');
  });

  it('devuelve una forma compacta: sin el detalle de las funciones', async () => {
    const service = buildService([perfil(1)]);

    const result = await service.listAllForSelection();

    expect(result.items[0]).not.toHaveProperty('functions');
    // Pero sí los totales que muestra la confirmación de borrado.
    expect(result.items[0].function_count).toBe(2);
    expect(result.items[0]).toHaveProperty('association_count');
    expect(result.items[0]).toHaveProperty('combined_code');
  });

  it('no falla cuando no hay perfiles', async () => {
    const service = buildService([]);

    const result = await service.listAllForSelection();

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('coincide con el total que reporta la matriz', async () => {
    const profiles = Array.from({ length: 137 }, (_, index) => perfil(index));
    const service = buildService(profiles);

    const seleccion = await service.listAllForSelection();
    const matriz = await service.list();

    expect(seleccion.total).toBe(matriz.total);
    expect(seleccion.items).toHaveLength(matriz.total);
  });
});
