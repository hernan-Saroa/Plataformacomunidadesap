import { BadGatewayException, GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { BancoDocentesController } from './banco-docentes.controller';
import { syncRundProfilesFromAuth } from './rund-auth-sync';
import { RundAuthSyncOwner } from './rund-auth-sync-owner';

const roleId = '11111111-1111-4111-8111-111111111111';
const personId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const secondPersonId = '44444444-4444-4444-8444-444444444444';
const secondUserId = '55555555-5555-4555-8555-555555555555';
const person = (id = personId, user = userId) => ({ id, identification_number: '9000000001', full_name: 'DOCENTE PRUEBA',
  user: { id_user: user, public_id: '66666666-6666-4666-8666-666666666666', is_active: true,
    roles: [{ id: roleId, code: 'DOCENTE', is_active: true }] } });
const page = (data: any[] = [person()], total = data.length, current = 1, limit = 100) => ({ data, meta: { total, page: current, limit, totalPages: Math.ceil(total / limit) } });
const response = (body: any, status = 200) => new Response(JSON.stringify(body), { status });

describe('Sincronización RUND desde el contrato de auth', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let query: jest.Mock;
  let manager: { query: jest.Mock };
  let db: any;
  let roleLookup: jest.SpyInstance, revalidate: jest.SpyInstance;
  const envKeys = ['AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'RUND_AUTH_SYNC_TIMEOUT_MS', 'RUND_AUTH_SYNC_MAX_PAGES'];
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const actor = { actorId: 'operador-firmado', ip: '127.0.0.1' };
  const sync = () => syncRundProfilesFromAuth(db, 'http://auth.test:3001/', actor);

  beforeEach(() => {
    process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'credencial-ficticia';
    delete process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.RUND_AUTH_SYNC_TIMEOUT_MS;
    delete process.env.RUND_AUTH_SYNC_MAX_PAGES;
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response({ success: true, data: page() }));
    query = jest.fn().mockRejectedValue(new Error('No se permite SQL fuera de la transacción nativa'));
    roleLookup = jest.spyOn(RundAuthSyncOwner.prototype, 'rolDocente').mockResolvedValue(roleId);
    revalidate = jest.spyOn(RundAuthSyncOwner.prototype, 'revalidar').mockImplementation(async (pid) => ({
      id_person: pid, num_identificacion: '9000000001', dir_email: pid + '@example.test',
      territorial_id: '999', territorial_nombre: 'Territorial Prueba', sede_id: '10', usuario_activo: true, rol_docente_activo: true,
    }));
    manager = { query: jest.fn(async (sql: string, params: any[] = []) => {
      if (/auth\.|academic_work_plan\./.test(sql)) throw new Error('SQL de otro propietario');
      if (sql.includes('nextval(')) return [{ next_val: '10000' }];
      if (sql.includes('RETURNING id')) return [{ id: 'perfil-nuevo' }];
      return [];
    }) };
    db = { query, transaction: jest.fn(async work => work(manager)) };
  });
  afterEach(() => {
    fetchMock.mockRestore();
    roleLookup.mockRestore(); revalidate.mockRestore();
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  });

  it('usa /users, UUID de rol, credencial interna y orden estable sin reenviar la sesión del usuario', async () => {
    expect(await sync()).toEqual({ total: 1, created: 1, skipped: 0, failed: 0 });
    const [url, options] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe('/users');
    expect(parsed.searchParams.get('role')).toBe(roleId);
    expect(parsed.searchParams.get('status')).toBe('active');
    expect(parsed.searchParams.get('sortBy')).toBe('usuario');
    expect(options).toMatchObject({ headers: { 'x-internal-service-token': 'credencial-ficticia' }, redirect: 'error' });
    expect((options?.headers as any).Authorization).toBeUndefined();
    expect((options?.headers as any).Cookie).toBeUndefined();
    expect(query).not.toHaveBeenCalled();
    expect(manager.query.mock.calls.some(([sql]) => /auth\./.test(sql))).toBe(false);
    expect(revalidate).toHaveBeenCalledWith(personId, userId, roleId);
    const insert = manager.query.mock.calls.find(([sql]) => sql.includes('RETURNING id'))!;
    expect(insert[0]).toContain("'INACTIVO', 'PENDIENTE_APROBACION', 0");
    expect(insert[1][0]).toBe(personId);
    expect(insert[1][5]).toBe('RUND-10000');
    expect(manager.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO rund."RundCampoEstado"'))).toHaveLength(6);
    expect(manager.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO rund."RundAprobacionLog"'))?.[1]).toEqual([
      'perfil-nuevo', actor.actorId, actor.ip, expect.stringContaining('"modo":"solo_creacion"'),
    ]);
  });

  it('termina todas las páginas antes de escribir y admite respuestas directas/envolventes', async () => {
    fetchMock.mockImplementationOnce(async () => {
      expect(db.transaction).not.toHaveBeenCalled();
      return response({ success: true, data: page([person()], 2, 1, 1) });
    }).mockImplementationOnce(async () => {
      expect(db.transaction).not.toHaveBeenCalled();
      return response(page([person(secondPersonId, secondUserId)], 2, 2, 1));
    });
    expect(await sync()).toMatchObject({ total: 2, created: 2 });
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('page')).toBe('2');
  });

  it('la ausencia de docentes es distinta de un fallo del servicio', async () => {
    fetchMock.mockResolvedValue(response(page([])));
    expect(await sync()).toEqual({ total: 0, created: 0, skipped: 0, failed: 0 });
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('conserva íntegro cualquier perfil existente, sin reservar número ni crear bloques/auditoría', async () => {
    const original = manager.query.getMockImplementation()!;
    manager.query.mockImplementation((sql, params) => sql.startsWith('SELECT id FROM rund."Docente" WHERE "personaId"')
      ? Promise.resolve([{ id: 'perfil-con-periodo', estado: 'ACTIVO_RUND', puntajeSalarial: 145.5 }]) : original(sql, params));
    expect(await sync()).toEqual({ total: 1, created: 0, skipped: 1, failed: 0 });
    expect(manager.query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
    expect(manager.query.mock.calls.some(([sql]) => sql.includes('nextval'))).toBe(false);
  });

  it.each(['usuario_activo', 'rol_docente_activo'])('no reactiva una identidad cuyo %s cambió tras la consulta HTTP', async flag => {
    revalidate.mockResolvedValue({ usuario_activo: true, rol_docente_activo: true, [flag]: false });
    expect(await sync()).toMatchObject({ created: 0, skipped: 1 });
    expect(manager.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });

  it('no interpreta el public_id del usuario como el id interno y reporta el fallo de identidad', async () => {
    revalidate.mockResolvedValue(null);
    expect(await sync()).toEqual({ total: 1, created: 0, skipped: 0, failed: 1 });
    expect(manager.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });

  it('no apropia un correo ya asociado a otra persona', async () => {
    const original = manager.query.getMockImplementation()!;
    manager.query.mockImplementation((sql, params) => sql.includes('WHERE LOWER("correoInstitucional")') ? Promise.resolve([{ id: 'otro-perfil' }]) : original(sql, params));
    expect(await sync()).toMatchObject({ created: 0, failed: 1 });
    expect(manager.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });

  it.each([401, 403, 500])('no devuelve éxito vacío si auth responde %s', async status => {
    fetchMock.mockResolvedValue(response({ message: 'información que no debe copiarse' }, status));
    await expect(sync()).rejects.toThrow(BadGatewayException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('un fallo en una página posterior impide escribir la primera', async () => {
    fetchMock.mockResolvedValueOnce(response(page([person()], 2, 1, 1))).mockRejectedValueOnce(new Error('clave-ficticia que no debe exponerse'));
    await expect(sync()).rejects.toThrow('No fue posible consultar los docentes de auth.');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { success: false, data: page() }, { data: {} }, page([person()], 2, 1, 100),
    { ...page(), meta: { ...page().meta, totalPages: 1001 } },
    { ...page(), data: [{ ...person(), id: 'id-publico-incompatible' }] },
  ])('rechaza contratos incompletos/malformados antes de escribir', async payload => {
    fetchMock.mockResolvedValue(response(payload));
    await expect(sync()).rejects.toThrow(BadGatewayException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('detecta repeticiones y cambios del listado paginado', async () => {
    fetchMock.mockResolvedValueOnce(response(page([person()], 2, 1, 1))).mockResolvedValueOnce(response(page([person()], 2, 2, 1)));
    await expect(sync()).rejects.toThrow('repitió una identidad');
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('aborta por timeout y rechaza redirecciones sin exponer credenciales', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    await expect(sync()).rejects.toThrow(GatewayTimeoutException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('propaga la falla transaccional con un error público sin SQL ni datos de identidad', async () => {
    manager.query.mockRejectedValue(new Error('SQL privado con identificación'));
    await expect(sync()).rejects.toThrow('No fue posible completar la transacción de sincronización RUND.');
  });

  it('exige configuración explícita y no usa JWT_SECRET como credencial por defecto', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    await expect(sync()).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('acepta el token interno compartido cuando no se configuró el específico de auth', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    process.env.INTERNAL_SERVICE_TOKEN = 'compartido-ficticio';
    await sync();
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'x-internal-service-token': 'compartido-ficticio' });
  });

  it.each(['0', '-1', 'texto'])('rechaza un timeout inválido: %s', async value => {
    process.env.RUND_AUTH_SYNC_TIMEOUT_MS = value;
    await expect(sync()).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el controlador usa el actor firmado en el JWT y no una identidad suministrada por el body', async () => {
    const method = jest.fn().mockResolvedValue({ total: 0, created: 0, skipped: 0, failed: 0 });
    const controller = new BancoDocentesController({ syncFromAuthService: method } as any, {} as any);
    await controller.syncFromAuth({ user: { userId: 'actor-real', roles: ['SUPER_ADMIN'] }, ip: '127.0.0.1', body: { actorId: 'suplantado' } });
    expect(method).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ actorId: 'actor-real' }));
  });

  it('un fallo al resolver el rol impide listar o abrir la transacción nativa', async () => {
    roleLookup.mockRejectedValue(new Error('detalle privado'));
    await expect(sync()).rejects.toThrow('No fue posible resolver el rol DOCENTE activo de auth.');
    expect(fetchMock).not.toHaveBeenCalled(); expect(db.transaction).not.toHaveBeenCalled();
  });

  it('revalida después del advisory lock y aborta la transacción si Auth deja de responder', async () => {
    revalidate.mockImplementation(async () => {
      expect(manager.query.mock.calls.at(-1)?.[0]).toContain('pg_advisory_xact_lock');
      throw new Error('caída de Auth');
    });
    await expect(sync()).rejects.toThrow('No fue posible completar la transacción de sincronización RUND.');
    expect(manager.query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
  });
});
