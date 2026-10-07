import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../../shell/src/services/api';
import { getAppOnlineStatus } from '../../../../shell/src/utils/connectivity';
import { aprobarComponente, revisarComponente, aprobarComponentesLote, revisarComponentesLote, getPTADecisionPermissions, getAllPTAs, getComponentesRevision, getComponentesAprobacion, getPTAById, getPTAsByDocente, getSolicitudesPTA, getMisSolicitudesPTA, resolverSolicitudPTA, crearSolicitudPTA, getAprobacionTerritorial, getRevisionTerritorial } from './ptaApi';

vi.mock('../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../../../shell/src/utils/connectivity', () => ({ getAppOnlineStatus: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getAppOnlineStatus).mockReturnValue(true); });

describe('decisiones PTA confirmadas por el servidor', () => {
  it('no interpreta respuestas incompletas como ausencia de solicitudes de edición', async () => {
    for (const consultar of [() => getMisSolicitudesPTA('docente-1'), () => getSolicitudesPTA()]) {
      for (const response of [{ success: true, data: null }, { success: true }, { success: true, data: {} }]) {
        vi.mocked(apiClient.get).mockResolvedValueOnce(response);
        expect(await consultar()).toEqual({ success: false, data: [] });
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: [] });
      expect(await consultar()).toEqual({ success: true, data: [] });
    }
  });

  it('actualiza revisión y aprobación de cada par territorial sin usar respuestas HTTP anteriores', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await getAprobacionTerritorial('pta-1');
    await getRevisionTerritorial('pta-1');
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/pta-1/aprobacion-territorial', undefined, { cache: 'no-store' });
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/pta-1/revision-territorial', undefined, { cache: 'no-store' });
  });
  it('solo confirma una solicitud de edición guardada sobre el mismo PTA y evita encolarla sin conexión', async () => {
    const payload = { tipoSolicitud: 'edicion_componentes', ptaId: 'pta-1', componentes: ['investigacion'] };
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    expect((await crearSolicitudPTA(payload)).success).toBe(false);
    expect(apiClient.post).not.toHaveBeenCalled();
    vi.mocked(getAppOnlineStatus).mockReturnValue(true);
    for (const response of [{ success: true, data: null }, { id: 'sol-1', ptaId: 'pta-nuevo', estado: 'pendiente' }]) {
      vi.mocked(apiClient.post).mockResolvedValue(response);
      expect((await crearSolicitudPTA(payload)).success).toBe(false);
    }
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'sol-1', ptaId: 'pta-1', estado: 'pendiente' });
    expect((await crearSolicitudPTA(payload)).success).toBe(true);
  });
  it('consulta solicitudes del aprobador y docente sin recuperar una respuesta HTTP anterior', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await getSolicitudesPTA('pendiente');
    await getMisSolicitudesPTA('docente-1');
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/solicitudes', { estado: 'pendiente' },
      expect.objectContaining({ cache: 'no-store' }));
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/solicitudes/docente/docente-1', undefined,
      expect.objectContaining({ cache: 'no-store' }));
  });
  it('no consulta una bandeja de permisos en caché ni encola una resolución sin conexión', async () => {
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    expect((await getSolicitudesPTA()).success).toBe(false);
    expect((await resolverSolicitudPTA('sol-1', { decision: 'aprobado', componentes: ['investigacion'] })).success).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
  it('exige la solicitud confirmada por el servidor antes de informar que quedó resuelta', async () => {
    for (const response of [
      { success: true, data: null, message: 'Encolado offline' },
      { id: 'sol-ajena', estado: 'aprobado' },
    ]) {
      vi.mocked(apiClient.patch).mockResolvedValue(response);
      expect((await resolverSolicitudPTA('sol-1', { decision: 'aprobado', componentes: ['investigacion'] })).success).toBe(false);
    }
    vi.mocked(apiClient.patch).mockResolvedValue({ id: 'sol-1', estado: 'pendiente', resolucionParcial: true,
      decisionesComponentes: { investigacion: { estado: 'aprobado' } } });
    expect((await resolverSolicitudPTA('sol-1', { decision: 'aprobado', componentes: ['investigacion'] })).success).toBe(true);
  });
  it('recarga la revisión guardada de Investigación sin recuperar una respuesta HTTP anterior', async () => {
    const pending = [{ componente: 'investigacion', subseccion: 'general', estado: 'pendiente' }];
    const reviewed = [{ ...pending[0], estado: 'revisado' }];
    let saved = false;
    vi.mocked(apiClient.get).mockImplementation(async (_url, _params, options) =>
      saved && options?.cache === 'no-store' ? reviewed : pending);
    vi.mocked(apiClient.post).mockImplementation(async () => {
      saved = true;
      return { review: reviewed[0], estadoGeneral: 'Pendiente Jefatura' };
    });

    expect((await getComponentesRevision('pta-1')).data).toEqual(pending);
    expect((await revisarComponente('pta-1', {
      ...reviewed[0], estado: 'revisado', revisorId: 'reviewer',
      revisorNombre: 'Revisor', revisorRol: 'Investigación',
    })).success).toBe(true);
    expect((await getComponentesRevision('pta-1')).data).toEqual(reviewed);
  });
  it('actualiza el detalle, las aprobaciones y el portal docente con lecturas sin caché HTTP', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await getComponentesAprobacion('pta-1');
    await getPTAById('pta-1');
    await getPTAsByDocente('docente-1');
    for (const [url, params, options] of vi.mocked(apiClient.get).mock.calls) {
      expect(url).toMatch(/componentes-aprobacion|id\/pta-1|mis-ptas\/docente-1/);
      expect(params).toBeUndefined();
      expect(options?.cache).toBe('no-store');
    }
  });
  it('no confirma una revisión cuando el servidor no devuelve la decisión guardada', async () => {
    const decision = { componente: 'investigacion', subseccion: 'general', estado: 'revisado' as const,
      revisorId: 'reviewer', revisorNombre: 'Revisor', revisorRol: 'Investigación' };
    for (const response of [
      { success: true, data: null, message: 'Encolado offline' },
      { review: { ...decision, estado: 'pendiente' } },
      { review: { ...decision, componente: 'academica_pregrado' } },
    ]) {
      vi.mocked(apiClient.post).mockResolvedValueOnce(response);
      expect(await revisarComponente('pta-1', decision)).toMatchObject({ success: false });
    }
  });
  it('conserva la confirmación de una revisión parcial por territorial y nivel', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ review: {
      componente: 'academica_territorial', territorialId: 'territorial-1', nivel: 'pregrado', estado: 'revisado',
    }, estadoGeneral: 'Pendiente Jefatura' });
    expect(await revisarComponente('pta-1', {
      componente: 'academica_territorial', subseccion: 'general', estado: 'revisado',
      territorialId: 'territorial-1', nivel: 'pregrado',
      revisorId: 'reviewer', revisorNombre: 'Revisor', revisorRol: 'Territorial',
    })).toMatchObject({ success: true });
  });
  it('no confirma una aprobación sin la decisión correspondiente del servidor', async () => {
    const decision = { componente: 'investigacion', estado: 'aprobado' as const,
      aprobadorId: 'approver', aprobadorNombre: 'Aprobador', aprobadorRol: 'Investigación' };
    for (const response of [
      { success: true, data: null, message: 'Encolado offline' },
      { success: true },
      { approval: { ...decision, estado: 'pendiente' } },
      { approval: { ...decision, componente: 'academica_pregrado' } },
    ]) {
      vi.mocked(apiClient.post).mockResolvedValueOnce(response);
      expect(await aprobarComponente('pta-1', decision)).toMatchObject({ success: false });
    }
  });
  it.each(['aprobado', 'devuelto'] as const)('confirma la decisión %s de Investigación con la respuesta del backend', async estado => {
    const approval = { componente: 'investigacion', estado };
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { approval, estadoGeneral: 'Pendiente Jefatura' } });
    expect(await aprobarComponente('pta-1', { ...approval,
      aprobadorId: 'approver', aprobadorNombre: 'Aprobador', aprobadorRol: 'Investigación',
    })).toMatchObject({ success: true, data: { approval } });
  });
  it('confirma una aprobación territorial parcial aunque el PTA completo siga pendiente', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ approval: {
      componente: 'academica_territorial', territorialId: 'territorial-1', nivel: 'pregrado', estado: 'aprobado',
    }, estadoGeneral: 'Pendiente Jefatura' });
    expect(await aprobarComponente('pta-1', {
      componente: 'academica_territorial', estado: 'aprobado', territorialId: 'territorial-1', nivel: 'pregrado',
      aprobadorId: 'approver', aprobadorNombre: 'Aprobador', aprobadorRol: 'Territorial',
    })).toMatchObject({ success: true });
  });
  it('no interpreta una respuesta inválida como ausencia de revisiones o aprobaciones requeridas', async () => {
    for (const read of [getComponentesRevision, getComponentesAprobacion]) {
      for (const response of [{ success: true, data: null }, { success: true }, { componente: 'investigacion' }]) {
        vi.mocked(apiClient.get).mockResolvedValueOnce(response);
        expect(await read('pta-1')).toEqual({ success: false, data: [] });
      }
      vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: [] });
      expect(await read('pta-1')).toEqual({ success: true, data: [] });
    }
  });
  it('gestión consulta el listado autorizado sin reutilizar la caché del listado general', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await getAllPTAs({ periodo: '2026-2' }, true);
    expect(apiClient.get).toHaveBeenCalledWith('/pta/api/v1/gestion', { periodo: '2026-2' }, { cache: 'no-store', skipErrorToast: true, retries: 0 });
  });
  it('no lee permisos de la caché ni encola decisiones sin conexión', async () => {
    vi.mocked(getAppOnlineStatus).mockReturnValue(false);
    for (const result of await Promise.all([
      getPTADecisionPermissions('pta-1'),
      aprobarComponente('pta-1', {} as any),
      revisarComponente('pta-1', {} as any),
      aprobarComponentesLote({ ptaIds: ['pta-1'], componentes: ['investigacion'] }),
      revisarComponentesLote({ ptaIds: ['pta-1'], revisiones: ['investigacion:general'] }),
      getComponentesRevision('pta-1'),
      getComponentesAprobacion('pta-1'),
    ])) {
      expect(result.success).toBe(false);
    }
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('conserva el rechazo del servidor sin reintentar una decisión automáticamente', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Sin autorización para esta territorial'));
    const result = await aprobarComponente('pta-1', {} as any);
    expect(result).toMatchObject({ success: false, message: 'Sin autorización para esta territorial' });
    expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta-1/aprobar-componente', {}, { retries: 0 });
  });

  it.each([
    [aprobarComponentesLote, 'aprobar-componentes-lote', { ptaIds: ['pta-1'], componentes: ['investigacion'] }],
    [revisarComponentesLote, 'revisar-componentes-lote', { ptaIds: ['pta-1'], revisiones: ['investigacion:general'] }],
  ] as const)('el lote %s conserva estados confirmados y no reintenta automáticamente', async (decidir, endpoint, payload) => {
    const data = { resumen: {}, resultados: [], ptasActualizados: [{ id: 'pta-1', estado: 'Pendiente Jefatura' }] };
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data });
    expect(await decidir(payload as any)).toMatchObject({ success: true, data });
    expect(apiClient.post).toHaveBeenCalledWith(`/pta/api/v1/${endpoint}`, payload, { retries: 0 });
  });
});
