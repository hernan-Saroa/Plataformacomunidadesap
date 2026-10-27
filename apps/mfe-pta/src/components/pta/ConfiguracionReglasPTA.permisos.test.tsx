import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import ConfiguracionReglasPTA, { defaultPTARules, usePTARules } from './ConfiguracionReglasPTA';
import { PermisosPTAProvider, usePermisosPTA } from './PermisosPTAContext';
import { PTA_MANAGE_CONFIGURATION_PERMISSION as CONFIG } from './shared/ptaComponentPermissions';
import { getConfiguracionPTAAdministracion, getConfiguracionPTAGlobal, updateConfiguracionPTAGlobal } from '../../services/api/ptaApi';

vi.mock('../../services/api/ptaApi', () => ({
  getConfiguracionPTAAdministracion: vi.fn(),
  getConfiguracionPTAGlobal: vi.fn(),
  updateConfiguracionPTAGlobal: vi.fn(),
}));
vi.mock('./config-tabs/TabGenerales', () => ({
  TabGenerales: ({ handleChange }: any) => <button onClick={() => handleChange('semanas_periodo_academico', 19)}>Cambiar semanas</button>,
}));

function editor(permisos: string[], isSuperUser = false) {
  return <AuthProvider userEmail="configurador@esap.edu.co" permisos={permisos} isSuperUser={isSuperUser}>
    <ConfiguracionReglasPTA />
  </AuthProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.mocked(getConfiguracionPTAAdministracion).mockResolvedValue({ success: true, data: defaultPTARules });
  vi.mocked(getConfiguracionPTAGlobal).mockResolvedValue({ success: true, data: defaultPTARules });
  vi.mocked(updateConfiguracionPTAGlobal).mockResolvedValue({ success: true, data: defaultPTARules });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Configuración PTA - acceso y guardado', () => {
  it.each([{ permisos: [] }, { permisos: ['pta.approve.all'] }, { permisos: ['pta.review.all'] }])('sin permiso no monta el editor ni consulta configuración: $permisos', ({ permisos }) => {
    const { container } = render(editor(permisos));
    expect(container.childElementCount).toBe(0);
    expect(getConfiguracionPTAAdministracion).not.toHaveBeenCalled();
  });

  it('el permiso muestra el editor y su consulta administrativa', async () => {
    render(editor([CONFIG]));
    expect(await screen.findByText('Configuración de Reglas')).toBeTruthy();
    expect(getConfiguracionPTAAdministracion).toHaveBeenCalledOnce();
    expect(getConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN conserva acceso', async () => {
    render(editor([], true));
    expect(await screen.findByText('Configuración de Reglas')).toBeTruthy();
  });

  it('si el servidor rechaza la consulta no expone controles ni usa la copia local', async () => {
    vi.mocked(getConfiguracionPTAAdministracion).mockRejectedValue(new Error('403'));
    localStorage.setItem('pta_rules_v2', JSON.stringify(defaultPTARules));
    render(editor([CONFIG]));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Cambiar semanas')).toBeNull();
  });

  it('retirar el permiso desmonta el editor y cancela el autoguardado pendiente', async () => {
    const view = render(editor([CONFIG]));
    await screen.findByText('Cambiar semanas');
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('Cambiar semanas'));
    view.rerender(editor([]));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.queryByText('Cambiar semanas')).toBeNull();
    expect(updateConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('permite guardar únicamente con el permiso y no guarda localmente un rechazo', async () => {
    const { result } = renderHook(() => usePTARules(), {
      wrapper: ({ children }) => <AuthProvider permisos={[CONFIG]}>{children}</AuthProvider>,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(updateConfiguracionPTAGlobal).mockResolvedValueOnce({ success: false, data: null });
    let saved: boolean | undefined;
    await act(async () => { saved = await result.current.saveRules(defaultPTARules); });
    expect(saved).toBe(false);
    expect(localStorage.getItem('pta_rules_v2')).toBeNull();
    await act(async () => { saved = await result.current.saveRules(defaultPTARules); });
    expect(saved).toBe(true);
    expect(localStorage.getItem('pta_rules_v2')).not.toBeNull();
  });

  it('un consumidor operativo puede leer reglas, pero no guardar sin permiso', async () => {
    const { result } = renderHook(() => usePTARules());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let saved: boolean | undefined;
    await act(async () => { saved = await result.current.saveRules(defaultPTARules); });
    expect(saved).toBe(false);
    expect(getConfiguracionPTAGlobal).toHaveBeenCalledOnce();
    expect(updateConfiguracionPTAGlobal).not.toHaveBeenCalled();
  });

  it('un rol llamado administrador sin permiso no hereda la pestaña', () => {
    const { result } = renderHook(() => usePermisosPTA(), {
      wrapper: ({ children }) => <AuthProvider userEmail="admin@esap.edu.co" userRole="administrador">
        <PermisosPTAProvider>{children}</PermisosPTAProvider>
      </AuthProvider>,
    });
    expect(result.current.tieneVista('configuracion')).toBe(false);
    expect(result.current.permisos.vistasPerm).not.toContain('configuracion');
  });
});
