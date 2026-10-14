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
});

describe('Carpeta Digital: soportes RUND vienen de rund-service', () => {
  const armar = (rund: any) => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service, {
      rund,
      dataSource: { query: jest.fn() },
      documentoRepo: { find: jest.fn().mockResolvedValue([]) },
      ensureCarpetaForPersona: jest.fn().mockResolvedValue({ id: 'c1', personaId: 'p1' }),
    });
    return service;
  };

  it('incorpora los soportes del RUND como documentos protegidos y audita el listado', async () => {
    const rund = {
      soportesPorPersona: jest.fn().mockResolvedValue([{ id: 's1', tipo_soporte: 'CEDULA', nombre_archivo: 'cedula.pdf', estado: 'APROBADO', bloque: 'IDENTIDAD' }]),
      registrarAcceso: jest.fn().mockResolvedValue(undefined),
    };
    const docs = await armar(rund).listDocumentosByPersona('carpeta:p1', { sub: 'doc', roles: ['DOCENTE'] });
    expect(rund.soportesPorPersona).toHaveBeenCalledWith('p1');
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ id: 'rund:s1', origen: 'rund', contenido_restringido: true, url_archivo: null });
    expect(rund.registrarAcceso).toHaveBeenCalledTimes(1);
  });

  it('si rund-service no responde, la carpeta sigue funcionando sin los soportes RUND', async () => {
    const rund = { soportesPorPersona: jest.fn().mockRejectedValue(new ServiceUnavailableException('caído')), registrarAcceso: jest.fn() };
    await expect(armar(rund).listDocumentosByPersona('p1', { sub: 'doc' })).resolves.toEqual([]);
    expect(rund.registrarAcceso).not.toHaveBeenCalled();
  });
});
