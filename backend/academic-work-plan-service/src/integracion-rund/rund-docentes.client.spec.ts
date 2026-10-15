import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundDocentesClient } from './rund-docentes.client';
import { RundSyncService } from './rund-sync.service';
import { DocentesContratoService } from '../contrato-programacion/v1/docentes-contrato.service';

const personaId = '00000000-0000-0000-0000-000000000001';
const perfil = (extra: Record<string, unknown> = {}) => ({
  idDocente: 'DOC-TEXTUAL', idPersona: personaId, documento: '123', nombreCompleto: 'ANA PRUEBA',
  correoInstitucional: null, territorialCodigo: null, territorialNombre: null, tipoVinculacion: 'Carrera',
  dedicacion: 'TC', dedicacionHorasSemana: 40, escalafon: null, regimenNormativo: null,
  horasAsignables: '40', fechaInicioVinculacion: '2026-01-01T00:00:00', fechaFinVinculacion: null,
  situacionAdministrativa: 'Servicio Activo', situacionCategoria: null, estado: 'ACTIVO',
  nivelFormacion: null, nucleoTematico: null, ...extra,
});
const fila = (extra: Record<string, unknown> = {}) => ({ id: 'DOC-TEXTUAL', personaId, periodoCarga: '2026-2', ...extra });
const validacion = (extra: Record<string, unknown> = {}) => ({ docenteId: 'DOC-TEXTUAL', personaId, completitud: 0,
  validaciones: [{ campo_rund: 'DOCUMENTO_IDENTIDAD', estado_documento: 'Sin cargar' }], ...extra });
const response = (body: unknown, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

describe('RundDocentesClient: contratos confirmados antes de usar datos externos', () => {
  const originalEnv = { ...process.env }, originalFetch = global.fetch;
  beforeEach(() => { process.env.INTERNAL_SERVICE_TOKEN = 'token-ficticio'; });
  afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });
  const mock = (body: unknown, status = 200) => {
    const fetchMock = jest.fn().mockResolvedValue(response(body, status));
    global.fetch = fetchMock as any;
    return fetchMock;
  };

  it.each([
    ['vacío', null], ['sin perfil', {}], ['lista', []], ['data nula', { data: null }],
    ['error de negocio', { success: false, data: perfil() }], ['otro documento', perfil({ documento: '999' })],
    ['sin persona', perfil({ idPersona: undefined })], ['persona no canónica', perfil({ idPersona: 'otra' })],
    ['sin situación', perfil({ situacionAdministrativa: undefined })], ['sin horas', perfil({ horasAsignables: undefined })],
    ['horas booleanas', perfil({ horasAsignables: false })], ['horas vacías', perfil({ horasAsignables: '' })],
    ['horas negativas', perfil({ horasAsignables: -1 })], ['horas infinitas', perfil({ horasAsignables: 'Infinity' })],
    ['dedicación de tipo incorrecto', perfil({ dedicacionHorasSemana: '40' })],
    ['fecha inexistente', perfil({ fechaFinVinculacion: '2026-02-30T00:00:00' })],
  ])('el contrato no publica un docente con respuesta %s', async (_caso, body) => {
    const fetchMock = mock(body);
    await expect(new DocentesContratoService(new RundDocentesClient()).buscarPorDocumento('123')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([0, '0', '40.5', null])('acepta horas %s y nulos explícitos sin cambiar el contrato de negocio', async (horasAsignables) => {
    const data = perfil({ horasAsignables, tipoVinculacion: null,
      fechaInicioVinculacion: horasAsignables === 0 ? '2028-02-29T23:00:00-05:00' : null });
    mock(data);
    await expect(new RundDocentesClient().porDocumento('123')).resolves.toEqual(data);
  });

  it.each([
    ['sin items', { nextCursor: null }], ['sin cursor final', { items: [] }],
    ['sin identidad', { items: [{ id: 'd1' }], nextCursor: null }],
    ['filas duplicadas', { items: [fila(), fila()], nextCursor: null }],
    ['cursor ajeno a la página', { items: [fila()], nextCursor: 'otro' }],
    ['cursor sin filas', { items: [], nextCursor: 'otro' }],
    ['límite excedido', { items: [fila(), fila({ id: 'd2' }), fila({ id: 'd3' })], nextCursor: null }],
  ])('rechaza página %s antes de sincronizar', async (_caso, body) => {
    mock({ data: body });
    await expect(new RundDocentesClient().paginaParaSincronizar(null, 2)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rechaza una página que vuelve a incluir el cursor anterior', async () => {
    mock({ data: { items: [fila()], nextCursor: 'DOC-TEXTUAL' } });
    await expect(new RundDocentesClient().paginaParaSincronizar('DOC-TEXTUAL')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('acepta una página vacía final y una página completa con IDs textuales', async () => {
    mock({ success: true, data: { items: [], nextCursor: null } });
    await expect(new RundDocentesClient().paginaParaSincronizar(null)).resolves.toEqual({ items: [], nextCursor: null });
    const data = { items: [fila()], nextCursor: 'DOC-TEXTUAL' };
    mock({ data });
    await expect(new RundDocentesClient().paginaParaSincronizar(null)).resolves.toEqual(data);
  });

  it.each([
    ['otro perfil', fila({ id: 'ajeno', personaId: '00000000-0000-0000-0000-000000000002' })],
    ['otro período', fila({ periodoCarga: '2026-1' })], ['sin período', { id: 'DOC-TEXTUAL', personaId }],
    ['HTTP 200 sin fila', null],
  ])('no copia una resolución con %s ni consulta la base', async (_caso, body) => {
    mock({ data: body });
    const db = { query: jest.fn() };
    await expect(new RundSyncService(db as any, new RundDocentesClient()).sincronizarDocente(personaId, '2026-2'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('conserva el 404 como ausencia explícita y la fila correcta por persona/período', async () => {
    mock({}, 404);
    await expect(new RundDocentesClient().resolver(personaId)).resolves.toBeNull();
    await expect(new RundDocentesClient().porDocumento('123')).rejects.toBeInstanceOf(NotFoundException);
    mock({ data: fila() });
    await expect(new RundDocentesClient().resolver(personaId, '2026-2')).resolves.toEqual(fila());
    await expect(new RundDocentesClient().resolver(` ${personaId} `, '2026-2')).resolves.toEqual(fila());
  });

  it.each([
    ['sin estados', validacion({ validaciones: undefined })], ['estados vacíos', validacion({ validaciones: [] })],
    ['campo sin estado', validacion({ validaciones: [{ campo_rund: 'DOCUMENTO_IDENTIDAD' }] })],
    ['completitud inválida', validacion({ completitud: 101 })],
    ['campos duplicados', validacion({ validaciones: [validacion().validaciones[0], validacion().validaciones[0]] })],
  ])('no confirma una validación documental con %s', async (_caso, body) => {
    mock({ data: body });
    await expect(new RundDocentesClient().validacion('DOC-TEXTUAL')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('conserva la validación documental completa sin reclasificar los estados', async () => {
    mock({ success: true, data: validacion() });
    await expect(new RundDocentesClient().validacion('DOC-TEXTUAL')).resolves.toEqual(validacion());
  });

  it('un error de JSON no filtra detalles ni se reintenta', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('DATO_PRIVADO'); } });
    global.fetch = fetchMock as any;
    const error = await new RundDocentesClient().porDocumento('123').catch(error => error);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).not.toContain('DATO_PRIVADO');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
