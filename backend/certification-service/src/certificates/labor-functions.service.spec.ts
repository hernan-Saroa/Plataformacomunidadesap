import { LaborFunctionsService } from './labor-functions.service';
import { LaborFunctionProfile } from './labor-function-profile.entity';
import { ConflictException } from '@nestjs/common';

describe('Funciones asignadas por identificación', () => {
  const profile = {
    id: 'profile-1',
    id_number: '0012345678',
    is_active: true,
    functions: [
      { ordinal: 2, description: 'Presentar informes institucionales.' },
      {
        ordinal: 1,
        description: 'Aplicar el numeral 2. Revisar los expedientes.',
      },
    ],
  };
  const payload = {
    idNumber: '0012345678',
    functions:
      '1. Aplicar el numeral 2. Revisar los expedientes.\n2. Presentar informes institucionales.',
  };
  const buildService = (profiles: any[] = [profile]) =>
    new LaborFunctionsService(
      { find: jest.fn().mockResolvedValue(profiles) } as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: () => false } as any,
    );
  it('asocia por documento aunque cambien o falten todos los datos del cargo', async () => {
    const service = buildService();
    for (const request of [
      { id_number: '0012345678' },
      {
        id_number: '00.123.456-78',
        cod_cargo: 'OTRO',
        internal_group: 'OTRO',
        organization_department: 'OTRA',
      },
    ]) {
      const result = await service.resolveForRequest(request);
      expect(result).toMatchObject({
        available: true,
        count: 2,
        reason: 'MATCHED',
      });
      expect(result.functions[0].description).toBe(
        'Aplicar el numeral 2. Revisar los expedientes.',
      );
    }
  });
  it.each(['12345678', '0012345679', '', 'abc', 'abc0012345678'])(
    'no presta funciones a otro documento o uno inválido: %s',
    async (id_number) => {
      expect(
        (await buildService().resolveForRequest({ id_number })).available,
      ).toBe(false);
    },
  );
  it('ignora registros históricos sin identificación e inactivos', async () => {
    for (const patch of [{ id_number: null }, { is_active: false }]) {
      expect(
        (
          await buildService([{ ...profile, ...patch }]).resolveForRequest({
            id_number: profile.id_number,
          })
        ).reason,
      ).toBe('NOT_FOUND');
    }
  });
  it('rechaza duplicados ambiguos incluso si contienen las mismas funciones', async () => {
    const result = await buildService([
      profile,
      { ...profile, id: 'duplicate' },
    ]).resolveForRequest({ id_number: profile.id_number });
    expect(result.reason).toBe('AMBIGUOUS');
  });
  it('consulta el repositorio por identificación exacta y estado activo', async () => {
    const service = buildService();
    await service.resolveForRequest({ id_number: '00.123.456-78' });
    expect(service['profileRepo'].find).toHaveBeenCalledWith({
      where: { id_number: '0012345678', is_active: true },
      relations: ['functions'],
    });
  });
  it('valida filas nuevas, duplicados normalizados y documentos ya registrados', async () => {
    const service = buildService();
    const result = await service.validateBulk([
      { ...payload, idNumber: '1000000001', rowNumber: 4 },
      { ...payload, idNumber: '1.000.000.001', rowNumber: 5 },
      { ...payload, rowNumber: 6 },
      { ...payload, idNumber: '', rowNumber: 7 },
    ]);
    expect(result.summary).toMatchObject({ valid: 1, invalid: 3, toUpdate: 0 });
    expect(result.results.map((r) => r.status)).toEqual([
      'valid',
      'error',
      'error',
      'error',
    ]);
    expect(result.results[0]).toMatchObject({ id_number: '1000000001' });
  });
  it('valida una celda numerada con líneas de continuación cortas y cuenta funciones completas', async () => {
    const result = await buildService([]).validateBulk([{
      idNumber: '1000000001',
      rowNumber: 22,
      functions: '1. Revisar los pagos y verificar los descuentos\nlegales\n2. Consolidar los movimientos contables de manera\noportuna',
    }]);
    expect(result.results[0]).toMatchObject({
      rowNumber: 22,
      status: 'valid',
      function_count: 2,
    });
  });
  it('exige identificación también a clientes con el contrato antiguo', async () => {
    await expect(
      buildService().create({
        positionCode: '2028',
        functions: payload.functions,
      } as any),
    ).rejects.toThrow('identificación');
  });
  it('informa funciones duplicadas sin alterar referencias numéricas internas', async () => {
    const result = await buildService([]).validateBulk([
      {
        ...payload,
        functions: [
          profile.functions[0].description,
          profile.functions[0].description,
        ],
      },
    ]);
    expect(result.results[0]).toMatchObject({
      status: 'valid',
      function_count: 1,
    });
    expect(result.results[0].message).toContain('1 función');
  });
  it.each([null, [], Array(5001).fill(payload)])(
    'rechaza una carga vacía o excesiva',
    async (rows) => {
      await expect(buildService().validateBulk(rows as any)).rejects.toThrow();
    },
  );
  it('mantiene los registros heredados visibles y pendientes, sin exponer columnas del cargo', async () => {
    const service = buildService([
      { ...profile, id_number: null, position_code: '2028' },
    ]);
    const result = await service.list();
    expect(result.stats.pending).toBe(1);
    expect(result.items[0]).toMatchObject({
      id_number: null,
      needs_assignment: true,
      function_count: 2,
    });
    expect(result.items[0]).not.toHaveProperty('position_code');
  });
  it('ajusta la página y aplica un orden estable al listado', async () => {
    const service = buildService(
      Array.from({ length: 16 }, (_, i) => ({ ...profile, id: String(i) })),
    );
    expect(await service.list({ page: 24, limit: 15 })).toMatchObject({
      page: 2,
      totalPages: 2,
    });
    expect(service['profileRepo'].find).toHaveBeenCalledWith({
      relations: ['functions'],
      order: { created_at: 'DESC', id: 'ASC' },
    });
  });
  function persistence(existing: any = null, duplicate: any = null) {
    let stored: any;
    const profiles = {
      findOne: jest.fn(async ({ where }: any) =>
        where.id ? existing : duplicate,
      ),
      create: jest.fn((v) => v),
      save: jest.fn(
        async (v) => (stored = { ...v, id: existing?.id || 'new' }),
      ),
      findOneOrFail: jest.fn(async () => ({
        ...stored,
        functions: profile.functions,
      })),
    };
    const functions = {
      delete: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn(),
    };
    const source = {
      transaction: jest.fn(async (cb) =>
        cb({
          getRepository: (entity: any) =>
            entity === LaborFunctionProfile ? profiles : functions,
        }),
      ),
    };
    return {
      profiles,
      functions,
      source,
      service: new LaborFunctionsService(
        {} as any,
        {} as any,
        {} as any,
        source as any,
        {} as any,
      ),
    };
  }
  it('crea solo con identificación y funciones en una transacción', async () => {
    const { service, profiles, functions, source } = persistence();
    const result = await service.create(payload);
    expect(source.transaction).toHaveBeenCalledTimes(1);
    expect(profiles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id_number: payload.idNumber,
        match_key: 'document|0012345678',
      }),
    );
    expect(functions.save).toHaveBeenCalledWith([
      expect.objectContaining({
        ordinal: 1,
        description: 'Aplicar el numeral 2. Revisar los expedientes.',
      }),
      expect.objectContaining({
        ordinal: 2,
        description: 'Presentar informes institucionales.',
      }),
    ]);
    expect(result.action).toBe('created');
  });
  it('guarda completas las funciones numeradas que ocupan varios renglones', async () => {
    const { service, functions } = persistence();
    await service.create({
      idNumber: '1000000001',
      functions: '1. Revisar los pagos y verificar los descuentos\nlegales\n2. Consolidar los movimientos contables de manera\noportuna',
    });
    expect(functions.save).toHaveBeenCalledWith([
      expect.objectContaining({
        ordinal: 1,
        description: 'Revisar los pagos y verificar los descuentos legales',
      }),
      expect.objectContaining({
        ordinal: 2,
        description: 'Consolidar los movimientos contables de manera oportuna',
      }),
    ]);
  });
  it('actualiza sin fragmentar las funciones numeradas que ocupan varios renglones', async () => {
    const { service, functions } = persistence(profile);
    await service.update(profile.id, {
      idNumber: profile.id_number,
      functions: '1. Revisar los pagos y verificar los descuentos\nlegales\n2. Presentar informes institucionales.',
    });
    expect(functions.save).toHaveBeenCalledWith([
      expect.objectContaining({
        ordinal: 1,
        description: 'Revisar los pagos y verificar los descuentos legales',
      }),
      expect.objectContaining({
        ordinal: 2,
        description: 'Presentar informes institucionales.',
      }),
    ]);
  });
  it('asigna un registro heredado desde editar y reemplaza sus funciones', async () => {
    const { service, profiles, functions } = persistence({
      ...profile,
      id_number: null,
    });
    const result = await service.update(profile.id, payload);
    expect(profiles.findOne).toHaveBeenCalledWith({
      where: { id: profile.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(functions.delete).toHaveBeenCalledWith({ profile_id: profile.id });
    expect(result).toMatchObject({
      id_number: payload.idNumber,
      needs_assignment: false,
      action: 'updated',
    });
  });
  it('permite editar las funciones de la misma identificación', async () => {
    const { service } = persistence(profile, profile);
    expect((await service.update(profile.id, payload)).action).toBe('updated');
  });
  it.each(['create', 'update'])(
    'bloquea duplicados en %s sin borrar funciones',
    async (operation) => {
      const { service, profiles, functions } = persistence(profile, {
        ...profile,
        id: 'other',
      });
      await expect(
        operation === 'create'
          ? service.create(payload)
          : service.update(profile.id, payload),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(profiles.save).not.toHaveBeenCalled();
      expect(functions.delete).not.toHaveBeenCalled();
    },
  );
  it('convierte la colisión concurrente de la base en un conflicto comprensible', async () => {
    const { service, profiles } = persistence();
    profiles.save.mockRejectedValueOnce({ code: '23505' });
    await expect(service.create(payload)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('revalida al importar y no sobrescribe documentos ya existentes', async () => {
    const { service, profiles } = persistence(null, profile);
    const result = await service.bulk([payload]);
    expect(result.summary).toMatchObject({
      success: 0,
      failed: 1,
      created: 0,
      updated: 0,
    });
    expect(profiles.save).not.toHaveBeenCalled();
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
      { isEnabled: () => false } as any,
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
    const manager = {
      getRepository: jest.fn().mockReturnValue(profileRepository),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      { isEnabled: () => false } as any,
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
      { isEnabled: () => false } as any,
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
    const manager = {
      getRepository: jest.fn().mockReturnValue(profileRepository),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const service = new LaborFunctionsService(
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      { isEnabled: () => false } as any,
    );

    await expect(service.removeMany(ids)).rejects.toThrow(
      'No se eliminó ningún registro',
    );
    expect(profileRepository.remove).not.toHaveBeenCalled();
  });
});
