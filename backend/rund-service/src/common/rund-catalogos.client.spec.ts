import { ServiceUnavailableException } from '@nestjs/common';
import { RundCatalogosClient } from './rund-catalogos.client';

describe('RundCatalogosClient', () => {
  const originalEnv = { ...process.env }, originalFetch = global.fetch;
  const client = new RundCatalogosClient();
  let send: jest.Mock;
  const reply = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body });
  const personaId = '11111111-1111-4111-8111-111111111111';
  const nombre = { personaId, primer_nombre: ' José ', segundo_nombre: null, primer_apellido: 'Muñoz', segundo_apellido: '' };
  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_SERVICE_URL: 'http://auth.test', ACADEMIC_WORK_PLAN_SERVICE_URL: 'http://pta.test',
      AUTH_INTERNAL_SERVICE_TOKEN: 'auth-ficticio', PTA_INTERNAL_SERVICE_TOKEN: 'pta-ficticio' };
    send = jest.fn(); global.fetch = send;
  });
  afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

  const program = () => ({ consulta: { programaIds: ['9007199254740993'] }, items: [{ id: '9007199254740993', nombre: ' Histórico ' }], total: 1 });
  it('programas consulta PTA por POST con token propio y conserva precisión y nombre sin recortar', async () => {
    send.mockResolvedValue(reply({ success: true, data: program() }));
    await expect(client.programasHistoricos(['9007199254740993'])).resolves.toEqual(program().items);
    expect(send).toHaveBeenCalledWith('http://pta.test/internal/rund/v1/catalogos/programas-historicos', {
      method: 'POST', redirect: 'error', signal: expect.anything(), body: JSON.stringify(program().consulta),
      headers: { 'x-internal-service-token': 'pta-ficticio', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });
  it('programas vacíos no consultan y una ausencia solo vale con echo/total confirmados', async () => {
    await expect(client.programasHistoricos([])).resolves.toEqual([]); expect(send).not.toHaveBeenCalled();
    send.mockResolvedValue(reply({ ...program(), items: [], total: 0 }));
    await expect(client.programasHistoricos(['9007199254740993'])).resolves.toEqual([]);
  });
  it('deduplica y divide más de 500 candidatos sin truncar ni publicar un resultado parcial', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => String(i));
    send.mockImplementation(async (_url, options) => {
      const consulta = JSON.parse(options.body); return reply({ consulta, items: consulta.programaIds.map(id => ({ id, nombre: '' })), total: consulta.programaIds.length });
    });
    expect((await client.programasHistoricos([...ids, '0'])).map(item => item.id)).toEqual(ids); expect(send).toHaveBeenCalledTimes(2);
    send.mockClear(); send.mockRejectedValueOnce(new Error('fallo inicial'));
    await expect(client.programasHistoricos(ids)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('acepta alias numéricos sin cambiar las claves canónicas de salida usadas por el historial', async () => {
    send.mockResolvedValue(reply({ consulta: { programaIds: ['0001', '+1'] }, items: [{ id: '1', nombre: 'NOMBRE' }], total: 1 }));
    await expect(client.programasHistoricos(['0001', '+1'])).resolves.toEqual([{ id: '1', nombre: 'NOMBRE' }]);
  });
  it.each(['no-id', '1.0', '1e3', '0x10', '', '9223372036854775808', '-9223372036854775809'])('programas rechaza ID incompatible %s antes de la red', async id => {
    await expect(client.programasHistoricos([id])).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each([{}, { items: [], total: 0 }, { ...program(), total: 2 }, { ...program(), consulta: { programaIds: [] } },
    { ...program(), items: [{ id: 9007199254740992, nombre: 'INCORRECTO' }] },
    { ...program(), items: [{ id: '2', nombre: 'AJENO' }] }, { ...program(), items: [{ id: '9007199254740993', nombre: null }] },
    { ...program(), items: [...program().items, ...program().items], total: 2 }, { success: false, data: program() }])('programas rechaza contrato incompatible %s', async raw => {
    send.mockResolvedValue(reply(raw)); await expect(client.programasHistoricos(['9007199254740993'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 403, 404, 500, 503])('programas HTTP %s nunca confirma ausencia', async status => {
    send.mockResolvedValue(reply(program(), status)); await expect(client.programasHistoricos(['9007199254740993'])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('programas falla completo si el segundo lote no responde', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => String(i));
    send.mockImplementationOnce(async (_url, options) => reply({ consulta: JSON.parse(options.body), items: [{ id: '1', nombre: 'PRIMERO' }], total: 1 }))
      .mockRejectedValueOnce(new Error('segundo lote caído'));
    await expect(client.programasHistoricos(ids)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).toHaveBeenCalledTimes(2);
  });
  it('programas no usa el token de Auth ni JWT_SECRET si falta PTA y la credencial común', async () => {
    delete process.env.PTA_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN; process.env.JWT_SECRET = 'no-es-token';
    await expect(client.programasHistoricos(['1'])).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });

  const identidad = { personaId, primer_nombre: ' José ', segundo_nombre: null, primer_apellido: 'Muñoz', segundo_apellido: '', identificacion: ' 00.123 ' };
  const historical = () => ({ consulta: { personaIds: [personaId] }, items: [identidad], total: 1 });
  it('lote histórico envía POST solo a PTA con credencial interna, echo y partes/documento sin transformar', async () => {
    send.mockResolvedValue(reply({ success: true, data: historical() }));
    await expect(client.identidadesHistoricas([personaId])).resolves.toEqual([identidad]);
    expect(send).toHaveBeenCalledWith('http://pta.test/internal/rund/v1/personas/identidades-historicas', {
      method: 'POST', redirect: 'error', signal: expect.anything(), body: JSON.stringify({ personaIds: [personaId] }),
      headers: { 'x-internal-service-token': 'pta-ficticio', Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  });
  it('lote vacío no depende del propietario y los IDs inválidos se rechazan antes de la red', async () => {
    await expect(client.identidadesHistoricas([])).resolves.toEqual([]);
    await expect(client.identidadesHistoricas(['incompatible'])).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
  it('divide más de 500 UUID únicos sin truncar y deduplica mayúsculas sin modificar la lista recibida', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => 'abcdef00-1111-4111-8111-' + String(i).padStart(12, '0'));
    send.mockImplementation(async (_url, options) => {
      const consulta = JSON.parse(options.body);
      return reply({ consulta, items: consulta.personaIds.map(personaId => ({ ...identidad, personaId })), total: consulta.personaIds.length });
    });
    const input = [...ids, ids[0].toUpperCase()];
    const result = await client.identidadesHistoricas(input);
    expect(result.map(item => item.personaId)).toEqual(ids); expect(input).toHaveLength(502);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([, opts]) => JSON.parse(opts.body).personaIds.length)).toEqual([500, 1]);
  });
  it('lote sin coincidencias solo es vacío con consulta confirmada', async () => {
    send.mockResolvedValue(reply({ ...historical(), items: [], total: 0 }));
    await expect(client.identidadesHistoricas([personaId])).resolves.toEqual([]);
  });
  it.each([{}, { items: [], total: 0 }, { ...historical(), total: 2 },
    { ...historical(), consulta: { personaIds: [] } }, { ...historical(), items: [{ ...identidad, identificacion: undefined }] },
    { ...historical(), items: [{ ...identidad, personaId: '22222222-2222-4222-8222-222222222222' }] },
    { ...historical(), items: [identidad, identidad], total: 2 }, { success: false, data: historical() }])('lote rechaza contratos incompletos o ajenos %s', async raw => {
    send.mockResolvedValue(reply(raw)); await expect(client.identidadesHistoricas([personaId])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 403, 404, 500, 503])('lote HTTP %s no es ausencia histórica confirmada', async status => {
    send.mockResolvedValue(reply(historical(), status)); await expect(client.identidadesHistoricas([personaId])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('no entrega el primer lote si falla uno posterior', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => 'abcdef00-1111-4111-8111-' + String(i).padStart(12, '0'));
    send.mockImplementationOnce(async (_url, options) => {
      const consulta = JSON.parse(options.body); return reply({ consulta, items: [], total: 0 });
    }).mockRejectedValueOnce(new Error('fuente caída'));
    await expect(client.identidadesHistoricas(ids)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('lote exige token PTA/común y no usa JWT_SECRET ni el token de Auth', async () => {
    delete process.env.PTA_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.JWT_SECRET = 'no-es-token';
    await expect(client.identidadesHistoricas([personaId])).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });

  it('nombre histórico conserva partes exactas y usa exclusivamente credencial/URL de PTA', async () => {
    send.mockResolvedValue(reply({ items: [nombre], total: 1 }));
    await expect(client.nombreHistorico(personaId)).resolves.toEqual(nombre);
    expect(send.mock.calls[0][0]).toBe('http://pta.test/internal/rund/v1/personas/' + personaId + '/nombre-historico');
    expect(send.mock.calls[0][1]).toMatchObject({ method: 'GET', redirect: 'error', headers: { 'x-internal-service-token': 'pta-ficticio' } });
  });
  it('nombre histórico ausente es null solo después de confirmación del propietario', async () => {
    send.mockResolvedValue(reply({ items: [], total: 0 }));
    await expect(client.nombreHistorico(personaId)).resolves.toBeNull();
  });
  it.each([{ ...nombre, personaId: '22222222-2222-4222-8222-222222222222' }, { ...nombre, segundo_nombre: undefined },
    { ...nombre, primer_nombre: 123 }])('nombre histórico rechaza registro parcial o ajeno %s', async item => {
    send.mockResolvedValue(reply({ items: [item], total: 1 }));
    await expect(client.nombreHistorico(personaId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 404, 503])('nombre histórico HTTP %s no habilita fallback local', async status => {
    send.mockResolvedValue(reply({}, status));
    await expect(client.nombreHistorico(personaId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('acepta el sobre Auth sin perder precisión de bigint ni fusionar seccionales homónimas', async () => {
    const items = [{ id: '9007199254740993', nombre: 'Nombre' }, { id: '2', nombre: 'Nombre' }];
    send.mockResolvedValue(reply({ success: true, data: { items, total: 2 } }));
    await expect(client.seccionales()).resolves.toEqual(items);
    expect(send.mock.calls[0][0]).toBe('http://auth.test/internal/rund/v1/catalogos/seccionales');
    expect(send.mock.calls[0][1]).toMatchObject({ redirect: 'error', headers: { 'x-internal-service-token': 'auth-ficticio' } });
  });

  it('acepta el contrato PTA conservando ceros iniciales, espacios y códigos distintos', async () => {
    const items = [{ codigo: '001', nombre: ' Histórica ' }, { codigo: '1', nombre: 'Otra' }];
    send.mockResolvedValue(reply({ items, total: 2 }));
    await expect(client.territoriales()).resolves.toEqual(items);
    expect(send.mock.calls[0][0]).toBe('http://pta.test/internal/rund/v1/catalogos/territoriales');
    expect(send.mock.calls[0][1]).toMatchObject({ method: 'GET', signal: expect.anything(),
      headers: { 'x-internal-service-token': 'pta-ficticio', Accept: 'application/json' } });
  });

  it.each(['seccionales', 'territoriales'] as const)('%s vacío confirmado es válido', async method => {
    send.mockResolvedValue(reply({ items: [], total: 0 }));
    await expect(client[method]()).resolves.toEqual([]);
  });

  it.each([null, [], {}, { success: false, data: { items: [], total: 0 } }, { data: null },
    { items: [], total: 1 }, { items: [], total: '0' }, { items: [] }, { items: [null], total: 1 }])('rechaza respuestas parciales %s', async body => {
    send.mockResolvedValue(reply(body));
    await expect(client.seccionales()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.territoriales()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([[{ id: '1' }], [{ id: 1, nombre: 'X' }], [{ id: '01', nombre: 'X' }],
    [{ id: '1', nombre: 'A' }, { id: '1', nombre: 'B' }]].map(items => ({ items })))('rechaza ID Auth inválido o duplicado %s', async ({ items }) => {
    send.mockResolvedValue(reply({ items, total: items.length }));
    await expect(client.seccionales()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([[{ codigo: '1' }], [{ codigo: 1, nombre: 'X' }], [{ codigo: '1', nombre: null }],
    [{ codigo: '1', nombre: 'A' }, { codigo: '1', nombre: 'B' }]].map(items => ({ items })))('rechaza código PTA inválido o duplicado %s', async ({ items }) => {
    send.mockResolvedValue(reply({ items, total: items.length }));
    await expect(client.territoriales()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 403, 404, 500, 503])('HTTP %s no equivale a catálogo vacío', async status => {
    send.mockResolvedValue(reply({}, status));
    await expect(client.seccionales()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fallos de transporte o JSON no exponen detalles ni habilitan SQL alternativo', async () => {
    send.mockRejectedValue(new Error('SECRETO_PRIVADO'));
    await expect(client.territoriales()).rejects.toThrow('No fue posible confirmar el catálogo territoriales de su servicio propietario.');
    send.mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON_PRIVADO'); } });
    await expect(client.seccionales()).rejects.toThrow('No fue posible confirmar el catálogo seccionales de su servicio propietario.');
  });

  it.each(['file:///tmp/catalogo', 'http://user:pass@pta.test', 'http://pta.test?x=1', 'http://pta.test#x', 'invalida'])('URL inválida impide enviar token: %s', async url => {
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL = url;
    await expect(client.territoriales()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('sin token específico usa el interno explícito, nunca el JWT', async () => {
    delete process.env.PTA_INTERNAL_SERVICE_TOKEN;
    process.env.INTERNAL_SERVICE_TOKEN = 'comun';
    send.mockResolvedValue(reply({ items: [], total: 0 }));
    await client.territoriales();
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun');
    delete process.env.INTERNAL_SERVICE_TOKEN; process.env.JWT_SECRET = 'jwt-no-valido'; send.mockClear();
    await expect(client.territoriales()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });

  it('el banco conserva orden del propietario, bigint, códigos con ceros y null explícito', async () => {
    const items = [{ id: '9007199254740993', nombre: 'Primera', codigo: '001' }, { id: '2', nombre: 'Segunda', codigo: null }];
    send.mockResolvedValue(reply({ success: true, data: { items, total: 2 } }));
    await expect(client.territorialesBanco()).resolves.toEqual(items);
    expect(send.mock.calls[0][0]).toBe('http://auth.test/internal/rund/v1/catalogos/territoriales-banco');
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('auth-ficticio');
  });

  it.each([{ id: '1', nombre: 'X' }, { id: '1', nombre: null, codigo: '01' },
    { id: '1', nombre: 'X', codigo: 1 }, { id: 1, nombre: 'X', codigo: null }])('banco rechaza fila parcial %s', async item => {
    send.mockResolvedValue(reply({ items: [item], total: 1 }));
    await expect(client.territorialesBanco()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('banco rechaza duplicados por ID, sin rechazar códigos o nombres compartidos', async () => {
    const first = { id: '1', nombre: 'Compartido', codigo: '01' };
    send.mockResolvedValue(reply({ items: [first, { ...first, id: '2' }], total: 2 }));
    await expect(client.territorialesBanco()).resolves.toHaveLength(2);
    send.mockResolvedValue(reply({ items: [first, first], total: 2 }));
    await expect(client.territorialesBanco()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 404, 503])('banco no confunde HTTP %s con catálogo vacío', async status => {
    send.mockResolvedValue(reply({}, status));
    await expect(client.territorialesBanco()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('banco acepta vacío confirmado y rechaza listado con total incompleto', async () => {
    send.mockResolvedValue(reply({ items: [], total: 0 }));
    await expect(client.territorialesBanco()).resolves.toEqual([]);
    send.mockResolvedValue(reply({ items: [], total: 1 }));
    await expect(client.territorialesBanco()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each(['2026-2', 'LEGACY-P1'])('período activo conserva código del propietario: %s', async codigo => {
    send.mockResolvedValue(reply({ items: [{ codigo, estado: 'en_curso' }], total: 1 }));
    await expect(client.periodoActivo()).resolves.toBe(codigo);
    expect(send.mock.calls[0][0]).toBe('http://pta.test/internal/rund/v1/catalogos/periodo-activo');
    expect(send.mock.calls[0][1]).toMatchObject({ redirect: 'error', headers: { 'x-internal-service-token': 'pta-ficticio' } });
  });

  it('sin período activo devuelve null solo con vacío confirmado', async () => {
    send.mockResolvedValue(reply({ success: true, data: { items: [], total: 0 } }));
    await expect(client.periodoActivo()).resolves.toBeNull();
  });

  it.each([{ codigo: '', estado: 'en_curso' }, { codigo: '  ', estado: 'en_curso' }, { codigo: 'x'.repeat(11), estado: 'en_curso' },
    { codigo: '2026-2' }, { codigo: '2026-2', estado: 'planeacion' }, { codigo: 20262, estado: 'en_curso' }])('período activo rechaza fila inválida %s', async item => {
    send.mockResolvedValue(reply({ items: [item], total: 1 }));
    await expect(client.periodoActivo()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('varios períodos o total parcial no confirman un único activo', async () => {
    send.mockResolvedValue(reply({ items: [{ codigo: '2026-1', estado: 'en_curso' }, { codigo: '2026-2', estado: 'en_curso' }], total: 2 }));
    await expect(client.periodoActivo()).rejects.toBeInstanceOf(ServiceUnavailableException);
    send.mockResolvedValue(reply({ items: [], total: 1 }));
    await expect(client.periodoActivo()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 404, 409, 503])('período activo HTTP %s no equivale a ausencia', async status => {
    send.mockResolvedValue(reply({}, status));
    await expect(client.periodoActivo()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
