import { of } from 'rxjs';
import type { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

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
