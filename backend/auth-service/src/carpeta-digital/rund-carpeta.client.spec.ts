import { RundCarpetaClient, carpetaSessionToken } from './rund-carpeta.client';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { protectRundFolderDocument } from './rund-document-access';
import { PortalController } from '../portal/portal.controller';

const persona = '11111111-1111-4111-8111-111111111111';
const doc = { id: 'rund-service:documento:uuid-1', persona_id: persona, servicio_propietario: 'rund',
  origen: 'rund-service', contenido_restringido: true, nombre: 'Documento del perfil', url_archivo: null, comentarios: null };
const envKeys = ['RUND_CARPETA_ENABLED', 'RUND_CARPETA_INTERNAL_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'RUND_SERVICE_URL'];
const originalEnv = new Map(envKeys.map(key => [key, process.env[key]]));

describe('cliente auth → propietario RUND', () => {
  let fetchSpy: jest.SpyInstance;
  let client: RundCarpetaClient;
  beforeEach(() => {
    process.env.RUND_CARPETA_ENABLED = 'true';
    process.env.RUND_CARPETA_INTERNAL_TOKEN = 'credencial-ficticia';
    process.env.RUND_SERVICE_URL = 'http://rund-fixture:3016/';
    delete process.env.INTERNAL_SERVICE_TOKEN;
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true, data: [doc] })));
    client = new RundCarpetaClient();
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    for (const [key, value] of originalEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });
  it('usa URL interna con timeout, sin redirects, cookies ni roles declarados', async () => {
    expect(await client.listDocumentos(persona, 'jwt-ficticio')).toEqual([doc]);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(`http://rund-fixture:3016/internal/carpeta-digital/personas/${persona}/documentos`);
    expect(options).toMatchObject({ method: 'POST', redirect: 'error', body: '{"userToken":"jwt-ficticio"}',
      headers: { 'X-Rund-Carpeta-Token': 'credencial-ficticia' } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.headers).not.toHaveProperty('Cookie');
    expect(options.headers).not.toHaveProperty('Authorization');
  });
  it('preserva la proyección anónima sin fabricar sesión', async () => {
    await client.listDocumentos(persona);
    expect(fetchSpy.mock.calls[0][1].body).toBe('{}');
  });
  it('activación deshabilitada conserva el flujo antiguo sin tráfico nuevo', async () => {
    process.env.RUND_CARPETA_ENABLED = 'false';
    expect(await client.listDocumentos(persona)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('configuración incompleta falla antes de enviar credenciales', async () => {
    delete process.env.RUND_CARPETA_INTERNAL_TOKEN;
    await expect(client.listDocumentos(persona)).rejects.toThrow('no está configurada');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('rechaza claves que puedan cambiar la ruta', async () => {
    await expect(client.listDocumentos('persona/otro?consulta=1')).rejects.toThrow('identidad');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 500, 503])('HTTP %s no se convierte en lista vacía ni se reintenta', async status => {
    fetchSpy.mockResolvedValue(new Response('{}', { status }));
    await expect(client.listDocumentos(persona)).rejects.toThrow('No fue posible consultar');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, { success: false, data: [doc] }, { data: [{ ...doc, persona_id: 'otra' }] },
    { data: [{ ...doc, origen: 'rund' }] }, { data: [{ ...doc, id: 'rund:uuid-1' }] },
    { data: [{ ...doc, contenido_restringido: undefined }] }, { data: ['documento'] },
  ])('rechaza respuestas incompletas o de otro propietario: %j', async body => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify(body)));
    await expect(client.listDocumentos(persona)).rejects.toThrow('No fue posible consultar');
  });
  it('admite el sobre adicional del interceptor', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ success: true, data: { success: true, data: [doc] } })));
    expect(await client.listDocumentos(persona)).toEqual([doc]);
  });
  it('informa timeout/red en lugar de ocultar documentos', async () => {
    fetchSpy.mockRejectedValue(new Error('Timeout ficticio'));
    await expect(client.listDocumentos(persona)).rejects.toThrow('No fue posible consultar');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('integración de lectura conservando documentos generales e históricos', () => {
  function fixture(enabled = true) {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const client = { enabled, listDocumentos: jest.fn().mockResolvedValue([doc]) };
    const general = { id: 'uuid-1', nombre: 'General.pdf', categoria: 'otros', urlArchivo: '/auth/archivo.pdf' };
    const legacy = { id: 'uuid-1', nombre_archivo: 'Soporte PTA.pdf', tipo_soporte: 'IDENTIDAD', documento_carpeta_id: '/pta/original.pdf' };
    Object.assign(service, { ensureCarpetaForPersona: jest.fn().mockResolvedValue({ id: 'folder', personaId: persona }),
      documentoRepo: { find: jest.fn().mockResolvedValue([general]) },
      dataSource: { query: jest.fn(async sql => sql.startsWith('SELECT') ? [legacy] : []) }, rundCarpetaClient: client });
    return { service, client };
  }
  it('consulta el UUID resuelto por auth y conserva los tres propietarios sin colisión', async () => {
    const { service, client } = fixture();
    const docs = await service.listDocumentosByPersona('usuario-publico', { roles: ['SUPER_ADMIN'] }, 'jwt-ficticio');
    expect(client.listDocumentos).toHaveBeenCalledWith(persona, 'jwt-ficticio');
    expect(service.dataSource.query.mock.calls[0][1]).toEqual([persona]);
    expect(docs.map(d => d.id)).toEqual(['uuid-1', 'rund:uuid-1', doc.id]);
    expect(docs[0].url_archivo).toBe('/auth/archivo.pdf');
    expect(docs[2].contenido_restringido).toBe(true);
  });
  it('no hace llamadas nuevas cuando la integración está deshabilitada', async () => {
    const { service, client } = fixture(false);
    expect((await service.listDocumentosByPersona(persona)).length).toBe(2);
    expect(client.listDocumentos).not.toHaveBeenCalled();
  });
  it('conserva el error del propietario en lugar de devolver solo el listado antiguo', async () => {
    const { service, client } = fixture();
    client.listDocumentos.mockRejectedValue(new Error('RUND no disponible'));
    await expect(service.listDocumentosByPersona(persona)).rejects.toThrow('RUND no disponible');
  });
  it.each(['deleteDocumento', 'validateDocumento', 'reclassifyDocumento'])('auth no muta IDs de RUND: %s', async method => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const repo = { findOne: jest.fn(), delete: jest.fn(), save: jest.fn() };
    Object.assign(service, { documentoRepo: repo });
    await expect(service[method](doc.id, {})).rejects.toThrow('pertenece a RUND');
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it('auth nunca eleva una proyección restringida por RUND', () => {
    expect(protectRundFolderDocument(doc, { roles: ['SUPER_ADMIN'] })).toBe(doc);
  });
  it('el portal expresa un fallo real de consulta como success:false', async () => {
    const service = { listDocumentosByPersona: jest.fn().mockRejectedValue(new Error('RUND no disponible')) };
    const controller = new PortalController({} as any, service as any);
    expect(await controller.getDocumentosByPersona(persona)).toMatchObject({ success: false, data: [] });
  });
});

describe('extracción de sesión sin cookies extra', () => {
  it('prefiere bearer y reconoce únicamente la cookie de sesión', () => {
    expect(carpetaSessionToken({ headers: { authorization: 'Bearer firmado', cookie: 'esap_access_token=cookie' } })).toBe('firmado');
    expect(carpetaSessionToken({ headers: { cookie: 'otro=secreto; esap_access_token=cookie; tercero=no' } })).toBe('cookie');
    expect(carpetaSessionToken({ headers: { cookie: 'otro=secreto' } })).toBeUndefined();
  });
});
