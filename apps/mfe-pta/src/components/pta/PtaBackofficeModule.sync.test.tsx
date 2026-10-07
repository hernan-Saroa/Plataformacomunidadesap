import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PtaBackofficeModule } from './PtaBackofficeModule';
import {
  aprobarComponentesLote, deletePTA, getAllPTAs, getAllPtasConEvidencias, getPTADecisionListScope,
  getSolicitudesPTA, resolverSolicitudPTA, revisarComponentesLote, revisarEvidenciaPTA,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { apiClient } from '../../../../shell/src/services/api';
import { PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, PTA_BULK_APPROVAL_GROUPS, PTA_COMPONENT_KEYS,
  REVIEW_SUBSECCIONES_BY_COMPONENT } from './shared/ptaComponentPermissions';

const sync = vi.hoisted(() => ({ options: null as any, lastSyncTime: 'sync', updatedPta: null as any, isSuperUser: false, rol: 'jefatura', allowedPermissions: null as Set<string> | null, visibleViews: null as Set<string> | null, permissions: {
  nivelAprobacion: 1, puedeAprobar: true, puedeRevisar: false, componentesAprobables: [] as string[], componentesRevisables: [] as string[], filtroTerritorial: undefined as string[] | undefined,
} }));
vi.mock('../../hooks/usePTARealtimeSync', () => ({
  usePTARealtimeSync: (options: any) => { sync.options = options; return { lastSyncTime: sync.lastSyncTime, unreadEvents: [], unreadCount: 0 }; },
}));
vi.mock('./PTASyncIndicator', () => ({ PTASyncIndicator: () => null }));
vi.mock('./PermisosPTAContext', () => ({
  PermisosPTAProvider: ({ children }: any) => children,
  SelectorRolPTA: () => null,
  usePermisosPTA: () => ({ permisos: sync.permissions, tieneVista: (view: string) => sync.visibleViews?.has(view) ?? true, rolLabel: 'Revisor', perfil: { rol: sync.rol, territorial_ids: [] } }),
  usePermisosPTAGranulares: () => ({
    puede: (permission: string) => sync.allowedPermissions?.has(permission) ?? true,
  }),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isSuperUser: sync.isSuperUser }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../../shell/src/services/api', () => ({
  getBaseURL: () => 'http://localhost',
  apiClient: { get: vi.fn().mockResolvedValue([{ codigo: '2026-1', estado: 'en_curso' }]) },
}));
vi.mock('../../services/api/supabase.service', () => ({ supabaseService: {} }));
vi.mock('../../services/api/ptaApi', () => ({
  getAllPTAs: vi.fn(),
  getAllPtasConEvidencias: vi.fn(),
  revisarEvidenciaPTA: vi.fn().mockResolvedValue({ success: true, data: {} }),
  deletePTA: vi.fn(),
  getPTADecisionListScope: vi.fn(),
  getSolicitudesPTA: vi.fn(),
  resolverSolicitudPTA: vi.fn(),
  getCatalogoTerritoriales: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getPTAEstadisticas: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getPTAById: vi.fn().mockResolvedValue({ success: false }),
  aprobarComponentesLote: vi.fn(),
  revisarComponentesLote: vi.fn(),
}));
vi.mock('./PTADetallePanelBackoffice', () => ({
  PTADetallePanelBackoffice: ({ pta, onUpdated }: any) => <button
    data-estado-pta={pta.estado}
    data-aprobaciones-usuario={JSON.stringify(pta.componentes_aprobacion_usuario || [])}
    data-revisiones-usuario={JSON.stringify(pta.componentes_revision_usuario || [])}
    onClick={() => onUpdated(sync.updatedPta || { ...pta, estado: 'Aprobado' })}>Resolver caso</button>,
}));
vi.mock('./ProgramacionAcademica', () => ({ ProgramacionAcademica: () => null }));
vi.mock('./MesaConcertacion', () => ({ MesaConcertacion: () => null }));

const pendientes = [
  { id: 'pta-1', docente_nombre: 'Docente uno', estado: 'Pendiente Jefatura', periodo: '2026-1', dias_en_proceso: 32 },
  { id: 'pta-2', docente_nombre: 'Docente dos', estado: 'Pendiente Jefatura', periodo: '2026-1' },
];
beforeEach(() => {
  vi.clearAllMocks();
  sync.isSuperUser = false;
  sync.lastSyncTime = 'sync';
  sync.updatedPta = null;
  sync.rol = 'jefatura';
  sync.allowedPermissions = null;
  sync.visibleViews = null;
  sync.permissions.filtroTerritorial = undefined;
  sync.permissions.puedeAprobar = true;
  sync.permissions.puedeRevisar = false;
  sync.permissions.componentesAprobables = [];
  sync.permissions.componentesRevisables = [];
  vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: false, territoriales: null, programas: null, cetaps: null } });
  vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: pendientes });
  vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [] });
  vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [] });
  vi.mocked(resolverSolicitudPTA).mockResolvedValue({ success: true, data: {} });
});

describe('eliminación administrativa en la interfaz', () => {
  const openDelete = async () => {
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByTitle('Más acciones')[0]);
    fireEvent.click(screen.getByText('Eliminar PTA'));
  };

  it('retira el PTA y actualiza los contadores aun si falla la consulta posterior, sin duplicar el borrado', async () => {
    sync.isSuperUser = true;
    let complete!: (value: any) => void;
    vi.mocked(deletePTA).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    render(<PtaBackofficeModule />);
    await openDelete();
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    const confirm = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(deletePTA).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Eliminando…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { complete({ success: true, data: { deleted: true } }); });
    await waitFor(() => expect(screen.queryByText('Docente uno')).toBeNull());
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(toast.success).toHaveBeenCalled();
  });

  it('conserva el PTA y permite reintentar cuando el servidor rechaza la eliminación', async () => {
    sync.isSuperUser = true;
    vi.mocked(deletePTA).mockResolvedValue({ success: false, data: null, message: 'La sesión ha expirado.' });
    render(<PtaBackofficeModule />);
    await openDelete();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('La sesión ha expirado.'));
    expect((screen.getByRole('button', { name: 'Eliminar definitivamente' }) as HTMLButtonElement).disabled).toBe(false);
    expect(tab('Todos').textContent).toContain('2');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('no ofrece eliminar por un rol visual admin si la cuenta no es superadministradora', async () => {
    sync.rol = 'admin';
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByTitle('Más acciones')[0]);
    expect(screen.queryByText('Eliminar PTA')).toBeNull();
    expect(screen.queryByTitle('Eliminar PTA definitivamente (solo admin)')).toBeNull();
  });
});
afterEach(cleanup);
const tab = (name: string) => screen.getAllByText(name)[0].closest('button')!;

describe('lotes de todos los componentes según permisos, sin recarga manual', () => {
  it.each(['aprobacion', 'revision'] as const)('el lote de %s no descarta la consulta del nuevo período mientras sigue pendiente', async etapa => {
    const componente = 'investigacion';
    sync.permissions.puedeAprobar = etapa === 'aprobacion';
    sync.permissions.puedeRevisar = etapa === 'revision';
    sync.permissions.componentesAprobables = etapa === 'aprobacion' ? [componente] : [];
    sync.permissions.componentesRevisables = etapa === 'revision' ? [`${componente}:general`] : [];
    vi.mocked(apiClient.get).mockResolvedValueOnce([
      { codigo: '2026-1', estado: 'en_curso' }, { codigo: '2026-2', estado: 'planeacion' },
    ]);
    const pta = { ...pendientes[0], componentes_en_alcance: [componente],
      componentes_aprobacion_usuario: etapa === 'aprobacion' ? [{ componente, estado: 'pendiente', revision_completa: true }] : [],
      componentes_revision_usuario: etapa === 'revision' ? [{ componente, subseccion: 'general', estado: 'pendiente' }] : [] };
    let completarConsulta!: (value: any) => void;
    let completarLote!: (value: any) => void;
    vi.mocked(getAllPTAs).mockImplementation(async filters => filters?.periodo === '2026-2'
      ? new Promise(resolve => { completarConsulta = resolve; }) : { success: true, data: [pta] });
    const decidir = etapa === 'aprobacion' ? aprobarComponentesLote : revisarComponentesLote;
    vi.mocked(decidir).mockImplementation(() => new Promise(resolve => { completarLote = resolve; }));
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    fireEvent.click(screen.getByRole('button', { name: etapa === 'aprobacion' ? 'Aprobar' : 'Marcar revisados' }));
    fireEvent.click(screen.getByRole('button', { name: etapa === 'aprobacion' ? 'Aprobar 1 PTAs' : 'Revisar 1 PTA' }));
    const modal = screen.getByRole('heading', { name: etapa === 'aprobacion' ? 'Aprobación en Lote' : 'Revisión en Lote' })
      .parentElement!.parentElement!;
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: /2026-1\s*Actual/ }));
    fireEvent.click(screen.getByRole('button', { name: /2026-2/ }));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2026-2' }), true));
    await act(async () => { completarLote({ success: true, data: {
      resumen: { total: 1, aprobados: etapa === 'aprobacion' ? 1 : 0, revisados: etapa === 'revision' ? 1 : 0, devueltos: 0, omitidos: 0, fallidos: 0 },
      resultados: [{ ptaId: pta.id, componente, subseccion: 'general', estado: etapa === 'aprobacion' ? 'aprobado' : 'revisado' }],
      ptasActualizados: [{ ...pta, estado: 'Aprobado' }],
    } }); });
    await act(async () => { completarConsulta({ success: true, data: [{ ...pta, id: 'pta-nuevo', periodo: '2026-2', docente_nombre: 'Docente nuevo período' }] }); });
    expect(await screen.findByText('Docente nuevo período')).toBeTruthy();
    expect(tab(etapa === 'aprobacion' ? 'Por aprobar' : 'Por revisar').textContent).toContain('1');
    expect(getAllPTAs).toHaveBeenCalledTimes(2);
    expect(decidir).toHaveBeenCalledTimes(1);
  });

  it.each(PTA_BULK_APPROVAL_GROUPS)('aprueba únicamente el componente autorizado del botón $label y actualiza su bandeja', async group => {
    const componente = group.componentKeys[0];
    sync.rol = 'docente';
    sync.permissions.filtroTerritorial = ['Meta'];
    sync.permissions.componentesAprobables = [componente];
    const pta = { ...pendientes[0], territorial: componente.startsWith('academica_') ? 'Meta' : 'Caldas', componentes_en_alcance: [componente],
      componentes_aprobacion_usuario: [{ componente, estado: 'pendiente', revision_completa: true }] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta] });
    vi.mocked(aprobarComponentesLote).mockImplementation(async () => {
      vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
      return { success: true, data: { resumen: { total: 1, aprobados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
        resultados: [{ ptaId: pta.id, componente, estado: 'aprobado' }],
        ptasActualizados: [{ ...pta, componentes_aprobacion_usuario: [{ componente, estado: 'aprobado', revision_completa: true }],
          componentes_aprobados: 1, componentes_total: 4 }] } };
    });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    expect(screen.getByRole('button', { name: group.label })).toBeTruthy();
    for (const ajeno of PTA_BULK_APPROVAL_GROUPS.filter(item => item.key !== group.key)) {
      expect(screen.queryByRole('button', { name: ajeno.label, exact: true })).toBeNull();
    }
    fireEvent.click(screen.getByRole('button', { name: group.label }));
    fireEvent.click(screen.getByRole('button', { name: `Aprobar ${group.label}` }));
    expect(await screen.findByText('1 PTA(s) procesado(s) · 1 aprobado(s) · 0 no aprobado(s)')).toBeTruthy();
    expect(aprobarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({ componentes: [componente], ptaIds: [pta.id] }));
    await waitFor(() => expect(tab('Aprobados').textContent).toContain('1'));
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');
    expect(screen.getByText('1/4 componentes')).toBeTruthy();
    expect(revisarComponentesLote).not.toHaveBeenCalled();
  });

  const revisiones = Object.entries(REVIEW_SUBSECCIONES_BY_COMPONENT)
    .flatMap(([componente, subsecciones]) => subsecciones.map(subseccion => ({ componente, subseccion })));
  it.each(revisiones)('revisa únicamente $componente/$subseccion, sin conceder aprobación ni perder estados por fallos de recarga', async ({ componente, subseccion }) => {
    sync.rol = 'docente';
    sync.permissions.filtroTerritorial = ['Meta'];
    sync.permissions.puedeAprobar = false;
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesAprobables = [];
    sync.permissions.componentesRevisables = [`${componente}:${subseccion}`];
    const pta = { ...pendientes[0], territorial: componente.startsWith('academica_') ? 'Meta' : 'Caldas', componentes_en_alcance: [componente],
      componentes_revision_usuario: [{ componente, subseccion, estado: 'pendiente' }], componentes_aprobacion_usuario: [] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta] });
    let complete!: (value: any) => void;
    vi.mocked(revisarComponentesLote).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisados' }));
    const submit = screen.getByRole('button', { name: 'Revisar 1 PTA' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(revisarComponentesLote).toHaveBeenCalledTimes(1);
    expect(revisarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({ ptaIds: [pta.id], revisiones: [`${componente}:${subseccion}`] }));
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    await act(async () => { complete({ success: true, data: { resumen: { total: 1, revisados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
      resultados: [{ ptaId: pta.id, componente, subseccion, estado: 'revisado' }],
      ptasActualizados: [{ ...pta, componentes_revision_usuario: [{ componente, subseccion, estado: 'revisado' }] }] } }); });
    await waitFor(() => expect(tab('Revisados').textContent).toContain('1'));
    expect(tab('Por revisar').textContent?.trim()).toBe('Por revisar');
    expect(aprobarComponentesLote).not.toHaveBeenCalled();
    expect(getAllPTAs).toHaveBeenCalledTimes(2);
  });

  it('no modifica estados ante un rechazo de revisión y consulta de nuevo el servidor', async () => {
    sync.permissions.componentesAprobables = [];
    sync.permissions.componentesRevisables = ['investigacion:general'];
    sync.permissions.puedeRevisar = true;
    const pta = { ...pendientes[0], componentes_en_alcance: ['investigacion'],
      componentes_revision_usuario: [{ componente: 'investigacion', subseccion: 'general', estado: 'pendiente' }] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta] });
    vi.mocked(revisarComponentesLote).mockResolvedValue({ success: false, message: 'Sin permisos vigentes', data: null as any });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar 1 PTA' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sin permisos vigentes'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(2));
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Revisados').textContent?.trim()).toBe('Revisados');
    expect(aprobarComponentesLote).not.toHaveBeenCalled();
  });
});

describe('aprobación masiva y resultado por PTA', () => {
  const configurarPendientes = (cantidad = 3) => {
    sync.permissions.componentesAprobables = ['academica_pregrado', 'complementarias_pregrado'];
    const data = Array.from({ length: cantidad }, (_, index) => ({
      ...pendientes[0], id: `pta-${index + 1}`, docente_nombre: `Docente lote ${index + 1}`,
      componentes_en_alcance: ['academica_pregrado', 'complementarias_pregrado'],
      componentes_aprobacion_usuario: [
        { componente: 'academica_pregrado', estado: 'pendiente', revision_completa: true },
        { componente: 'complementarias_pregrado', estado: 'pendiente', revision_completa: true },
      ],
    }));
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data });
    return data;
  };
  const aprobarSeleccionados = async () => {
    await screen.findByText('Docente lote 1');
    screen.getAllByRole('checkbox').filter(input => input.getAttribute('title')?.startsWith('Seleccionar'))
      .forEach(input => fireEvent.click(input));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    fireEvent.click(screen.getByRole('button', { name: /^Aprobar \d+ PTAs$/ }));
  };

  it('muestra aprobaciones parciales sin contradicciones y sincroniza grilla y bandejas aun si falla la recarga', async () => {
    const data = configurarPendientes();
    const actualizados = data.map((pta, index) => ({ ...pta,
      componentes_aprobacion_usuario: index === 1 ? [
        { componente: 'academica_pregrado', estado: 'aprobado', revision_completa: true },
        { componente: 'complementarias_pregrado', estado: 'pendiente', revision_completa: true },
      ] : [{ componente: 'academica_pregrado', estado: 'aprobado', revision_completa: true }],
      componentes_aprobados: 1, componentes_total: 3,
    }));
    vi.mocked(aprobarComponentesLote).mockImplementation(async () => {
      vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
      return { success: true, data: {
        resumen: { total: 6, aprobados: 3, devueltos: 0, omitidos: 2, fallidos: 1 },
        resultados: data.flatMap((pta, index) => [
          { ptaId: pta.id, componente: 'academica_pregrado', estado: 'aprobado' as const,
            motivo: index === 0 ? 'Aprobación confirmada en el PTA. La operación reportó: Fallo al registrar evento' : undefined },
          { ptaId: pta.id, componente: 'complementarias_pregrado', estado: index === 1 ? 'fallido' as const : 'omitido' as const,
            motivo: index === 1 ? 'Fuera de alcance territorial' : 'Sin actividades en este componente' },
        ]), ptasActualizados: actualizados,
      } };
    });
    render(<PtaBackofficeModule />);
    await aprobarSeleccionados();
    expect(await screen.findByText('3 PTA(s) procesado(s) · 3 aprobado(s) · 0 no aprobado(s)')).toBeTruthy();
    expect(screen.getAllByText('APROBADO', { exact: true })).toHaveLength(3);
    expect(screen.queryByText('FALLIDO', { exact: true })).toBeNull();
    expect(screen.queryByText('OMITIDO', { exact: true })).toBeNull();
    expect(screen.getByText(/Complementarias.*Fuera de alcance territorial/)).toBeTruthy();
    expect(screen.getByText(/Docencia.*Aprobación confirmada.*Fallo al registrar evento/)).toBeTruthy();
    await waitFor(() => expect(tab('Por aprobar').textContent).toContain('1'));
    expect(tab('Aprobados').textContent).toContain('2');
    expect(tab('Aprobados').getAttribute('title')).toContain('tus aprobaciones completadas');
    expect(screen.getByText('2 Aprobados')).toBeTruthy();
    const consultas = vi.mocked(getAllPTAs).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(vi.mocked(getAllPTAs).mock.calls.length).toBeGreaterThan(consultas));
    await waitFor(() => expect(screen.queryByText('Resultado — Aprobar')).toBeNull());
    expect(screen.getAllByText('1/3 componentes')).toHaveLength(3);
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente lote 1')).toBeTruthy();
    expect(screen.queryByText('Docente lote 2')).toBeNull();
    expect(screen.getByText('Docente lote 3')).toBeTruthy();
    expect(aprobarComponentesLote).toHaveBeenCalledTimes(1);
  });

  it('informa No aprobado con los motivos y refresca aunque ningún componente se apruebe', async () => {
    configurarPendientes(2);
    vi.mocked(aprobarComponentesLote).mockResolvedValue({ success: true, data: {
      resumen: { total: 4, aprobados: 0, devueltos: 0, omitidos: 2, fallidos: 2 },
      resultados: ['pta-1', 'pta-2'].flatMap(ptaId => [
        { ptaId, componente: 'academica_pregrado', estado: 'fallido' as const, motivo: 'Revisión pendiente' },
        { ptaId, componente: 'complementarias_pregrado', estado: 'omitido' as const, motivo: 'Sin actividades en este componente' },
      ]),
    } });
    render(<PtaBackofficeModule />);
    await aprobarSeleccionados();
    expect(await screen.findByText('2 PTA(s) procesado(s) · 0 aprobado(s) · 2 no aprobado(s)')).toBeTruthy();
    expect(screen.getAllByText('NO APROBADO', { exact: true })).toHaveLength(2);
    expect(screen.getAllByText(/Docencia.*Revisión pendiente/)).toHaveLength(2);
    await waitFor(() => expect(vi.mocked(getAllPTAs).mock.calls.length).toBeGreaterThan(1));
  });

  it('bloquea clics repetidos durante el procesamiento del lote', async () => {
    configurarPendientes(1);
    let complete!: (value: any) => void;
    vi.mocked(aprobarComponentesLote).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente lote 1');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    const submit = screen.getByRole('button', { name: 'Aprobar 1 PTAs' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(aprobarComponentesLote).toHaveBeenCalledTimes(1);
    await act(async () => { complete({ success: true, data: { resumen: { total: 1, aprobados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
      resultados: [{ ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'aprobado' }] } }); });
  });

  it('el botón por componente conserva el alcance solicitado y el refresco actualiza los contadores', async () => {
    const [pta] = configurarPendientes(1);
    const actualizado = { ...pta, componentes_aprobacion_usuario: [
      { componente: 'academica_pregrado', estado: 'aprobado', revision_completa: true },
    ] };
    vi.mocked(aprobarComponentesLote).mockImplementation(async () => {
      vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [actualizado] });
      return { success: true, data: { resumen: { total: 1, aprobados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
        resultados: [{ ptaId: pta.id, componente: 'academica_pregrado', estado: 'aprobado' }] } };
    });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente lote 1');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Docencia Pregrado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar Docencia Pregrado' }));
    expect(await screen.findByText('1 PTA(s) procesado(s) · 1 aprobado(s) · 0 no aprobado(s)')).toBeTruthy();
    expect(aprobarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({ componentes: ['academica_pregrado'] }));
    await waitFor(() => expect(tab('Aprobados').textContent).toContain('1'));
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');
  });

  it('conserva la devolución masiva y su motivo sin convertirla en una aprobación', async () => {
    configurarPendientes(1);
    vi.mocked(aprobarComponentesLote).mockResolvedValue({ success: true, data: {
      resumen: { total: 2, aprobados: 0, devueltos: 1, omitidos: 1, fallidos: 0 },
      resultados: [
        { ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'devuelto' },
        { ptaId: 'pta-1', componente: 'complementarias_pregrado', estado: 'omitido', motivo: 'Sin actividades en este componente' },
      ],
    } });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente lote 1');
    fireEvent.click(screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!);
    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    fireEvent.change(screen.getByPlaceholderText('Describa el motivo de devolución aplicable a todos los PTAs seleccionados...'),
      { target: { value: 'Corregir soportes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Devolver 1 PTAs' }));
    expect(await screen.findByText('Resultado — Devolver')).toBeTruthy();
    expect(aprobarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({ estado: 'devuelto', comentarios: 'Corregir soportes' }));
    await waitFor(() => expect(vi.mocked(getAllPTAs).mock.calls.length).toBeGreaterThan(1));
  });
});

describe('listado y contadores del backoffice', () => {
  it.each(['revision', 'aprobacion'])('la última área de %s puede denegar sin anunciar que toda la solicitud mixta quedó denegada', async etapa => {
    sync.permissions.componentesAprobables = etapa === 'aprobacion' ? ['academica_pregrado'] : [];
    sync.permissions.componentesRevisables = etapa === 'revision' ? ['academica_pregrado:general'] : [];
    sync.permissions.puedeAprobar = etapa === 'aprobacion';
    sync.permissions.puedeRevisar = etapa === 'revision';
    const solicitud = { id: 'sol-mixta-final', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', docenteNombre: 'Docente decisión mixta', componentes: ['docencia'], componentesTotal: 2,
      decisionesComponentes: { docencia: { estado: 'pendiente' } } };
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [solicitud] });
    render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    fireEvent.click(await screen.findByText('Docente decisión mixta'));
    fireEvent.change(screen.getByPlaceholderText('Justificacion de la resolucion...'), { target: { value: 'Docencia no requiere cambio.' } });
    vi.mocked(resolverSolicitudPTA).mockResolvedValue({ success: true, data: { ...solicitud, estado: 'aprobado',
      componentes: ['docencia', 'investigacion'], decisionesComponentes: {
        docencia: { estado: 'denegado' }, investigacion: { estado: 'aprobado' },
      },
    } });
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Denegar', exact: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Decisión registrada. Edición habilitada únicamente para los componentes aprobados.'));
    expect(toast.success).not.toHaveBeenCalledWith('Solicitud denegada');
    expect(screen.getByText('Edición habilitada')).toBeTruthy();
    expect(screen.getAllByText('Docencia · Denegado').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Investigación ·/)).toBeNull();
    expect(screen.queryByText('1 por resolver')).toBeNull();
  });

  it('bloquea una resolución repetida y retira la solicitud habilitada de Pendientes aunque falle la consulta posterior', async () => {
    sync.permissions.componentesAprobables = ['investigacion'];
    const solicitud = { id: 'sol-completa', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', docenteNombre: 'Docente edición completa', componentes: ['investigacion'],
      decisionesComponentes: { investigacion: { estado: 'pendiente' } } };
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [solicitud] });
    let resolveDecision!: (value: any) => void;
    vi.mocked(resolverSolicitudPTA).mockImplementation(() => new Promise(resolve => { resolveDecision = resolve; }));
    render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    await screen.findByText('Docente edición completa');
    fireEvent.click(screen.getByRole('button', { name: 'Pendientes', exact: true }));
    fireEvent.click(await screen.findByText('Docente edición completa'));
    const aprobar = screen.getByRole('button', { name: /Aprobar componente/i }) as HTMLButtonElement;
    fireEvent.click(aprobar);
    fireEvent.click(aprobar);
    expect(resolverSolicitudPTA).toHaveBeenCalledTimes(1);
    expect(aprobar.disabled).toBe(true);
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    const habilitada = { ...solicitud, estado: 'aprobado', decisionesComponentes: { investigacion: { estado: 'aprobado' } } };
    await act(async () => { resolveDecision({ success: true, data: habilitada }); });
    await screen.findByRole('alert');
    expect(screen.queryByText('Docente edición completa')).toBeNull();
    expect(screen.queryByText('1 por resolver')).toBeNull();
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [habilitada] });
    fireEvent.click(screen.getByRole('button', { name: 'Habilitadas', exact: true }));
    await screen.findByText('Docente edición completa');
    expect(screen.getByText('Edición habilitada')).toBeTruthy();
  });
  it.each([
    ['docencia', 'academica_pregrado'], ['investigacion', 'investigacion'],
    ['extension', 'ext_capacitacion'], ['complementarias', 'complementarias_gestion_profesoral'],
  ])('un aprobador de %s recibe solicitudes nuevas sin recarga y conserva su decisión parcial ante fallos de consulta', async (area, componente) => {
    sync.permissions.componentesAprobables = [componente];
    sync.permissions.componentesRevisables = [];
    const solicitud = { id: 'sol-nueva', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', docenteNombre: 'Docente solicitud nueva', componentes: [area], componentesTotal: 4,
      decisionesComponentes: { [area]: { estado: 'pendiente' } }, createdAt: '2026-10-07T12:00:00Z' };
    const { rerender } = render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    await screen.findByText('Sin solicitudes');
    expect(screen.queryByText('Sin componentes autorizados')).toBeNull();
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [solicitud] });
    sync.lastSyncTime = 'sync-nueva';
    rerender(<PtaBackofficeModule initialView="solicitudes_pta" />);
    fireEvent.click(await screen.findByText('Docente solicitud nueva'));
    expect(screen.getByText('1 por resolver')).toBeTruthy();
    const decisiones = Object.fromEntries(['docencia', 'investigacion', 'extension', 'complementarias']
      .map(key => [key, { estado: key === area ? 'aprobado' : 'pendiente' }]));
    vi.mocked(resolverSolicitudPTA).mockResolvedValue({ success: true, data: {
      ...solicitud, componentes: Object.keys(decisiones), decisionesComponentes: decisiones, resolucionParcial: true,
    } });
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    fireEvent.click(screen.getByRole('button', { name: /Aprobar componente/i }));
    await waitFor(() => expect(resolverSolicitudPTA).toHaveBeenCalledWith('sol-nueva',
      expect.objectContaining({ decision: 'aprobado', componentes: [area] })));
    await screen.findByText(/Tu área ya fue resuelta/);
    expect(screen.queryByText('1 por resolver')).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprobar componente/i })).toBeNull();
    expect((await screen.findByRole('alert')).textContent).toContain('No fue posible consultar');
    expect(screen.queryByText('Sin solicitudes')).toBeNull();
    for (const otraArea of Object.keys(decisiones).filter(key => key !== area)) {
      const labels: Record<string, string> = { docencia: 'Docencia', investigacion: 'Investigación', extension: 'Extensión', complementarias: 'Complementarias' };
      expect(screen.queryByText(`${labels[otraArea]} · Pendiente`)).toBeNull();
    }
  });

  it('descarta la consulta anterior al cambiar el filtro de solicitudes', async () => {
    let resolveAnterior!: (value: any) => void;
    vi.mocked(getSolicitudesPTA).mockImplementation(estado => estado === 'pendiente'
      ? Promise.resolve({ success: true, data: [{ id: 'sol-pendiente', estado: 'pendiente', docenteNombre: 'Solicitud actual', componentes: ['investigacion'] }] })
      : new Promise(resolve => { resolveAnterior = resolve; }));
    render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pendientes', exact: true }));
    await screen.findByText('Solicitud actual');
    await act(async () => { resolveAnterior({ success: true, data: [{ id: 'sol-antigua', estado: 'gestionada', docenteNombre: 'Solicitud anterior' }] }); });
    expect(screen.getByText('Solicitud actual')).toBeTruthy();
    expect(screen.queryByText('Solicitud anterior')).toBeNull();
  });

  it('un fallo al consultar Pendientes no muestra solicitudes completadas de Todas bajo ese filtro', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [
      { id: 'sol-completada', estado: 'gestionada', docenteNombre: 'Solicitud completada anterior' },
    ] });
    render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    await screen.findByText('Solicitud completada anterior');
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Pendientes', exact: true }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Solicitud completada anterior')).toBeNull();
    expect(screen.queryByText('Sin solicitudes')).toBeNull();
  });

  it('un fallo inicial de consulta permite reintentar y no se presenta como una bandeja vacía', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: false, data: [] });
    render(<PtaBackofficeModule initialView="solicitudes_pta" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Sin solicitudes')).toBeNull();
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [{ id: 'sol-reintento', estado: 'pendiente', docenteNombre: 'Solicitud recuperada' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Solicitud recuperada');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('no abre Solicitudes PTA mediante initialView cuando el rol no tiene esa vista', async () => {
    sync.visibleViews = new Set(['gestion', 'seguimiento_docs']);

    render(<PtaBackofficeModule initialView="solicitudes_pta" />);

    expect(await screen.findByText('Docente uno')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Solicitudes PTA' })).toBeNull();
    expect(getSolicitudesPTA).not.toHaveBeenCalled();
  });

  it('no abre Seguimiento mediante initialView cuando el rol no tiene esa vista', async () => {
    sync.visibleViews = new Set(['gestion', 'solicitudes_pta']);

    render(<PtaBackofficeModule initialView="seguimiento_docs" />);

    expect(await screen.findByText('Docente uno')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Seguimiento' })).toBeNull();
    expect(getAllPtasConEvidencias).not.toHaveBeenCalled();
  });

  it('entra directamente a Seguimiento cuando es la única vista autorizada', async () => {
    sync.visibleViews = new Set(['seguimiento_docs']);
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION]);

    render(<PtaBackofficeModule />);

    expect(await screen.findByText('Sin componentes de aprobación asignados')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Seguimiento' })).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
  });

  it('explica que el permiso funcional no concede componentes por sí solo', async () => {
    sync.visibleViews = new Set(['gestion', 'seguimiento_docs']);
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION]);

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    expect(await screen.findByText('Sin componentes de aprobación asignados')).toBeTruthy();
    expect(screen.getByText(/necesita al menos un permiso de aprobación por componente/)).toBeTruthy();
  });

  it('muestra y resuelve solamente los componentes de solicitud entregados al revisor', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [{
      id: 'sol-docencia',
      tipoSolicitud: 'edicion_componentes',
      caso: 'edicion_pta',
      estado: 'pendiente',
      docenteNombre: 'Docente solicitud parcial',
      componentes: ['docencia'],
      componentesTotal: 2,
      decisionesComponentes: { docencia: { estado: 'pendiente' } },
      justificacion: 'Actualizar la carga de docencia.',
      createdAt: '2026-09-22T12:00:00.000Z',
    }] });
    vi.mocked(resolverSolicitudPTA).mockResolvedValue({
      success: true,
      data: { resolucionParcial: true, componentesPendientes: ['investigacion'] },
    });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitudes PTA' }));
    fireEvent.click(await screen.findByText('Docente solicitud parcial'));

    expect(screen.getAllByText('Docencia · Pendiente').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Investigación ·/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Aprobar componente/i }));
    await waitFor(() => expect(resolverSolicitudPTA).toHaveBeenCalledWith(
      'sol-docencia',
      expect.objectContaining({ decision: 'aprobado', componentes: ['docencia'] }),
    ));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Decisión registrada para el componente'));
  });

  it('permite decidir por separado cuando el revisor tiene varios componentes visibles', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [{
      id: 'sol-multiple', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', docenteNombre: 'Docente solicitud múltiple',
      componentes: ['docencia', 'investigacion'], componentesTotal: 2,
      decisionesComponentes: {
        docencia: { estado: 'pendiente' }, investigacion: { estado: 'pendiente' },
      },
      justificacion: 'Actualizar dos componentes.',
      createdAt: '2026-09-22T12:00:00.000Z',
    }] });
    vi.mocked(resolverSolicitudPTA).mockResolvedValue({
      success: true, data: { resolucionParcial: true, componentesPendientes: ['investigacion'] },
    });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitudes PTA' }));
    fireEvent.click(await screen.findByText('Docente solicitud múltiple'));

    const aprobar = screen.getByRole('button', { name: /Aprobar componente/i }) as HTMLButtonElement;
    expect(aprobar.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Docencia' }));
    expect(aprobar.disabled).toBe(false);
    fireEvent.click(aprobar);

    await waitFor(() => expect(resolverSolicitudPTA).toHaveBeenCalledWith(
      'sol-multiple',
      expect.objectContaining({ decision: 'aprobado', componentes: ['docencia'] }),
    ));
  });

  it('permite reintentar la consolidación sin cambiar decisiones ya registradas', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [{
      id: 'sol-consolidacion', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', requiereConsolidacion: true,
      docenteNombre: 'Docente por consolidar', componentes: ['docencia'], componentesTotal: 2,
      decisionesComponentes: { docencia: { estado: 'aprobado' } },
      justificacion: 'Cambio ya decidido.', createdAt: '2026-09-22T12:00:00.000Z',
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitudes PTA' }));
    fireEvent.click(await screen.findByText('Docente por consolidar'));
    fireEvent.click(screen.getByRole('button', { name: 'Completar resolución' }));

    await waitFor(() => expect(resolverSolicitudPTA).toHaveBeenCalledWith(
      'sol-consolidacion',
      expect.objectContaining({ decision: 'aprobado', componentes: ['docencia'] }),
    ));
    expect(screen.queryByRole('button', { name: /Denegar/i })).toBeNull();
  });

  it('indica cuando el área visible ya decidió y la solicitud espera otras áreas', async () => {
    vi.mocked(getSolicitudesPTA).mockResolvedValue({ success: true, data: [{
      id: 'sol-docencia-resuelta', tipoSolicitud: 'edicion_componentes', caso: 'edicion_pta',
      estado: 'pendiente', docenteNombre: 'Docente pendiente de otras áreas',
      componentes: ['docencia'], componentesTotal: 2,
      decisionesComponentes: { docencia: { estado: 'aprobado' } },
      createdAt: '2026-09-22T12:00:00.000Z',
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitudes PTA' }));
    fireEvent.click(await screen.findByText('Docente pendiente de otras áreas'));

    expect(screen.getAllByText('Docencia · Aprobado').length).toBeGreaterThan(0);
    expect(screen.getByText(/Tu área ya fue resuelta/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Aprobar componente/i })).toBeNull();
    expect(screen.queryByText('1 por resolver')).toBeNull();
  });

  it('muestra la tarjeta agrupada de Docencia con un permiso granular aunque no haya evidencias', async () => {
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, 'pta.approve.academica.pregrado']);
    vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [{
      id: 'pta-docencia',
      pta_id: 'pta-docencia',
      docente_nombre: 'Docente con horas de docencia',
      estado: 'Aprobado',
      periodo: '2026-1',
      horas_docencia: 384,
      evidencias: [],
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    expect(await screen.findByText('Docente con horas de docencia')).toBeTruthy();
    expect(screen.getByText('Docencia')).toBeTruthy();
    expect(screen.getByText('Soportes pendientes')).toBeTruthy();
    expect(screen.getByText('Seguimiento 0% · Faltan 384h')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Avance total de soportes de Docente con horas de docencia' }).getAttribute('aria-valuenow')).toBe('0');
    expect(screen.queryByText('Investigación')).toBeNull();
    expect(screen.queryByText('Extensión')).toBeNull();
    expect(screen.queryByText('Complementarias')).toBeNull();
  });

  it('mantiene verdadero el avance global sin mostrar evidencias de componentes ajenos', async () => {
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, 'pta.approve.academica.pregrado']);
    vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [{
      id: 'pta-resumen-seguro',
      pta_id: 'pta-resumen-seguro',
      docente_nombre: 'Docente con seguimiento completo',
      estado: 'Aprobado',
      periodo: '2026-1',
      horas_docencia: 100,
      horas_investigacion: 200,
      evidencias: [{
        id: 'ev-docencia', componente_pta: 'docencia', estado_revision: 'aprobado', horas_avance: 100,
      }],
      seguimiento_resumen: {
        docencia: { horas_aprobadas: 100 },
        investigacion: { horas_aprobadas: 200 },
        extension: { horas_aprobadas: 0 },
        complementarias: { horas_aprobadas: 0 },
      },
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    expect(await screen.findByText('Docente con seguimiento completo')).toBeTruthy();
    expect(screen.getByText('Seguimiento 100%')).toBeTruthy();
    expect(screen.getByText('Soportes completos')).toBeTruthy();
    expect(screen.getByText('Docencia')).toBeTruthy();
    expect(screen.queryByText('Investigación')).toBeNull();
  });

  it('sincroniza Seguimiento con el período global y descarta resultados de otros períodos', async () => {
    vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [
      {
        id: 'pta-actual',
        pta_id: 'pta-actual',
        docente_nombre: 'Docente actual',
        estado: 'Aprobado',
        periodo: '2026-1',
        horas_investigacion: 200,
        evidencias: [{
          id: 'ev-actual',
          componente_pta: 'investigacion',
          estado_revision: 'aprobado',
          horas_avance: 200,
        }],
      },
      {
        id: 'pta-borrador',
        pta_id: 'pta-borrador',
        docente_nombre: 'Docente en borrador',
        estado: 'Borrador',
        periodo: '2026-1',
        evidencias: [],
      },
      {
        id: 'pta-historico',
        pta_id: 'pta-historico',
        docente_nombre: 'Docente histórico',
        estado: 'Terminado',
        periodo: '2025-2',
        evidencias: [{ id: 'ev-1', componente_pta: 'investigacion' }],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    await waitFor(() => expect(getAllPtasConEvidencias).toHaveBeenCalledWith('2026-1'));
    expect(await screen.findByText('Docente actual')).toBeTruthy();
    expect(screen.getByText('Soportes completos')).toBeTruthy();
    expect(screen.getByText('Seguimiento 100%')).toBeTruthy();
    expect(screen.queryByText('Docente en borrador')).toBeNull();
    expect(screen.queryByText('Docente histórico')).toBeNull();
    expect(screen.queryByText('Todos los periodos')).toBeNull();
    expect(screen.getByText('Período: 2026-1')).toBeTruthy();
  });

  it('prioriza un soporte pendiente aunque las horas aprobadas ya estén completas', async () => {
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, 'pta.approve.investigacion']);
    vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [{
      id: 'pta-pendiente-adjunto', pta_id: 'pta-pendiente-adjunto',
      docente_nombre: 'Docente con soporte pendiente', estado: 'Aprobado', periodo: '2026-1',
      horas_investigacion: 100,
      seguimiento_resumen: { investigacion: { horas_aprobadas: 100 } },
      evidencias: [
        { id: 'ev-main', componente_pta: 'investigacion', estado_revision: 'aprobado', horas_avance: 100, fecha_subida: '2026-09-22T10:00:00Z' },
        { id: 'ev-adjunto', componente_pta: 'investigacion', estado_revision: 'pendiente', horas_avance: 0, descripcion: 'Adjunto 1 de 1', fecha_subida: '2026-09-22T10:00:01Z' },
      ],
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    expect(await screen.findByText('1 soporte por revisar')).toBeTruthy();
    expect(screen.queryByText('Soportes completos')).toBeNull();
    fireEvent.click(screen.getByText('Docente con soporte pendiente'));
    expect(await screen.findByRole('button', { name: /Aprobar/ })).toBeTruthy();
  });

  it('no presenta una aprobación fallida como exitosa y vuelve a consultar el estado real', async () => {
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, 'pta.approve.investigacion']);
    vi.mocked(getAllPtasConEvidencias).mockResolvedValue({ success: true, data: [{
      id: 'pta-fallo', pta_id: 'pta-fallo', docente_nombre: 'Docente fallo controlado',
      estado: 'Aprobado', periodo: '2026-1', horas_investigacion: 100,
      evidencias: [{
        id: 'ev-fallo', componente_pta: 'investigacion', estado_revision: 'pendiente',
        horas_avance: 100, nombre: 'soporte.pdf', fecha_subida: '2026-09-22T10:00:00Z',
      }],
    }] });
    vi.mocked(revisarEvidenciaPTA).mockResolvedValue({ success: false, data: null, message: 'Permiso retirado' } as any);

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));
    fireEvent.click(await screen.findByText('Docente fallo controlado'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Permiso retirado'));
    expect(toast.success).not.toHaveBeenCalledWith('Justificación aprobada');
    await waitFor(() => expect(getAllPtasConEvidencias).toHaveBeenCalledTimes(2));
  });

  it('elimina de la vista los datos anteriores si el servidor revoca Seguimiento', async () => {
    sync.allowedPermissions = new Set([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, 'pta.approve.investigacion']);
    vi.mocked(getAllPtasConEvidencias).mockResolvedValueOnce({ success: true, data: [{
      id: 'pta-revocada', pta_id: 'pta-revocada', docente_nombre: 'Docente antes visible',
      estado: 'Aprobado', periodo: '2026-1', horas_investigacion: 100, evidencias: [],
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));
    await screen.findByText('Docente antes visible');

    vi.mocked(getAllPtasConEvidencias).mockResolvedValueOnce({
      success: false, data: [], message: 'Permiso retirado',
    } as any);
    fireEvent.click(screen.getByTitle('Recargar'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Permiso retirado'));
    expect(screen.queryByText('Docente antes visible')).toBeNull();
  });

  it('refresca inmediatamente después de resolver en el panel sin esperar al sondeo', async () => {
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pendientes[0], estado: 'Aprobado' }, pendientes[1]] });
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(2));
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(tab('Aprobados').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.getByText('Resolver caso')).toBeTruthy();
  });

  it.each(['aprobacion', 'revision'] as const)('sincroniza indicadores y el PTA abierto cuando otro usuario completa su %s', async etapa => {
    sync.rol = 'docente';
    sync.permissions.componentesAprobables = etapa === 'aprobacion' ? ['investigacion'] : [];
    sync.permissions.componentesRevisables = etapa === 'revision' ? ['investigacion:general'] : [];
    sync.permissions.puedeAprobar = etapa === 'aprobacion';
    sync.permissions.puedeRevisar = etapa === 'revision';
    const pta = { ...pendientes[0], componentes_en_alcance: ['investigacion'],
      componentes_aprobados: 0, componentes_total: 4,
      componentes_aprobacion_usuario: etapa === 'aprobacion'
        ? [{ componente: 'investigacion', estado: 'pendiente', revision_completa: true }] : [],
      componentes_revision_usuario: etapa === 'revision'
        ? [{ componente: 'investigacion', subseccion: 'general', estado: 'pendiente' }] : [],
    };
    const ajeno = { ...pendientes[1], componentes_en_alcance: [],
      componentes_aprobacion_usuario: [], componentes_revision_usuario: [] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta, ajeno] });
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    expect(screen.getByText('1 pendiente')).toBeTruthy();
    const estadoCompletado = etapa === 'aprobacion' ? 'aprobado' : 'revisado';
    const campo = etapa === 'aprobacion' ? 'componentes_aprobacion_usuario' : 'componentes_revision_usuario';
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pta,
      componentes_aprobados: etapa === 'aprobacion' ? 1 : 0,
      [campo]: [{ ...pta[campo][0], estado: estadoCompletado }],
    }, ajeno] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.queryByText('1 pendiente')).toBeNull();
    expect(tab('Todos').textContent).toContain('2');
    expect(tab(etapa === 'aprobacion' ? 'Por aprobar' : 'Por revisar').textContent).not.toMatch(/\d/);
    expect(tab(etapa === 'aprobacion' ? 'Aprobados' : 'Revisados').textContent).toContain('1');
    expect(screen.queryByText(/requiere tu aprobación/)).toBeNull();
    if (etapa === 'aprobacion') {
      expect(screen.getByText('0 Pendientes')).toBeTruthy();
      expect(screen.getByText('1 Aprobados')).toBeTruthy();
      expect(screen.getByText('1/4 componentes')).toBeTruthy();
    }
    const panel = screen.getByText('Resolver caso');
    expect(panel.getAttribute('data-estado-pta')).toBe('Pendiente Jefatura');
    expect(panel.getAttribute(etapa === 'aprobacion' ? 'data-aprobaciones-usuario' : 'data-revisiones-usuario'))
      .toContain(estadoCompletado);
  });

  it.each(PTA_COMPONENT_KEYS)('actualiza las bandejas al aprobar individualmente %s aunque el PTA siga pendiente y falle la consulta', async componente => {
    sync.rol = 'docente';
    const esDocencia = componente.startsWith('academica_');
    sync.permissions.filtroTerritorial = ['Meta'];
    sync.permissions.componentesAprobables = esDocencia ? [componente] : [componente, 'academica_pregrado'];
    const pta = { ...pendientes[0], territorial: esDocencia ? 'Meta' : 'Caldas', componentes_en_alcance: [componente],
      componentes_aprobacion_estado: [
        { componente: 'academica_pregrado', estado: 'pendiente', revision_completa: true },
        ...(!esDocencia ? [{ componente, estado: 'pendiente', revision_completa: true }] : []),
      ],
      componentes_aprobacion_usuario: [{ componente, estado: 'pendiente', revision_completa: true }] };
    const ajeno = { ...pendientes[1], componentes_en_alcance: [], componentes_aprobacion_usuario: [] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta, ajeno] });
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    expect(tab('Por aprobar').textContent).toContain('1');
    sync.updatedPta = { ...pta, componentes_aprobados: 1, componentes_total: 4,
      componentes_aprobacion_usuario: [{ componente, estado: 'aprobado', revision_completa: true }] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(2));
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por aprobar').textContent).not.toMatch(/\d/);
    expect(tab('Aprobados').textContent).toContain('1');
    expect(screen.getByText('1/4 componentes')).toBeTruthy();
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();
  });

  it('conserva Por aprobar hasta resolver todos los componentes propios y no confunde pendientes ajenos', async () => {
    sync.permissions.componentesAprobables = ['investigacion', 'ext_gobierno'];
    const pta = { ...pendientes[0], componentes_en_alcance: ['investigacion', 'ext_gobierno'],
      componentes_aprobacion_usuario: [
        { componente: 'investigacion', estado: 'pendiente', revision_completa: true },
        { componente: 'ext_gobierno', estado: 'pendiente', revision_completa: true },
      ] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta] });
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    sync.updatedPta = { ...pta, componentes_aprobacion_usuario: [
      { componente: 'investigacion', estado: 'aprobado', revision_completa: true },
      { componente: 'ext_gobierno', estado: 'pendiente', revision_completa: true },
    ] };
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(2));
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(tab('Aprobados').textContent).not.toMatch(/\d/);
    sync.updatedPta = { ...pta, componentes_aprobacion_usuario: [
      { componente: 'investigacion', estado: 'aprobado', revision_completa: true },
      { componente: 'ext_gobierno', estado: 'aprobado', revision_completa: true },
    ], componentes_aprobacion_estado: [{ componente: 'academica_pregrado', estado: 'pendiente' }] };
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(3));
    expect(tab('Por aprobar').textContent).not.toMatch(/\d/);
    expect(tab('Aprobados').textContent).toContain('1');
  });

  it('no restaura los contadores pendientes cuando una lectura anterior termina después de aprobar en el detalle', async () => {
    sync.permissions.componentesAprobables = ['academica_territorial'];
    const pta = { ...pendientes[0], componentes_en_alcance: ['academica_territorial'],
      componentes_aprobacion_usuario: [{ componente: 'academica_territorial', territorial_id: 'Meta',
        nivel: 'pregrado', estado: 'pendiente', revision_completa: true }] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pta] });
    render(<PtaBackofficeModule />);
    fireEvent.click(await screen.findByText('Docente uno'));
    await screen.findByText('Resolver caso');
    let completarLecturaAnterior!: (value: any) => void;
    vi.mocked(getAllPTAs).mockImplementationOnce(() => new Promise(resolve => { completarLecturaAnterior = resolve; }));
    let lecturaAnterior!: Promise<void>;
    act(() => { lecturaAnterior = sync.options.onRefresh(); });
    sync.updatedPta = { ...pta, componentes_aprobacion_usuario: [
      { ...pta.componentes_aprobacion_usuario[0], estado: 'aprobado' },
    ], componentes_aprobacion_estado: [{ componente: 'academica_territorial', estado: 'pendiente' }] };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: false, data: [] });
    fireEvent.click(screen.getByText('Resolver caso'));
    await waitFor(() => expect(getAllPTAs).toHaveBeenCalledTimes(3));
    await act(async () => {
      completarLecturaAnterior({ success: true, data: [pta] });
      await lecturaAnterior;
    });
    expect(tab('Por aprobar').textContent).not.toMatch(/\d/);
    expect(tab('Aprobados').textContent).toContain('1');
    expect(tab('Todos').textContent).toContain('1');
  });

  it('vuelve a una página con registros cuando la última página de pendientes queda vacía', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ ...pendientes[0], id: `pta-${i}`, docente_nombre: `Docente número ${i}` }));
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: many });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente número 0');
    expect(screen.getByText('51 Pendientes')).toBeTruthy();
    fireEvent.click(tab('Por aprobar'));
    fireEvent.click(screen.getByText('Pág 1 / 2').nextElementSibling!);
    await screen.findByText('Pág 2 / 2');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: many.slice(0, 50) });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.queryByText('Pág 2 / 2')).toBeNull();
    expect(screen.getByText('Docente número 0')).toBeTruthy();
    expect(screen.getByText('50 Pendientes')).toBeTruthy();
  });
  it('actualiza todas las pestañas y conserva el otro pendiente tras una decisión simultánea', async () => {
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    fireEvent.click(tab('Por aprobar'));
    expect(tab('Todos').textContent).toContain('2');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pendientes[0], estado: 'Aprobado' }, pendientes[1]] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(tab('Aprobados').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(vi.mocked(getAllPTAs).mock.calls.every(([filters]) => !filters?.estado)).toBe(true);
  });

  it('mantiene los registros visibles ante fallos de consulta', async () => {
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    vi.mocked(getAllPTAs).mockRejectedValueOnce(new Error('Sin conexión'));
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
  });

  it('no infiere el alcance de decisiones desde el filtro del perfil asociado al rol', async () => {
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por aprobar').textContent).toContain('2');
  });

  it('la territorial del servidor limita acciones sin ocultar PTAs consultables', async () => {
    sync.permissions.componentesAprobables = ['academica_territorial'];
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: true, territoriales: ['Nariño'], programas: null, cetaps: null } });
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], componentes_con_datos: ['academica_territorial'],
        componentes_en_alcance: [], componentes_aprobacion_usuario: [],
        territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], componentes_con_datos: ['academica_territorial'],
        componentes_en_alcance: ['academica_territorial'],
        componentes_aprobacion_usuario: [{ componente: 'academica_territorial', estado: 'pendiente' }],
        territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente dos');
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect((screen.getByText('Docente uno').closest('[draggable]')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByText('Docente dos').closest('[draggable]')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(tab('Por aprobar'));
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
  });

  it('un revisor puro de docencia no ve PTA de otros componentes ni botones de aprobación masiva', async () => {
    // La matriz granular de Revisión debe prevalecer incluso si un booleano
    // legacy quedó en true: no puede aparecer la etapa de Aprobación.
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesRevisables = ['academica_territorial:general'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0], docencia_por_componente: { academica_territorial: 40 },
        componentes_revision_usuario: [{ componente: 'academica_territorial', subseccion: 'general', estado: 'pendiente' }],
      },
      { ...pendientes[1], docencia_por_componente: { academica_territorial: 0 }, horas_investigacion: 100 },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(screen.queryByText('Docente dos')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(screen.queryByRole('button', { name: /Por aprobar/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Por revisar/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Por aprobar' })).toBeNull();
    expect(getAllPTAs).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2026-1' }), true);
  });

  it('permite la selección y revisión masiva con permisos exclusivos de revisión', async () => {
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesRevisables = ['academica_pregrado:general'];
    sync.permissions.componentesAprobables = [];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendientes[0],
      componentes_en_alcance: ['academica_pregrado'],
      componentes_revision_usuario: [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }],
      componentes_aprobacion_usuario: [],
    }] });
    vi.mocked(revisarComponentesLote).mockResolvedValue({
      success: true,
      data: {
        resumen: { total: 1, revisados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
        resultados: [{ ptaId: 'pta-1', componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' }],
      },
    });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    const rowCheckbox = screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!;
    expect((rowCheckbox as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(rowCheckbox);

    expect(screen.getByRole('button', { name: 'Marcar revisados' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar 1 PTA' }));

    await waitFor(() => expect(revisarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({
      ptaIds: ['pta-1'], revisiones: ['academica_pregrado:general'],
    })));
  });

  it('aprueba en un solo lote todos los componentes que autorizan los permisos, incluidas Complementarias', async () => {
    sync.permissions.componentesAprobables = ['academica_pregrado', 'complementarias_pregrado'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendientes[0],
      componentes_en_alcance: ['academica_pregrado', 'complementarias_pregrado'],
      componentes_aprobacion_usuario: [
        { componente: 'academica_pregrado', estado: 'pendiente', revision_completa: true },
        { componente: 'complementarias_pregrado', estado: 'pendiente', revision_completa: true },
      ],
    }] });
    vi.mocked(aprobarComponentesLote).mockResolvedValue({
      success: true,
      data: {
        resumen: { total: 2, aprobados: 2, devueltos: 0, omitidos: 0, fallidos: 0 },
        resultados: [
          { ptaId: 'pta-1', componente: 'academica_pregrado', estado: 'aprobado' },
          { ptaId: 'pta-1', componente: 'complementarias_pregrado', estado: 'aprobado' },
        ],
      },
    });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    const rowCheckbox = screen.getAllByRole('checkbox').find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!;
    fireEvent.click(rowCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar 1 PTAs' }));

    await waitFor(() => expect(aprobarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({
      ptaIds: ['pta-1'],
      componentes: ['academica_pregrado', 'complementarias_pregrado'],
    })));
  });

  it('descarta una selección oculta por filtros y nunca la envía en una aprobación posterior', async () => {
    sync.permissions.componentesAprobables = ['investigacion'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: pendientes.map(pta => ({
      ...pta,
      componentes_en_alcance: ['investigacion'],
      componentes_aprobacion_usuario: [
        { componente: 'investigacion', estado: 'pendiente', revision_completa: true },
      ],
    })) });
    vi.mocked(aprobarComponentesLote).mockResolvedValue({
      success: true,
      data: {
        resumen: { total: 1, aprobados: 1, devueltos: 0, omitidos: 0, fallidos: 0 },
        resultados: [{ ptaId: 'pta-2', componente: 'investigacion', estado: 'aprobado' }],
      },
    });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    const rowCheckboxes = screen.getAllByRole('checkbox')
      .filter(input => input.getAttribute('title')?.startsWith('Seleccionar'));
    fireEvent.click(rowCheckboxes[0]);
    expect(screen.getByText(/1 PTA seleccionado/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Buscar por docente, territorial, programa...'), {
      target: { value: 'Docente dos' },
    });
    await waitFor(() => expect(screen.queryByText(/1 PTA seleccionado/)).toBeNull());

    const visibleCheckbox = screen.getAllByRole('checkbox')
      .find(input => input.getAttribute('title')?.startsWith('Seleccionar'))!;
    fireEvent.click(visibleCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar 1 PTAs' }));

    await waitFor(() => expect(aprobarComponentesLote).toHaveBeenCalledWith(expect.objectContaining({
      ptaIds: ['pta-2'],
      componentes: ['investigacion'],
    })));
  });

  it('muestra filtros separados cuando una persona puede revisar y aprobar', async () => {
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesRevisables = ['academica_pregrado:general'];
    sync.permissions.componentesAprobables = ['investigacion'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendientes[0],
      componentes_en_alcance: ['academica_pregrado', 'investigacion'],
      componentes_revision_usuario: [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }],
      componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'pendiente', revision_completa: true }],
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(screen.getAllByRole('button', { name: /Por revisar/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Revisados/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Por aprobar/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Aprobados/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Todos/ })).toHaveLength(1);
  });

  it('muestra una sola pestaña por etapa al superadministrador y filtra cada bandeja', async () => {
    sync.isSuperUser = true;
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0],
        componentes_revision_usuario: [{ componente: 'academica_pregrado', estado: 'pendiente' }],
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'pendiente', revision_completa: true }],
      },
      {
        ...pendientes[1], estado: 'Aprobado',
        componentes_revision_usuario: [{ componente: 'academica_pregrado', estado: 'revisado' }],
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    for (const label of ['Todos', 'Por revisar', 'Revisados', 'Por aprobar', 'Aprobados']) {
      expect(screen.getAllByText(label)).toHaveLength(1);
    }
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Revisados').textContent).toContain('1');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(tab('Aprobados').textContent).toContain('1');

    expect(screen.getByText('1 PTA requiere tu aprobación')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ver pendientes' }));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();
    fireEvent.click(tab('Por revisar'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();
    fireEvent.click(tab('Por aprobar'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
  });

  it('no anuncia aprobación mientras la revisión de ese componente siga incompleta', async () => {
    sync.isSuperUser = true;
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendientes[0],
      componentes_revision_usuario: [{ componente: 'investigacion', estado: 'pendiente' }],
      componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'pendiente', revision_completa: false }],
    }] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');
    expect(screen.queryByText(/requiere tu aprobación/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ver pendientes' })).toBeNull();
  });

  it('ubica un PTA aprobado en Aprobados y conserva su revisión resuelta en Revisados', async () => {
    sync.isSuperUser = true;
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0], estado: 'Aprobado',
        componentes_revision_usuario: [{ componente: 'academica_territorial', estado: 'revisado' }],
        componentes_aprobacion_usuario: [{ componente: 'academica_territorial', estado: 'aprobado' }],
      },
      {
        ...pendientes[1], estado: 'Aprobado',
        componentes_revision_usuario: [],
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Revisados').textContent).toContain('1');
    expect(tab('Aprobados').textContent).toContain('2');
    expect(tab('Por revisar').textContent?.trim()).toBe('Por revisar');
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');

    fireEvent.click(tab('Por revisar'));
    expect(await screen.findByText('No tienes PTAs por revisar')).toBeTruthy();
    fireEvent.click(tab('Por aprobar'));
    expect(await screen.findByText('No tienes PTAs por aprobar')).toBeTruthy();
    fireEvent.click(tab('Revisados'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.getByText('Docente dos')).toBeTruthy();
  });

  it('recalcula las bandejas al avanzar revisión, aprobación y estado global desde el servidor', async () => {
    sync.isSuperUser = true;
    const other = {
      ...pendientes[1], estado: 'Aprobado',
      componentes_revision_usuario: [],
      componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }],
    };
    const pendingReview = {
      ...pendientes[0],
      componentes_revision_usuario: [{ componente: 'ext_capacitacion', estado: 'pendiente' }],
      componentes_aprobacion_usuario: [{ componente: 'ext_capacitacion', estado: 'pendiente', revision_completa: false }],
    };
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [pendingReview, other] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');
    expect(tab('Aprobados').textContent).toContain('1');

    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendingReview,
      componentes_revision_usuario: [{ componente: 'ext_capacitacion', estado: 'revisado' }],
      componentes_aprobacion_usuario: [{ componente: 'ext_capacitacion', estado: 'pendiente', revision_completa: true }],
    }, other] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(tab('Por revisar').textContent?.trim()).toBe('Por revisar');
    expect(tab('Revisados').textContent).toContain('1');
    expect(tab('Por aprobar').textContent).toContain('1');
    expect(tab('Aprobados').textContent).toContain('1');

    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{
      ...pendingReview, estado: 'Aprobado',
      componentes_revision_usuario: [{ componente: 'ext_capacitacion', estado: 'revisado' }],
      componentes_aprobacion_usuario: [{ componente: 'ext_capacitacion', estado: 'aprobado', revision_completa: true }],
    }, other] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Revisados').textContent).toContain('1');
    expect(tab('Por aprobar').textContent?.trim()).toBe('Por aprobar');
    expect(tab('Aprobados').textContent).toContain('2');
    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.getByText('Docente dos')).toBeTruthy();
  });

  it('separa las acciones disponibles cuando el usuario tiene permisos mixtos', async () => {
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesRevisables = ['academica_pregrado:general'];
    sync.permissions.componentesAprobables = ['investigacion'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0],
        componentes_en_alcance: ['academica_pregrado'],
        componentes_revision_usuario: [
          { componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' },
        ],
        componentes_aprobacion_usuario: [],
      },
      {
        ...pendientes[1],
        componentes_en_alcance: ['investigacion'],
        componentes_revision_usuario: [],
        componentes_aprobacion_usuario: [
          { componente: 'investigacion', estado: 'pendiente', revision_completa: true },
        ],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    const rowCheckboxes = screen.getAllByRole('checkbox')
      .filter(input => input.getAttribute('title')?.startsWith('Seleccionar'));

    fireEvent.click(rowCheckboxes[0]);
    expect(screen.getByRole('button', { name: 'Marcar revisados' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();

    fireEvent.click(rowCheckboxes[0]);
    fireEvent.click(rowCheckboxes[1]);
    expect(screen.queryByRole('button', { name: 'Marcar revisados' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeTruthy();
  });

  it('filtra Por revisar y Revisados con el estado de la tarea propia', async () => {
    sync.permissions.puedeRevisar = true;
    sync.permissions.componentesRevisables = ['academica_pregrado:general'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0], componentes_en_alcance: ['academica_pregrado'],
        componentes_revision_usuario: [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'pendiente' }],
      },
      {
        ...pendientes[1], componentes_en_alcance: ['academica_pregrado'],
        componentes_revision_usuario: [{ componente: 'academica_pregrado', subseccion: 'general', estado: 'revisado' }],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Por revisar').textContent).toContain('1');
    expect(tab('Revisados').textContent).toContain('1');

    fireEvent.click(tab('Por revisar'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();

    fireEvent.click(tab('Revisados'));
    expect(await screen.findByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
  });

  it('Aprobados excluye borradores y componentes personales pendientes, y cruza los filtros sin reemplazarlos', async () => {
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      {
        ...pendientes[0], id: 'borrador', docente_nombre: 'Docente borrador', estado: 'Borrador',
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }],
      },
      {
        ...pendientes[0], id: 'parcial', docente_nombre: 'Docente parcial',
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'pendiente', revision_completa: true }],
      },
      {
        ...pendientes[0], id: 'aprobado', docente_nombre: 'Docente aprobado', estado: 'Aprobado',
        componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }],
      },
    ] });

    render(<PtaBackofficeModule />);
    await screen.findByText('Docente borrador');

    fireEvent.click(tab('Aprobados'));
    expect(screen.getByText('Docente aprobado')).toBeTruthy();
    expect(screen.queryByText('Docente borrador')).toBeNull();
    expect(screen.queryByText('Docente parcial')).toBeNull();
    expect(tab('Todos').textContent).toContain('3');

    // Las pestañas son excluyentes y mantienen el filtro común de estado.
    fireEvent.click(tab('Por aprobar'));
    expect(await screen.findByText('Docente parcial')).toBeTruthy();
    expect(screen.queryByText('Docente borrador')).toBeNull();
    expect(screen.queryByText('Docente aprobado')).toBeNull();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'Aprobado' } });
    expect(await screen.findByText('No tienes PTAs por aprobar')).toBeTruthy();

    fireEvent.click(tab('Todos'));
    expect(await screen.findByText('Docente aprobado')).toBeTruthy();
    expect(screen.queryByText('Docente parcial')).toBeNull();
    expect(screen.queryByText('Docente borrador')).toBeNull();
  });

  it('respeta un componente autorizado por el servidor sin aplicar encima el filtro de otro rol', async () => {
    sync.permissions.componentesAprobables = ['academica_territorial', 'investigacion'];
    sync.permissions.filtroTerritorial = ['Meta'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], componentes_en_alcance: ['investigacion'], territoriales_docencia_ids: ['Caldas'], horas_investigacion: 100 },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(tab('Todos').textContent).toContain('1');
  });
});
