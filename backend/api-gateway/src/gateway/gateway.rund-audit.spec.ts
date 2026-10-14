import { of, throwError } from 'rxjs';
import { Readable } from 'node:stream';
import { GatewayService } from './gateway.service';

describe('Proxy RUND conserva el transporte y limita sus registros', () => {
  let log: jest.SpyInstance, errorLog: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); errorLog = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());
  const response = () => ({ locals: {} as any, setHeader: jest.fn(), status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
  const request = (url = '/rund/api/v1/docentes/PERFIL_PRIVADO?token=TOKEN_PRIVADO') => ({
    originalUrl: url, path: url.split('?')[0], method: 'PUT', protocol: 'http', query: { token: 'TOKEN_PRIVADO' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer SESION_PRIVADA' },
    body: { nested: { documentNumber: 'CEDULA_PRIVADA' } }, socket: { remoteAddress: '127.0.0.1' },
  });

  it.each([200, 409])('respuesta %s conserva contenido/status/cabeceras sin copia para auditoría', async status => {
    const data = { message: 'CONTENIDO_PRIVADO' }, bytes = Buffer.from(JSON.stringify(data));
    const http = { request: jest.fn().mockReturnValue(of({ status, data: bytes, headers: { 'cache-control': 'private, no-store' } })) };
    const req = request(), res = response();
    await new GatewayService(http as any).forwardRequest('rund', '1', req as any, res as any);
    const forwarded = http.request.mock.calls[0][0];
    expect(forwarded.url).toContain('/docentes/PERFIL_PRIVADO?token=TOKEN_PRIVADO');
    expect(forwarded.data).toBe(req.body); expect(forwarded.headers.authorization).toBe('Bearer SESION_PRIVADA');
    expect(res.status).toHaveBeenCalledWith(status); expect(res.setHeader).toHaveBeenCalledWith('cache-control', 'private, no-store');
    if (status === 200) expect(res.send).toHaveBeenCalledWith(bytes); else expect(res.json).toHaveBeenCalledWith(data);
    expect(res.locals.auditResponseBody).toBeNull();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/PRIVAD[OA]/);
  });

  it('un error Axios redacta también su destino interno sin alterar el error enviado al caller', async () => {
    const data = Buffer.from(JSON.stringify({ message: 'Error de validación propietario' }));
    const error = { message: 'URL_PRIVADA', code: 'ECONNRESET', response: { status: 503, data },
      config: { url: 'http://fixture-rund/docentes/PERFIL_PRIVADO?token=TOKEN_PRIVADO', method: 'PUT' } };
    const http = { request: jest.fn().mockReturnValue(throwError(() => error)) }, res = response();
    await new GatewayService(http as any).forwardRequest('rund', '1', request() as any, res as any);
    expect(res.status).toHaveBeenCalledWith(503); expect(res.json).toHaveBeenCalledWith({ message: 'Error de validación propietario' });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(/PRIVAD[OA]/);
    expect(JSON.stringify(errorLog.mock.calls)).toContain('ECONNRESET');
  });

  it('un multipart sigue enviando el stream y su boundary originales', async () => {
    const http = { request: jest.fn().mockReturnValue(of({ status: 201, data: Buffer.from('{}'), headers: {} })) };
    const req = request('/rund/api/v1/pta/banco-docentes/PERFIL_PRIVADO/documentos');
    Object.assign(req.headers, { 'content-type': 'multipart/form-data; boundary=BOUNDARY', 'content-length': '200' });
    await new GatewayService(http as any).forwardRequest('rund', '1', req as any, response() as any);
    const options = http.request.mock.calls[0][0];
    expect(options.data).toBe(req); expect(options.headers['content-length']).toBe('200');
    expect(options.headers['content-type']).toBe('multipart/form-data; boundary=BOUNDARY');
  });

  it('la descarga binaria conserva stream y cabeceras sin registrar nombres ni crear copia del archivo', async () => {
    const bytes = Readable.from(Buffer.from('ARCHIVO_PRIVADO'));
    const pipe = jest.spyOn(bytes, 'pipe').mockImplementation(() => null as any);
    const headers = { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename=ARCHIVO_PRIVADO.pdf' };
    const http = { request: jest.fn().mockReturnValue(of({ status: 200, data: bytes, headers })) };
    const req = request('/rund/api/v1/pta/banco-docentes/PERFIL_PRIVADO/documentos/FILE/contenido');
    Object.assign(req.headers, { accept: 'application/pdf' });
    const res = response();
    await new GatewayService(http as any).forwardRequest('rund', '1', req as any, res as any);
    expect(pipe).toHaveBeenCalledWith(res); expect(res.setHeader).toHaveBeenCalledWith('content-disposition', headers['content-disposition']);
    expect(res.locals.auditResponseBody).toBeUndefined(); expect(JSON.stringify(log.mock.calls)).not.toMatch(/PRIVAD[OA]/);
    bytes.destroy();
  });

  it('los módulos ajenos conservan su copia de respuesta para auditoría', async () => {
    const data = { titulo: 'Expediente' };
    const http = { request: jest.fn().mockReturnValue(of({ status: 200, data: Buffer.from(JSON.stringify(data)), headers: {} })) };
    const req = request('/legal/api/v1/expedientes/123'), res = response();
    await new GatewayService(http as any).forwardRequest('legal', '1', req as any, res as any);
    expect(res.locals.auditResponseBody).toEqual(data);
    expect(http.request.mock.calls[0][0].data).toBe(req.body);
  });
});
