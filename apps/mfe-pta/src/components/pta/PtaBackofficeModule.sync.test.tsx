import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PtaBackofficeModule } from './PtaBackofficeModule';
import {
  aprobarComponentesLote, deletePTA, getAllPTAs, getAllPtasConEvidencias, getPTADecisionListScope,
  getSolicitudesPTA, resolverSolicitudPTA, revisarComponentesLote, revisarEvidenciaPTA,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION } from './shared/ptaComponentPermissions';

const sync = vi.hoisted(() => ({ options: null as any, isSuperUser: false, rol: 'jefatura', allowedPermissions: null as Set<string> | null, visibleViews: null as Set<string> | null, permissions: {
  nivelAprobacion: 1, puedeAprobar: true, puedeRevisar: false, componentesAprobables: [] as string[], componentesRevisables: [] as string[], filtroTerritorial: undefined as string[] | undefined,
} }));
vi.mock('../../hooks/usePTARealtimeSync', () => ({
  usePTARealtimeSync: (options: any) => { sync.options = options; return { lastSyncTime: 'sync', unreadEvents: [], unreadCount: 0 }; },
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
  PTADetallePanelBackoffice: ({ pta, onUpdated }: any) => <button onClick={() => onUpdated({ ...pta, estado: 'Aprobado' })}>Resolver caso</button>,
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
    expect(tab('Aprobación').textContent).toContain('1');
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

describe('listado y contadores del backoffice', () => {
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
    expect(tab('Aprobación').textContent).toContain('1');
    expect(tab('Aprobado').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.getByText('Resolver caso')).toBeTruthy();
  });

  it('vuelve a una página con registros cuando la última página de pendientes queda vacía', async () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ ...pendientes[0], id: `pta-${i}`, docente_nombre: `Docente número ${i}` }));
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: many });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente número 0');
    expect(screen.getByText('51 Pendientes')).toBeTruthy();
    fireEvent.click(tab('Aprobación'));
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
    fireEvent.click(tab('Aprobación'));
    expect(tab('Todos').textContent).toContain('2');
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [{ ...pendientes[0], estado: 'Aprobado' }, pendientes[1]] });
    await act(async () => { await sync.options.onRefresh(); });
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Aprobación').textContent).toContain('1');
    expect(tab('Aprobado').textContent).toContain('1');
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
    fireEvent.click(tab('Aprobado'));
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

  it('compara el alcance territorial con los IDs de las asignaturas y cuenta solo los registros visibles', async () => {
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente uno');
    expect(screen.queryByText('Docente dos')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
  });

  it('el alcance vigente del servidor prevalece sobre el filtro local y actualiza los contadores', async () => {
    sync.permissions.filtroTerritorial = ['900014'];
    vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: true, territoriales: null, programas: null, cetaps: null } });
    vi.mocked(getAllPTAs).mockResolvedValue({ success: true, data: [
      { ...pendientes[0], territoriales_docencia_ids: ['900014'], territorialesAsignaturas: ['Santander'] },
      { ...pendientes[1], territoriales_docencia_ids: ['900015'], territorialesAsignaturas: ['Nariño'] },
    ] });
    render(<PtaBackofficeModule />);
    await screen.findByText('Docente dos');
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(tab('Todos').textContent).toContain('2');
    expect(tab('Aprobación').textContent).toContain('2');
    vi.mocked(getPTADecisionListScope).mockResolvedValue({ success: true, data: { configured: true, territoriales: ['Nariño'], programas: null, cetaps: null } });
    await act(async () => { await sync.options.onRefresh(); });
    expect(screen.getByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
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
    expect(tab('Revisión').textContent).toContain('1');
    expect(screen.queryByText('Aprobación')).toBeNull();
    expect(screen.getByRole('button', { name: 'Por revisar' })).toBeTruthy();
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
    expect(tab('Revisión').textContent).toContain('1');
    expect(tab('Aprobación').textContent).toContain('1');
    expect(screen.getByRole('button', { name: 'Por revisar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Por aprobar' })).toBeTruthy();
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
    expect(tab('Revisión').textContent).toContain('1');
    expect(tab('Revisado').textContent).toContain('1');

    fireEvent.click(tab('Revisión'));
    expect(screen.getByText('Docente uno')).toBeTruthy();
    expect(screen.queryByText('Docente dos')).toBeNull();

    fireEvent.click(tab('Revisado'));
    expect(await screen.findByText('Docente dos')).toBeTruthy();
    expect(screen.queryByText('Docente uno')).toBeNull();
  });

  it('Aprobados muestra exclusivamente PTA con estado global aprobado y cruza los filtros sin reemplazarlos', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Aprobados' }));
    expect(screen.getByText('Docente aprobado')).toBeTruthy();
    expect(screen.queryByText('Docente borrador')).toBeNull();
    expect(screen.queryByText('Docente parcial')).toBeNull();
    expect(tab('Todos').textContent).toContain('1');

    // El tab principal y "Mis componentes" se combinan por intersección.
    fireEvent.click(tab('Aprobación'));
    expect(await screen.findByText('No se encontraron PTAs')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(await screen.findByText('Docente parcial')).toBeTruthy();
    expect(screen.queryByText('Docente borrador')).toBeNull();
    expect(screen.queryByText('Docente aprobado')).toBeNull();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'Aprobado' } });
    expect(await screen.findByText('No se encontraron PTAs')).toBeTruthy();

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
