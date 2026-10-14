import { PortalController } from '../portal/portal.controller';

describe('Carpeta del portal conserva el contrato documental', () => {
  const person = '11111111-1111-4111-8111-111111111111';
  const user = { sub: 'operador-ficticio', roles: ['GESTION_PROFESORAL'] };
  let service: any;
  let controller: PortalController;
  beforeEach(() => {
    service = {
      getCarpetaByPersona: jest.fn().mockResolvedValue({ persona_id: person, total_documentos: 1,
        alcance_conteo: 'auth-pta-rund', conteo_completo: true }),
      listDocumentosByPersona: jest.fn().mockResolvedValue([{ id: 'native', servicio_propietario: 'rund',
        rund_perfil_id: 'PROFILE', version_actual: 4, contenido_restringido: true, url_archivo: null }]),
      getChecklistForPersona: jest.fn().mockResolvedValue({ tiposDocumentos: [] }),
    };
    controller = new PortalController({} as any, service);
  });
  it('propaga actor/sesión, solicita conteos agregados y conserva la identidad canónica', async () => {
    const result = await controller.getCarpetaDigital('carpeta:usuario-ficticio', { user,
      headers: { authorization: 'Bearer sesion-ficticia' } });
    expect(service.getCarpetaByPersona).toHaveBeenCalledWith('usuario-ficticio', user, 'sesion-ficticia', true);
    expect(service.listDocumentosByPersona).toHaveBeenCalledWith('usuario-ficticio', user, 'sesion-ficticia');
    expect(result.success).toBe(true);
    expect(result.data.persona.id).toBe(person);
    expect(result.data.carpeta.conteo_completo).toBe(true);
    expect(result.data.documentos[0]).toMatchObject({ servicio_propietario: 'rund', version_actual: 4,
      rund_perfil_id: 'PROFILE', contenido_restringido: true, url_archivo: null });
  });
  it.each(['getCarpetaByPersona', 'listDocumentosByPersona'])('un fallo de %s no se anuncia como carpeta completa vacía', async method => {
    service[method].mockRejectedValue(new Error('Propietario temporalmente no disponible'));
    const result = await controller.getCarpetaDigital(person);
    expect(result.success).toBe(false);
    expect(result.message).toContain('no disponible');
  });
  it('un listado vacío confirmado sigue siendo exitoso', async () => {
    service.listDocumentosByPersona.mockResolvedValue([]);
    expect(await controller.getCarpetaDigital(person)).toMatchObject({ success: true, data: { documentos: [] } });
  });
  it('el listado portal mantiene restricciones y la sesión por cookie', async () => {
    const result = await controller.getDocumentosByPersona(person, { user, headers: { cookie: 'esap_access_token=sesion-cookie' } });
    expect(service.listDocumentosByPersona).toHaveBeenCalledWith(person, user, 'sesion-cookie');
    expect(result.data[0].url_archivo).toBeNull();
  });
});
