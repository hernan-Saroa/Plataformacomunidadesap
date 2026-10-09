import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PTAForm } from './PTAForm';
import { getComponentesAprobacion, getPTAById, savePTA } from '../../../services/api/ptaApi';

vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('../../../services/api/ptaApi', () => {
  const empty = () => Promise.resolve({ success: true, data: [] });
  return {
    getPTAById: vi.fn(), savePTA: vi.fn().mockResolvedValue({ success: true, data: { id: 'pta-1' } }),
    getCatalogoProgramas: empty, getCatalogoAsignaturas: empty,
    getCatalogoTerritoriales: empty, getCatalogoCetaps: empty,
    getCatalogoActividadesInvestigacion: empty, getCatalogoActividadesExtension: empty,
    getCatalogoActividadesComplementarias: empty, getCatalogoActividadesAcademicoAdmin: empty,
    getCatalogoRolesInvestigacion: empty, getCatalogoSeccionesExtension: empty,
    getPeriodosAcademicos: empty, getRUNDDocente: empty, getComponentesAprobacion: vi.fn().mockImplementation(empty),
    getCatalogoProgramasCascada: empty, getOfertaCetap: empty,
    getActivePeriodoAcademico: () => Promise.resolve({ codigo: '2026-2' }),
    getBancoDocenteById: () => Promise.resolve({ success: true, data: { horas_programables: 800 } }),
    getConfiguracionPTAGlobal: () => Promise.resolve({ success: true, data: {
      inv_permitir_proyecto_actividades_simultaneos: true,
      inv_roles: [{ nombre: 'COINVESTIGADOR', horas_max: 300, pct_max: 37.5 }],
      inv_actividades: [{ id: 'INV_01', nombre: 'Semillero', horas_max: 120 }],
    } }),
    requestPTAFirmaDocenteCode: vi.fn(), verifyPTAFirmaDocenteCode: vi.fn(),
    updatePTAStatus: vi.fn(), enviarAprobacionPTA: vi.fn(), validarReenvioPTA: vi.fn(),
    guardarFirmaDigitalPTA: vi.fn(),
  };
});
vi.mock('../portalApi', () => ({ getPerfilPortal: () => Promise.resolve({ success: false }) }));
vi.mock('../../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('./IdentificacionDocentePanel', () => ({ IdentificacionDocentePanel: () => null }));
vi.mock('./FirmaElectronicaModal', () => ({ FirmaElectronicaModal: () => null }));
vi.mock('../../pta/FirmaDigitalPTA', () => ({ FirmaDigitalPTA: () => null }));

const activity = {
  id: 1, territorial_id: '', actividad_id: '', nombre: '', descripcion: 'Descripción conservada',
  cantidad: 1, horas_unitarias: 0, horas_total: 0, fecha_inicio: '', fecha_fin: '',
  resolucion_nombre: 'Resolución conservada', resolucion_archivo_url: '',
};
const pta = {
  id: 'pta-1', estado: 'Borrador', periodo: '2026-2', horas_a_programar: 800,
  asignaturas: [{ id: 10, total_horas: 144, creditos: 3 }],
  investigacion_proyecto: { nombre: '', rol: '', horas_solicitadas: 0 },
  investigacion_actividades: [activity],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [] });
  vi.mocked(getPTAById).mockResolvedValue({ success: true, data: pta } as any);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function mount() {
  render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
  fireEvent.click(await screen.findByRole('button', { name: /^Investigación/ }));
  return await screen.findByRole('combobox', { name: 'Actividad' }) as HTMLSelectElement;
}

describe('selector de actividades de investigación', () => {
  it.each(['complementarias_pregrado', 'complementarias_gestion_profesoral', 'actividad_reclasificada'])('permite corregir la actividad compartida al devolver %s, conservando las ajenas', async caso => {
    const reclasificada = caso === 'actividad_reclasificada';
    const componente = reclasificada ? 'complementarias_pregrado' : caso;
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: { ...pta, estado: 'REVISION_DOCENTE_N2',
      complementarias: [
        { id: 20, nombre: 'Actividad editable', actividad_id: 'COMP_1', horas: 40,
          componente_complementaria: 'complementarias_gestion_profesoral',
          componentes_complementaria: reclasificada ? ['complementarias_posgrado', 'complementarias_decanatura']
            : ['complementarias_pregrado', 'complementarias_gestion_profesoral'],
          ...(reclasificada ? { componentes_edicion_complementaria: ['complementarias_pregrado'] } : {}),
          ...(reclasificada ? { componente_complementaria: 'complementarias_decanatura' } : {}),
        },
        { id: 21, nombre: 'Actividad ajena', actividad_id: 'COMP_2', horas: 20,
          componente_complementaria: 'complementarias_decanatura',
          componentes_complementaria: ['complementarias_posgrado', 'complementarias_decanatura'] },
      ],
    } } as any);
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente, estado: 'devuelto' }, { componente: 'academica_pregrado', estado: 'aprobado' },
    ] } as any);
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /^Complementarias/ }));
    const selects = await screen.findAllByRole('combobox', { name: 'Actividad' });
    expect((selects[0] as HTMLSelectElement).disabled).toBe(false);
    expect((selects[1] as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Eliminar Actividad Complementaria' })).toHaveLength(1);
  });
  it.each(['plano', 'agrupado'])('carga y autoguarda proyecto y actividades en una edición autorizada con datos %s', async formato => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const proyecto = { nombre_proyecto: 'Proyecto autorizado', rol: 'COINVESTIGADOR', horas_solicitadas: 200 };
    const actividad = { ...activity, actividad_id: 'INV_01', actividad_nombre: 'Semillero', nombre: undefined,
      horas_total: undefined, horas: 32 };
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: {
      ...pta, estado: 'REVISION_DOCENTE_N2',
      asignaturas: [{ ...pta.asignaturas[0], asignatura_id: 'ASIG_1' }],
      ...(formato === 'plano'
        ? { investigacion_proyecto: proyecto, investigacion_actividades: [actividad] }
        : { investigacion_proyecto: undefined, investigacion_actividades: undefined,
          investigacion: { proyectos: [proyecto], actividades: [actividad] } }),
    } } as any);
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente: 'investigacion', estado: 'devuelto', scope: 'solicitud_edicion', scopeId: 'sol-1' },
      { componente: 'academica_pregrado', estado: 'aprobado' },
    ] } as any);
    const select = await mount();
    expect(select.value).toBe('INV_01');
    const nombre = screen.getByRole('textbox', { name: 'Nombre del Proyecto' });
    expect((nombre as HTMLInputElement).value).toBe('Proyecto autorizado');
    expect((screen.getByRole('spinbutton', { name: 'Horas' }) as HTMLInputElement).value).toBe('32');
    expect(screen.queryByRole('button', { name: /^Docencia/ })).toBeNull();
    fireEvent.change(nombre, { target: { value: 'Proyecto corregido' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(savePTA).toHaveBeenCalledTimes(1);
    expect(vi.mocked(savePTA).mock.calls[0][0]).toMatchObject({
      estado: 'REVISION_DOCENTE_N2',
      investigacion_proyecto: { nombre: 'Proyecto corregido', horas_solicitadas: 200 },
      investigacion_actividades: [{ actividad_id: 'INV_01', nombre: 'Semillero', horas_total: 32,
        descripcion: 'Descripción conservada', resolucion_nombre: 'Resolución conservada' }],
      asignaturas: [expect.objectContaining({ ...pta.asignaturas[0], asignatura_id: 'ASIG_1' })],
    });
  });

  it('conserva el selector, la selección y los datos al escribir, cambiar y borrar el nombre del proyecto', async () => {
    const select = await mount();
    fireEvent.change(select, { target: { value: 'INV_01' } });
    const projectName = screen.getByRole('textbox', { name: 'Nombre del Proyecto' });
    for (const nombre of ['Proyecto nuevo', 'Proyecto modificado', '']) {
      fireEvent.change(projectName, { target: { value: nombre } });
      expect(screen.getByRole('combobox', { name: 'Actividad' })).toBe(select);
      expect(select.value).toBe('INV_01');
      expect(screen.getByDisplayValue('Descripción conservada')).toBeTruthy();
      expect(screen.getByDisplayValue('Resolución conservada')).toBeTruthy();
    }
    fireEvent.change(projectName, { target: { value: 'Proyecto guardado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Borrador' }));
    await waitFor(() => expect(savePTA).toHaveBeenCalled());
    expect(vi.mocked(savePTA).mock.calls[0][0]).toMatchObject({
      investigacion_proyecto: { nombre: 'Proyecto guardado' },
      investigacion_actividades: [{ actividad_id: 'INV_01', nombre: 'Semillero', horas_total: 120 }],
    });
  });

  it.each([[200, 120], [300, 100]])('con %ih de proyecto limita la actividad a %ih', async (projectHours, expectedHours) => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: {
      ...pta, investigacion_proyecto: { nombre: 'Proyecto', rol: 'COINVESTIGADOR', horas_solicitadas: projectHours },
    } } as any);
    const select = await mount();
    fireEvent.change(select, { target: { value: 'INV_01' } });
    const hours = screen.getByRole('spinbutton', { name: 'Horas' }) as HTMLInputElement;
    expect(hours.value).toBe(String(expectedHours));
    fireEvent.change(hours, { target: { value: '150' } });
    expect(hours.value).toBe(String(expectedHours));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del Proyecto' }), { target: { value: '' } });
    expect(screen.getByRole('combobox', { name: 'Actividad' })).toBe(select);
  });

  it('muestra una actividad libre antigua en el selector y permite cambiarla por una del catálogo', async () => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: {
      ...pta, investigacion_proyecto: { nombre: 'Proyecto anterior', rol: '', horas_solicitadas: 0 },
      investigacion_actividades: [{ ...activity, actividad_id: 'LIBRE_1', nombre: 'Actividad anterior', horas_total: 50 }],
    } } as any);
    const select = await mount();
    expect(select.value).toBe('LIBRE_1');
    expect(screen.getByRole('option', { name: 'Actividad anterior' })).toBeTruthy();
    fireEvent.change(select, { target: { value: 'INV_01' } });
    expect(select.value).toBe('INV_01');
  });
});
