import { of } from 'rxjs';
import type { Request, Response } from 'express';
import { GatewayService, isInternalServicePath } from './gateway.service';

describe('GatewayService', () => {
  it('lets Axios recalculate the length of parsed JSON bodies', async () => {
    const request = jest.fn().mockReturnValue(of({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: Buffer.from(JSON.stringify({ ok: true })),
    }));
    const service = new GatewayService({ request } as any);
    const req = {
      originalUrl: '/certificados/api/v1/certificates/correction-requests/example/preview',
      method: 'POST',
      protocol: 'http',
      headers: {
        'content-type': 'application/json',
        'content-length': '999',
        'transfer-encoding': 'chunked',
      },
      body: { full_name: 'Persona de prueba' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    const res = {
      locals: {},
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await service.forwardRequest('certificados', '1', req, res);

    const axiosOptions = request.mock.calls[0][0];
    expect(axiosOptions.headers['content-length']).toBeUndefined();
    expect(axiosOptions.headers['transfer-encoding']).toBeUndefined();
    expect(axiosOptions.data).toEqual(req.body);
  });
});

describe('Rutas internas servicio→servicio', () => {
  it.each([
    '/internal/rund/v1/docentes/por-documento/123',
    '/internal',
    '/INTERNAL/rund/v1/x',
    '//internal/rund/v1/x',
    '/%69nternal/rund/v1/x',
    '/%2569nternal/rund/v1/x',
    '/pta/../internal/rund/v1/x',
    '/internal/rund/v1/x?token=1',
    '\\internal\\rund',
  ])('bloquea %s', (ruta) => {
    expect(isInternalServicePath(ruta)).toBe(true);
  });

  it.each(['/docentes/internal', '/banco-docentes/12/documentos', '/internals/x', '/health/ready', ''])('no bloquea %s', (ruta) => {
    expect(isInternalServicePath(ruta)).toBe(false);
  });

  it('responde 404 sin llamar al microservicio', async () => {
    const request = jest.fn();
    const service = new GatewayService({ request } as any);
    const req = { originalUrl: '/rund/api/v1/internal/rund/v1/docentes/por-documento/1', method: 'GET', headers: {}, socket: {} } as unknown as Request;
    const res = { locals: {}, setHeader: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() } as unknown as Response;
    await expect(service.forwardRequest('rund', '1', req, res)).rejects.toMatchObject({ status: 404 });
    expect(request).not.toHaveBeenCalled();
  });
});
