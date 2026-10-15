import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityClient } from './auth-identity.client';
import { RUND_PERMISSION_CODES } from '../auth/rund-permission-catalog';

describe('AuthIdentityClient', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const identity = { personaId: '11111111-1111-4111-8111-111111111111', documento: '123', nombreCompleto: 'Persona' };
  const client = new AuthIdentityClient();
  let send: jest.Mock;
  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_SERVICE_URL: 'http://auth.example.test', AUTH_INTERNAL_SERVICE_TOKEN: 'interno-ficticio' };
    send = jest.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ success: true, data: identity }) });
    global.fetch = send;
  });
  afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

  const permissions = () => ({ consulta: { roles: ['LECTOR'], codigos: RUND_PERMISSION_CODES }, items: [{ code: 'rund.view' }], total: 1 });
  it('permisos envía roles y catálogo del servidor por POST, con token interno, plazo y sin sesión de usuario', async () => {
    send.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: permissions() }) });
    await expect(client.permisosRoles(['LECTOR'])).resolves.toEqual(['rund.view']);
    expect(send).toHaveBeenCalledWith('http://auth.example.test/internal/rund/v1/personas/permisos-roles', {
      method: 'POST', redirect: 'error', signal: expect.anything(), body: JSON.stringify(permissions().consulta),
      headers: { 'x-internal-service-token': 'interno-ficticio', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });
  it('permisos vacíos requieren consulta confirmada y total cero, sin implicar otros permisos', async () => {
    send.mockResolvedValue({ ok: true, json: async () => ({ ...permissions(), items: [], total: 0 }) });
    await expect(client.permisosRoles(['LECTOR'])).resolves.toEqual([]);
  });
  it.each([
    {}, { items: [], total: 0 }, { ...permissions(), consulta: { ...permissions().consulta, roles: ['OTRO'] } },
    { ...permissions(), consulta: { ...permissions().consulta, codigos: ['rund.view'] } },
    { ...permissions(), items: [{ code: '*' }] }, { ...permissions(), items: [{ code: 'otro.admin' }] },
    { ...permissions(), items: ['rund.view'] }, { ...permissions(), items: [{ code: null }] },
    { ...permissions(), total: 2 }, { ...permissions(), total: '1' },
    { ...permissions(), items: [{ code: 'rund.view' }, { code: 'rund.view' }], total: 2 },
    { success: false, data: permissions() },
  ])('permisos rechaza contratos parciales o ajenos %s', async raw => {
    send.mockResolvedValue({ ok: true, json: async () => raw });
    await expect(client.permisosRoles(['LECTOR'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 403, 404, 500, 503])('permisos HTTP %s no significa lista de permisos vacía confirmada', async status => {
    send.mockResolvedValue({ status, ok: false, json: async () => permissions() });
    await expect(client.permisosRoles(['LECTOR'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('permisos no usa JWT_SECRET cuando falta el token interno', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN; process.env.JWT_SECRET = 'no-es-token';
    await expect(client.permisosRoles(['LECTOR'])).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each(['timeout', 'JSON', 'redirect'])('permisos rechaza %s sin exponer detalles privados', async mode => {
    if (mode === 'JSON') send.mockResolvedValue({ ok: true, json: async () => { throw new Error('detalle privado'); } });
    else send.mockRejectedValue(new Error('detalle privado'));
    await expect(client.permisosRoles(['LECTOR'])).rejects.toThrow('No fue posible confirmar la identidad en Auth.');
  });

  it('destinatario usa POST con clave literal en body y solo credencial interna', async () => {
    const clave = ' Usuario Ficticio @example.test ';
    send.mockResolvedValue({ ok: true, json: async () => ({ data: { consulta: clave, encontrado: true, usuarioId: identity.personaId } }) });
    await expect(client.destinatarioAviso(clave)).resolves.toBe(identity.personaId);
    expect(send).toHaveBeenCalledWith('http://auth.example.test/internal/rund/v1/personas/destinatario-aviso', {
      method: 'POST', redirect: 'error', signal: expect.anything(), body: JSON.stringify({ clave }),
      headers: { 'x-internal-service-token': 'interno-ficticio', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });
  it.each(['', ' actor '])('destinatario ausente solo es null con confirmación explícita para %s', async clave => {
    send.mockResolvedValue({ ok: true, json: async () => ({ consulta: clave, encontrado: false, usuarioId: null }) });
    await expect(client.destinatarioAviso(clave)).resolves.toBeNull();
  });
  it.each([{}, { consulta: 'otra', encontrado: false, usuarioId: null }, { consulta: 'actor', encontrado: false },
    { consulta: 'actor', encontrado: 'false', usuarioId: null }, { consulta: 'actor', encontrado: true, usuarioId: 'incorrecto' },
    { consulta: 'actor', encontrado: false, usuarioId: identity.personaId }, { consulta: 'actor', encontrado: true, usuarioId: null },
    { success: false, data: { consulta: 'actor', encontrado: false, usuarioId: null } }])('destinatario rechaza contrato parcial o ajeno %s', async body => {
    send.mockResolvedValue({ ok: true, json: async () => body });
    await expect(client.destinatarioAviso('actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 404, 409, 503])('destinatario HTTP %s no habilita el aplazamiento por ausencia', async status => {
    send.mockResolvedValue({ ok: false, status });
    await expect(client.destinatarioAviso('actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('destinatario no transforma errores de transporte en ausencia de cuenta', async () => {
    send.mockRejectedValue(new Error('DATOS_PRIVADOS'));
    await expect(client.destinatarioAviso('actor')).rejects.toThrow('No fue posible confirmar la identidad en Auth.');
  });

  it.each([identity, { success: true, data: identity }, { ...identity, nombreCompleto: null }])('acepta el contrato mínimo y el sobre de Auth', async data => {
    send.mockResolvedValue({ ok: true, status: 200, json: async () => data });
    await expect(client.porDocumento('123')).resolves.toEqual('data' in data ? data.data : data);
  });

  it('codifica el alias y envía solo el token de servicio, con plazo y sin redirecciones', async () => {
    await expect(client.resolver('user /?')).resolves.toBe(identity.personaId);
    expect(send).toHaveBeenCalledWith('http://auth.example.test/internal/rund/v1/personas/resolver/user%20%2F%3F', {
      method: 'GET', redirect: 'error', signal: expect.anything(),
      headers: { 'x-internal-service-token': 'interno-ficticio', Accept: 'application/json' },
    });
  });

  it('404 significa ausencia; por documento mantiene la excepción y por alias retorna null', async () => {
    send.mockResolvedValue({ status: 404, ok: false });
    await expect(client.porDocumento('123')).rejects.toBeInstanceOf(NotFoundException);
    await expect(client.resolver('ausente')).resolves.toBeNull();
  });

  it.each([null, [], {}, { success: false, data: identity }, { data: null }, { data: [] },
    { ...identity, documento: 'otro' }, { ...identity, personaId: 'no-uuid' },
    { personaId: identity.personaId, documento: '123' }, { ...identity, nombreCompleto: 42 }])('rechaza respuestas incompletas o de otra persona %s', async body => {
    send.mockResolvedValue({ status: 200, ok: true, json: async () => body });
    await expect(client.porDocumento('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 403, 409, 500, 503])('no convierte el error HTTP %s en ausencia', async status => {
    send.mockResolvedValue({ status, ok: false });
    await expect(client.resolver('alias')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('oculta errores de transporte y de parseo sin confirmar identidad', async () => {
    send.mockRejectedValue(new Error('detalle privado'));
    await expect(client.resolver('alias')).rejects.toThrow('No fue posible confirmar la identidad en Auth.');
    send.mockResolvedValue({ status: 200, ok: true, json: async () => { throw new Error('JSON privado'); } });
    await expect(client.porDocumento('123')).rejects.toThrow('No fue posible confirmar la identidad en Auth.');
  });

  it.each(['file:///tmp/auth', 'http://user:pass@auth.test', 'http://auth.test?x=1', 'http://auth.test#fragment', 'invalida'])('rechaza configuración URL inválida sin enviar el token', async url => {
    process.env.AUTH_SERVICE_URL = url;
    await expect(client.resolver('alias')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('sin credencial no llama a Auth aunque exista JWT_SECRET', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.JWT_SECRET = 'no-es-credencial-interna';
    await expect(client.resolver('alias')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('permite la credencial interna común cuando no se configura la específica', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    process.env.INTERNAL_SERVICE_TOKEN = 'comun-ficticia';
    await client.resolver('alias');
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun-ficticia');
  });

  it('perfil PTA conserva documento con ceros, nombre nullable y seccional bigint como texto', async () => {
    const data = { encontrada: true, ...identity, nombreCompleto: null, territorialId: '9007199254740993' };
    send.mockResolvedValue({ status: 200, ok: true, json: async () => ({ success: true, data }) });
    await expect(client.perfilPta('123')).resolves.toEqual(data);
    expect(send.mock.calls[0][0]).toBe('http://auth.example.test/internal/rund/v1/personas/perfil-pta/123');
  });

  it('perfil PTA devuelve null solo ante ausencia confirmada para el documento solicitado', async () => {
    send.mockResolvedValue({ status: 200, ok: true, json: async () => ({ encontrada: false, documento: '123' }) });
    await expect(client.perfilPta('123')).resolves.toBeNull();
  });

  it.each([{}, { encontrada: false }, { encontrada: false, documento: 'otro' },
    { encontrada: 'true', ...identity, territorialId: null }, { encontrada: true, ...identity },
    { encontrada: true, ...identity, territorialId: 1 }, { encontrada: true, ...identity, territorialId: '001' },
    { encontrada: true, ...identity, personaId: 'no-uuid', territorialId: null },
    { encontrada: true, ...identity, documento: 'otro', territorialId: null }])('perfil PTA rechaza identidad parcial o ajena %s', async data => {
    send.mockResolvedValue({ status: 200, ok: true, json: async () => ({ data }) });
    await expect(client.perfilPta('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 404, 409, 503])('perfil PTA no convierte HTTP %s en ausencia que permita un alta', async status => {
    send.mockResolvedValue({ status, ok: false });
    await expect(client.perfilPta('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  const ficha = { personaId: identity.personaId, num_identificacion: ' 001.23 ', tip_identificacion: 'CC',
    nom_largo: null, nom_tercero: 'DOS NOMBRES', pri_apellido: 'APELLIDO', seg_apellido: null,
    gen_tercero: null, fec_nacimiento: '1980-01-17', dir_email: null, tel_celular: '3001234567' };
  it.each(['fichaPorPersona', 'fichaPorDocumento'] as const)('%s conserva columnas, nulos, documento y nombre sin normalizar', async method => {
    const key = method === 'fichaPorPersona' ? ficha.personaId : ficha.num_identificacion;
    send.mockResolvedValue({ status: 200, ok: true, json: async () => ({ data: { consulta: key, encontrada: true, persona: ficha } }) });
    await expect(client[method](key)).resolves.toEqual(ficha);
    expect(send.mock.calls[0][0]).toContain(encodeURIComponent(key));
  });
  it.each(['fichaPorPersona', 'fichaPorDocumento'] as const)('%s devuelve null solo ante ausencia explícita', async method => {
    const key = method === 'fichaPorPersona' ? ficha.personaId : ficha.num_identificacion;
    send.mockResolvedValue({ ok: true, json: async () => ({ consulta: key, encontrada: false, persona: null }) });
    await expect(client[method](key)).resolves.toBeNull();
  });
  it.each([{}, { consulta: identity.personaId, encontrada: false },
    { consulta: 'otra', encontrada: false, persona: null }, { consulta: identity.personaId, encontrada: true, persona: {} },
    { consulta: identity.personaId, encontrada: false, persona: ficha },
    { consulta: identity.personaId, encontrada: true, persona: { ...ficha, dir_email: undefined } },
    { consulta: identity.personaId, encontrada: true, persona: { ...ficha, personaId: '22222222-2222-4222-8222-222222222222' } }])
  ('ficha rechaza identidad parcial o ajena %s', async body => {
    send.mockResolvedValue({ ok: true, json: async () => body });
    await expect(client.fichaPorPersona(identity.personaId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('ficha por documento no acepta un documento diferente al solicitado', async () => {
    send.mockResolvedValue({ ok: true, json: async () => ({ consulta: '123', encontrada: true, persona: ficha }) });
    await expect(client.fichaPorDocumento('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 404, 409, 503])('fichas y alias no confunden HTTP %s con ausencia', async status => {
    send.mockResolvedValue({ ok: false, status });
    for (const op of [() => client.fichaPorPersona(ficha.personaId), () => client.fichaPorDocumento('123'), () => client.personasPorAlias('123')]) {
      await expect(op()).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
  });
  it('alias conserva candidatas múltiples o ausencia confirmada', async () => {
    for (const personaIds of [[identity.personaId], []]) {
      send.mockResolvedValue({ ok: true, json: async () => ({ clave: ' 1.23 ', personaIds, total: personaIds.length }) });
      await expect(client.personasPorAlias(' 1.23 ')).resolves.toEqual(personaIds);
    }
  });
  it.each([{ clave: 'otra', personaIds: [], total: 0 }, { clave: '123', personaIds: [], total: 1 },
    { clave: '123', personaIds: ['no-uuid'], total: 1 }, { clave: '123', personaIds: [identity.personaId, identity.personaId], total: 2 }, {}])
  ('alias rechaza respuesta parcial, ajena o duplicada %s', async body => {
    send.mockResolvedValue({ ok: true, json: async () => body });
    await expect(client.personasPorAlias('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  const coincidencia = { personaId: identity.personaId, documento: '001.23', nombre: 'Nombre' };
  it('nombres confirma todos los lotes sin truncar, deduplica UUID y conserva ausencia frente a null', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => '11111111-1111-4111-8111-' + i.toString().padStart(12, '0'));
    send.mockImplementation(async (_url, options) => {
      const consulta = JSON.parse(options.body);
      const items = consulta.personaIds.filter(id => id !== ids[2]).map(id => ({ personaId: id, nombre: id === ids[1] ? null : 'Nombre', documento: null }));
      return { ok: true, json: async () => ({ consulta, items, total: items.length }) };
    });
    const result = await client.nombresPorPersonas([...ids, ids[0].toUpperCase()]);
    expect(result.size).toBe(1000); expect(result.get(ids[1])).toBeNull(); expect(result.has(ids[2])).toBe(false);
    expect(send.mock.calls.map(([, options]) => JSON.parse(options.body).personaIds.length)).toEqual([500, 500, 1]);
    expect(send.mock.calls.every(([, options]) => JSON.parse(options.body).documento === null)).toBe(true);
  });
  it('nombres vacíos no llaman Auth y un UUID inválido falla antes del transporte', async () => {
    expect(await client.nombresPorPersonas([])).toEqual(new Map()); expect(send).not.toHaveBeenCalled();
    await expect(client.nombresPorPersonas(['incorrecto'])).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
  it('nombres rechaza una persona ajena al lote aunque el resto del contrato sea válido', async () => {
    send.mockImplementation(async (_url, options) => ({ ok: true, json: async () => ({
      consulta: JSON.parse(options.body), items: [coincidencia], total: 1,
    }) }));
    await expect(client.nombresPorPersonas(['33333333-3333-4333-8333-333333333333'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('fallo del último lote descarta el resultado completo sin entregar snapshot parcial', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => '11111111-1111-4111-8111-' + i.toString().padStart(12, '0'));
    send.mockImplementationOnce(async (_url, options) => ({ ok: true, json: async () => ({
      consulta: JSON.parse(options.body), items: [], total: 0,
    }) })).mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(client.nombresPorPersonas(ids)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).toHaveBeenCalledTimes(2);
  });
  const consultaUnicidad = { tipo: 'unicidad', documento: '00123', personaIds: [identity.personaId] };
  it('coincidencias usa POST sin datos en URL y conserva el GET anterior', async () => {
    send.mockResolvedValue({ ok: true, json: async () => ({ consulta: consultaUnicidad, items: [coincidencia], total: 1 }) });
    await expect(client.coincidenciasUnicidad('00123', [identity.personaId])).resolves.toEqual([coincidencia]);
    expect(send).toHaveBeenCalledWith('http://auth.example.test/internal/rund/v1/personas/coincidencias', {
      method: 'POST', redirect: 'error', signal: expect.anything(), body: JSON.stringify(consultaUnicidad),
      headers: { 'x-internal-service-token': 'interno-ficticio', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });
  it('coincidencias confirma vacío solo con consulta, items y total explícitos', async () => {
    send.mockResolvedValue({ ok: true, json: async () => ({ consulta: consultaUnicidad, items: [], total: 0 }) });
    await expect(client.coincidenciasUnicidad('00123', [identity.personaId])).resolves.toEqual([]);
  });
  it('coincidencias por nombre/fecha conserva fecha y duplicados de documento entre personas diferentes', async () => {
    const consulta = { tipo: 'nombre-fecha', nombre: 'NOMBRE', fechaNacimiento: '1980-01-17' };
    const items = [coincidencia, { ...coincidencia, personaId: '22222222-2222-4222-8222-222222222222' }]
      .map(item => ({ ...item, fechaNacimiento: consulta.fechaNacimiento }));
    send.mockResolvedValue({ ok: true, json: async () => ({ data: { consulta, items, total: 2 } }) });
    await expect(client.coincidenciasNombreFecha('NOMBRE', '1980-01-17')).resolves.toEqual(items);
  });
  it.each([{}, { consulta: consultaUnicidad, items: [], total: 1 },
    { consulta: { ...consultaUnicidad, documento: 'otro' }, items: [], total: 0 },
    { consulta: { ...consultaUnicidad, personaIds: [] }, items: [], total: 0 },
    { consulta: consultaUnicidad, items: [coincidencia, coincidencia], total: 2 },
    { consulta: consultaUnicidad, items: [{ ...coincidencia, personaId: 'invalido' }], total: 1 },
    { consulta: consultaUnicidad, items: [{ personaId: identity.personaId, documento: '123' }], total: 1 },
    { success: false, data: { consulta: consultaUnicidad, items: [], total: 0 } }])
  ('coincidencias rechaza respuesta parcial, ajena o ambigua %s', async body => {
    send.mockResolvedValue({ ok: true, json: async () => body });
    await expect(client.coincidenciasUnicidad('00123', [identity.personaId])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('coincidencias de nombre/fecha no acepta fecha distinta u omitida', async () => {
    const consulta = { tipo: 'nombre-fecha', nombre: 'NOMBRE', fechaNacimiento: '1980-01-17' };
    for (const item of [coincidencia, { ...coincidencia, fechaNacimiento: '1981-01-17' }]) {
      send.mockResolvedValue({ ok: true, json: async () => ({ consulta, items: [item], total: 1 }) });
      await expect(client.coincidenciasNombreFecha('NOMBRE', '1980-01-17')).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
  });
  it.each([401, 404, 409, 503])('coincidencias HTTP %s no significa validación sin duplicados', async status => {
    send.mockResolvedValue({ ok: false, status });
    await expect(client.coincidenciasUnicidad('00123', [])).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.coincidenciasNombreFecha('NOMBRE', '1980-01-17')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
