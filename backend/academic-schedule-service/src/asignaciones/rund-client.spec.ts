import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundClient } from './rund-client';
import { AcumuladoService } from './acumulado.service';

const respuesta = (status: number, cuerpo: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo }) as unknown as Response;
const perfil = (extra: Record<string, unknown> = {}) => ({
  idDocente: 'DOC-TEXTUAL-1', idPersona: '00000000-0000-0000-0000-000000000001', documento: '123', nombreCompleto: 'ANA PRUEBA',
  tipoVinculacion: 'Carrera', escalafon: null, horasAsignables: '40', investigacion: null,
  fechaInicioVinculacion: '2026-01-01T00:00:00', fechaFinVinculacion: null,
  situacionAdministrativa: 'Servicio Activo', situacionCategoria: null, ...extra,
});

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
    const fetchMock = jest.fn().mockResolvedValue(respuesta(200, { success: true, data: perfil() }));
    global.fetch = fetchMock as any;

    await expect(new RundClient().docentePorDocumento(' 123 ')).resolves.toEqual(perfil());

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

  it.each([
    ['sin cuerpo', null], ['lista', []], ['sin perfil', {}], ['data nula', { data: null }],
    ['error de negocio', { success: false, data: perfil() }],
    ['otra persona/documento', perfil({ documento: '999' })],
    ['sin identidad', perfil({ idPersona: undefined })], ['identidad no canónica', perfil({ idPersona: 'otra' })],
    ['sin situación', perfil({ situacionAdministrativa: undefined })],
    ['sin horas', perfil({ horasAsignables: undefined })], ['horas booleanas', perfil({ horasAsignables: true })],
    ['horas vacías', perfil({ horasAsignables: '' })], ['horas no numéricas', perfil({ horasAsignables: 'no' })],
    ['horas negativas', perfil({ horasAsignables: -1 })], ['horas infinitas', perfil({ horasAsignables: 'Infinity' })],
    ['fecha inexistente', perfil({ fechaInicioVinculacion: '2026-02-30T00:00:00' })],
  ])('rechaza %s sin convertir la respuesta en un perfil válido', async (_caso, body) => {
    const fetchMock = jest.fn().mockResolvedValue(respuesta(200, body));
    global.fetch = fetchMock as any;
    await expect(new RundClient().docentePorDocumento('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([0, '0', '40.5', null])('conserva un perfil directo con horas %s y nulos explícitos', async (horasAsignables) => {
    const data = perfil({ horasAsignables, tipoVinculacion: null,
      fechaInicioVinculacion: horasAsignables === 0 ? '2028-02-29T23:00:00-05:00' : null });
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, data)) as any;
    await expect(new RundClient().docentePorDocumento('123')).resolves.toEqual(data);
  });

  it('normaliza JSON inválido a 503 sin publicar el error privado', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('DATO_PRIVADO'); } }) as any;
    const error = await new RundClient().docentePorDocumento('123').catch(error => error);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toContain('DATO_PRIVADO');
  });

  it('el acumulado no calcula cupos ni consulta asignaciones si RUND omite la situación', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, { data: perfil({ situacionCategoria: undefined }) })) as any;
    const db = { query: jest.fn() };
    await expect(new AcumuladoService(db as any, new RundClient()).consumo('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.query).not.toHaveBeenCalled();
  });
});
