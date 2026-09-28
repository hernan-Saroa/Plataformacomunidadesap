import { LaborFunctionsService } from './labor-functions.service';

describe('Consulta individual por identificación', () => {
  const person = {
    id_number: '0012345678',
    full_name: 'Persona de prueba',
    monthly_salary: 9999,
    cod_cargo: '202824',
    cod_grade: '24',
    base_position_code: '2028',
    position_name: 'Profesional Especializado',
    department: 'Dirección de Talento Humano',
    internal_group: 'Grupo de Personal',
    position_category: 'Cra. Administrativa',
    hiring_date: '2024-05-14',
  };
  const profile = {
    id: 'p',
    id_number: person.id_number,
    is_active: true,
    functions: [
      { ordinal: 1, description: 'Atender solicitudes institucionales.' },
    ],
  };
  function fixture(
    local: any[] = [person],
    oracle: any[] = [],
    profiles: any[] = [profile],
  ) {
    const source = {
      isEnabled: () => true,
      findSuggestedRequestsBySearch: jest.fn(async () => oracle),
    };
    const service = new LaborFunctionsService(
      { find: jest.fn(async () => profiles) } as any,
      {} as any,
      { find: jest.fn(async () => local) } as any,
      {} as any,
      source as any,
    );
    return { service, source };
  }
  it('restaura los datos laborales y mantiene la asociación por identificación', async () => {
    const { service } = fixture();
    const item = (await service.lookupPerson(person.id_number)).items[0];
    expect(item).toMatchObject({
      id_number: person.id_number,
      position_category: 'Cra. Administrativa',
      matrix: {
        position_code: '2028',
        grade_code: '24',
        combined_code: '202824',
        position_name: 'Profesional Especializado',
        department_name: 'Dirección de Talento Humano',
        internal_group: 'Grupo de Personal',
      },
      functions_match_status: 'MATCHED',
      matched_profile: { id: 'p', function_count: 1 },
    });
    expect(item).not.toHaveProperty('monthly_salary');
  });
  it('elige una sola vinculación para el certificado y conserva la asociación por documento', async () => {
    const { service } = fixture(
      [{ ...person, id: 'base' }, { ...person, id: 'encargo', cod_cargo: '304516', cod_grade: '16', base_position_code: '3045' }],
    );
    const result = await service.lookupPerson(person.id_number, {
      selectPreferred: (rows) => rows.find((row) => row.id === 'encargo'),
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      origen: 'local',
      total_vinculaciones: 2,
      matrix: { combined_code: '304516', position_code: '3045' },
      matched_profile: { id: 'p' },
    });
  });
  it('prioriza el registro local cuando la misma vinculación está también en Oracle', async () => {
    const { service } = fixture([{
      ...person, id: 'local', full_name: 'Nombre local',
    }], [{ ...person, full_name: 'Nombre Oracle' }]);
    const item = (await service.lookupPerson(person.id_number)).items[0];
    expect(item).toMatchObject({ origen: 'local', full_name: 'Nombre local' });
    expect(item.total_vinculaciones).toBe(1);
  });
  it('no asocia otra persona del mismo cargo', async () => {
    const { service } = fixture([{ ...person, id_number: '99999999' }]);
    expect(
      (await service.lookupPerson('99999999')).items[0].matched_profile,
    ).toBeNull();
  });
  it('muestra registros laborales anteriores cercanos sin asignar sus funciones', async () => {
    const legacy = {
      id: 'legacy', id_number: null, combined_code: '202824',
      position_name: 'Profesional Especializado',
      hierarchical_level: 'Profesional',
      department_name: 'Dirección de Talento Humano',
      internal_group: 'Otro grupo', cost_center: null,
      is_active: true, functions: [{ ordinal: 1, description: 'Función anterior.' }],
    };
    const { service } = fixture([person], [], [legacy]);
    const item = (await service.lookupPerson(person.id_number)).items[0];
    expect(item.functions_match_status).toBe('NOT_FOUND');
    expect(item.matched_profile).toBeNull();
    expect(item.profiles_same_code).toBe(1);
    expect(item.near_matches[0]).toMatchObject({
      id: 'legacy', differing_fields: ['Grupo interno'],
    });
  });
  it('informa ambigüedad sin recomendar una asociación', async () => {
    const { service } = fixture(
      [person],
      [],
      [profile, { ...profile, id: 'duplicate' }],
    );
    expect(
      (await service.lookupPerson(person.id_number)).items[0],
    ).toMatchObject({
      matched_profile: null,
      functions_match_status: 'AMBIGUOUS',
    });
  });
  it('conserva consulta local cuando Oracle falla', async () => {
    const { service, source } = fixture();
    source.findSuggestedRequestsBySearch.mockRejectedValueOnce(
      new Error('Oracle no disponible'),
    );
    const result = await service.lookupPerson(person.id_number);
    expect(result.sources.oracleAvailable).toBe(false);
    expect(result.items[0].matched_profile?.id).toBe('p');
  });
  it('exige tres caracteres para una búsqueda de persona', async () => {
    await expect(fixture().service.lookupPerson('12')).rejects.toThrow(
      '3 caracteres',
    );
  });
});
