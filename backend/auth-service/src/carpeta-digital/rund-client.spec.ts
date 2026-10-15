import { ServiceUnavailableException } from '@nestjs/common';
import { RundClient } from './rund-client';
import { CarpetaDigitalService } from './carpeta-digital.service';

const resp = (status: number, cuerpo: unknown = {}) => ({ status, ok: status < 300, json: async () => cuerpo }) as unknown as Response;

describe('RundClient (API interna de rund-service)', () => {
  const entorno = { ...process.env };
  const fetchOriginal = global.fetch;
  afterEach(() => { process.env = { ...entorno }; global.fetch = fetchOriginal; });

  it('pide los soportes de la persona con el token de servicio', async () => {
    process.env.RUND_SERVICE_URL = 'http://rund:3016/';
    process.env.INTERNAL_SERVICE_TOKEN = 't';
    const f = jest.fn().mockResolvedValue(resp(200, { success: true, data: [{ id: 's1' }] }));
    global.fetch = f as any;
    await expect(new RundClient().soportesPorPersona('p/1')).resolves.toEqual([{ id: 's1' }]);
    expect(f.mock.calls[0][0]).toBe('http://rund:3016/internal/rund/v1/soportes/por-persona/p%2F1');
    expect(f.mock.calls[0][1].headers['x-internal-service-token']).toBe('t');
  });

  it('registra accesos por POST y verifica originales', async () => {
    const f = jest.fn()
      .mockResolvedValueOnce(resp(201, { data: { registrado: true } }))
      .mockResolvedValueOnce(resp(201, { data: { esOriginalRund: true } }))
      .mockResolvedValueOnce(resp(201, { data: { esOriginalRund: false } }));
    global.fetch = f as any;
    const client = new RundClient();
    await client.registrarAcceso({ actorId: 'u', roles: ['ADMIN'], endpoint: 'E', recursoId: 'r', campos: [], resultado: 'COMPLETO' });
    expect(f.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({ actorId: 'u', recursoId: 'r' });
    await expect(client.esOriginalRund('/u', 'h', ['E'])).resolves.toBe(true);
    await expect(client.esOriginalRund('/u', 'h', ['E'])).resolves.toBe(false);
  });

  it('falla cerrado: caída, error HTTP o producción sin token', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(new RundClient().registrarAcceso({} as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
    global.fetch = jest.fn().mockResolvedValue(resp(500)) as any;
    await expect(new RundClient().esOriginalRund('/u', 'h', [])).rejects.toBeInstanceOf(ServiceUnavailableException);

    delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.NODE_ENV = 'production';
    const f = jest.fn();
    global.fetch = f as any;
    await expect(new RundClient().soportesPorPersona('p')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    ['sin cuerpo', null], ['objeto vacío', {}], ['lista', []],
    ['data ausente', { success: true }], ['data nula con falso fuera de data', { data: null, esOriginalRund: false }],
    ['booleano como texto', { data: { esOriginalRund: 'false' } }],
    ['booleano como número', { data: { esOriginalRund: 0 } }],
    ['error de negocio con HTTP 200', { success: false, data: { esOriginalRund: false } }],
  ])('no interpreta %s como un original público', async (_caso, cuerpo) => {
    const fetchMock = jest.fn().mockResolvedValue(resp(200, cuerpo));
    global.fetch = fetchMock as any;
    await expect(new RundClient().esOriginalRund('/u', 'h', ['E'])).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['sin cuerpo', null], ['sin confirmación', {}], ['data ausente', { success: true }],
    ['no registrado', { data: { registrado: false } }],
    ['confirmación como texto', { data: { registrado: 'true' } }],
    ['error de negocio con HTTP 200', { success: false, data: { registrado: true } }],
  ])('rechaza auditoría con %s aunque HTTP sea exitoso', async (_caso, cuerpo) => {
    const fetchMock = jest.fn().mockResolvedValue(resp(201, cuerpo));
    global.fetch = fetchMock as any;
    await expect(new RundClient().registrarAcceso({} as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un JSON inválido produce indisponibilidad sin revelar su contenido privado', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError('CUERPO_PRIVADO')) }) as any;
    const error = await new RundClient().esOriginalRund('/u', 'h', []).catch(error => error);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toContain('CUERPO_PRIVADO');
  });

  it('conserva respuestas directas y distingue explícitamente falso de verdadero', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(resp(201, { registrado: true }))
      .mockResolvedValueOnce(resp(200, { esOriginalRund: false }))
      .mockResolvedValueOnce(resp(200, { esOriginalRund: true })) as any;
    const client = new RundClient();
    await expect(client.registrarAcceso({} as any)).resolves.toBeUndefined();
    await expect(client.esOriginalRund('/u', 'h', [])).resolves.toBe(false);
    await expect(client.esOriginalRund('/u', 'h', [])).resolves.toBe(true);
  });
});

describe('Carpeta Digital: soportes RUND vienen de rund-service', () => {
  const armar = (rundCarpetaClient: any, rund: any = { registrarAcceso: jest.fn() }) => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service, {
      rund,
      rundCarpetaClient,
      dataSource: { query: jest.fn().mockResolvedValue([]) },
      documentoRepo: { find: jest.fn().mockResolvedValue([]) },
      ensureCarpetaForPersona: jest.fn().mockResolvedValue({ id: 'c1', personaId: 'p1' }),
    });
    return service;
  };

  it('incorpora los soportes por el contrato documental que conserva propietario y sesión', async () => {
    // La API documental del propietario ya aplica sus permisos y registra el acceso.
    const documento = { id: 'rund-service:soporte:s1', servicio_propietario: 'rund', origen: 'rund-service',
      persona_id: 'p1', contenido_restringido: true, url_archivo: null };
    const client = {
      enabled: true,
      listDocumentos: jest.fn().mockResolvedValue([documento]),
    };
    const docs = await armar(client).listDocumentosByPersona('carpeta:p1', { sub: 'doc', roles: ['DOCENTE'] }, 'sesion');
    expect(client.listDocumentos).toHaveBeenCalledWith('p1', 'sesion');
    expect(docs).toEqual([documento]);
  });

  it('si RUND habilitado no responde, no presenta una carpeta incompleta como vacía', async () => {
    const client = { enabled: true, listDocumentos: jest.fn().mockRejectedValue(new ServiceUnavailableException('caído')) };
    await expect(armar(client).listDocumentosByPersona('p1', { sub: 'doc' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(client.listDocumentos).toHaveBeenCalledTimes(1);
  });

  it('con la integración deshabilitada conserva la carpeta histórica sin consultar al propietario nuevo', async () => {
    const client = { enabled: false, listDocumentos: jest.fn() };
    await expect(armar(client).listDocumentosByPersona('p1', { sub: 'doc' })).resolves.toEqual([]);
    expect(client.listDocumentos).not.toHaveBeenCalled();
  });
});
