import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundClient } from './rund-client';

const respuesta = (status: number, cuerpo: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo }) as unknown as Response;

describe('RundClient (consulta del RUND por la API interna de rund-service)', () => {
  const entorno = { ...process.env };
  const fetchOriginal = global.fetch;
  afterEach(() => {
    process.env = { ...entorno };
    global.fetch = fetchOriginal;
  });

  it('consulta por documento con el token de servicio y desenvuelve data', async () => {
    process.env.RUND_SERVICE_URL = 'http://rund:3016/';
    process.env.INTERNAL_SERVICE_TOKEN = 'token-de-prueba';
    const fetchMock = jest.fn().mockResolvedValue(respuesta(200, { success: true, data: { idPersona: 'p1', documento: '123' } }));
    global.fetch = fetchMock as any;

    await expect(new RundClient().docentePorDocumento(' 123 ')).resolves.toEqual({ idPersona: 'p1', documento: '123' });

    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe('http://rund:3016/internal/rund/v1/docentes/por-documento/123');
    expect(opciones.headers['x-internal-service-token']).toBe('token-de-prueba');
  });

  it('404 del RUND es "el docente no existe", no una caída', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(404)) as any;
    await expect(new RundClient().docentePorDocumento('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falla cerrado si el servicio no responde o contesta con error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
    await expect(new RundClient().docentePorDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);

    global.fetch = jest.fn().mockResolvedValue(respuesta(500)) as any;
    await expect(new RundClient().docentePorDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('en producción no usa el token de desarrollo: sin INTERNAL_SERVICE_TOKEN falla cerrado', async () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.NODE_ENV = 'production';
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    await expect(new RundClient().docentePorDocumento('1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
