import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getConfiguration: vi.fn().mockResolvedValue(null),
    saveConfiguration: vi.fn().mockResolvedValue({}),
  },
  ocService: {
    syncOrganismosControl: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/api/expediente-config.service', () => ({
  expedienteConfigService: {
    renombrarTipoProceso: vi.fn().mockResolvedValue({}),
    recalcularPlazosPorTipoProceso: vi.fn().mockResolvedValue({ updated: 0 }),
  },
}));

import { legalService } from '../../../../services/api/legal.service';
import { ConfiguracionesSIGLProvider, useConfiguracionesSIGL } from './ConfiguracionesSIGLContext';
import { toast } from 'sonner';

// Bug 2417: los Entes de Control de Planes de Mejoramiento solo se guardaban en
// localStorage y nunca llegaban al backend (no aplicaban a otros usuarios/ambientes).
const CLAVE = 'sigl-entes-control-pm';

let ctx: ReturnType<typeof useConfiguracionesSIGL>;
function Sonda() {
  ctx = useConfiguracionesSIGL();
  return null;
}

const renderProvider = () =>
  render(
    <ConfiguracionesSIGLProvider>
      <Sonda />
    </ConfiguracionesSIGLProvider>
  );

const ente = (id: string, nombre: string, activo = true) => ({
  id, nombre, descripcion: `Desc ${nombre}`, icono: '🏛️', color: '#DC2626', activo,
});

const remotos = [ente('E1', 'Ente Remoto 1'), ente('E2', 'Ente Remoto 2', false)];

const backendConEntes = () =>
  vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) =>
    key === CLAVE ? { value: remotos } : { value: [] }
  );

const guardados = () =>
  vi.mocked(legalService.saveConfiguration).mock.calls.filter(c => c[0] === CLAVE);

describe('ConfiguracionesSIGLContext · Entes de Control de Planes de Mejoramiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(legalService.getConfiguration).mockResolvedValue(null);
    vi.mocked(legalService.saveConfiguration).mockResolvedValue({});
  });

  it('carga los entes desde el backend y los deja en la caché local', async () => {
    backendConEntes();
    renderProvider();

    await waitFor(() => expect(ctx.entesControlPM.map(e => e.nombre)).toEqual(['Ente Remoto 1', 'Ente Remoto 2']));
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual(remotos);
  });

  it('guarda en el backend nombre, ícono, color, descripción y estado', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    const editados = [
      { ...remotos[0], nombre: 'Nombre nuevo', descripcion: 'Desc nueva', icono: '🔍', color: '#112233', activo: false },
      remotos[1],
    ];
    await act(async () => { ctx.actualizarEntesControlPM(editados); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });

    expect(guardados()).toHaveLength(1);
    expect(guardados()[0][1]).toEqual(editados);
  });

  it('guarda los entes agregados y los eliminados', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    await act(async () => { ctx.actualizarEntesControlPM([...ctx.entesControlPM, ente('N', 'Creado')]); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });
    expect(guardados().at(-1)![1].map((e: any) => e.id)).toEqual(['E1', 'E2', 'N']);

    await act(async () => { ctx.actualizarEntesControlPM(ctx.entesControlPM.filter(e => e.id !== 'E1')); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });
    expect(guardados().at(-1)![1].map((e: any) => e.id)).toEqual(['E2', 'N']);
  });

  it('el autoguardado envía los entes, apaga los pendientes y muestra "saved"', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    vi.useFakeTimers();
    try {
      await act(async () => { ctx.actualizarEntesControlPM([ente('E1', 'Autoguardado')]); });
      expect(ctx.cambiosPendientes).toBe(true);
      expect(ctx.savingStatus).toBe('saving');

      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

      expect(guardados().at(-1)![1][0].nombre).toBe('Autoguardado');
      expect(ctx.cambiosPendientes).toBe(false);
      expect(ctx.savingStatus).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('si el guardado falla indica "error", conserva los cambios y muestra el motivo del servidor; el reintento guarda', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    const editados = [ente('E1', 'Pendiente')];
    await act(async () => { ctx.actualizarEntesControlPM(editados); });

    vi.mocked(legalService.saveConfiguration).mockRejectedValue(new Error('Tiene planes asociados'));
    await act(async () => { await expect(ctx.guardarConfiguraciones()).rejects.toThrow(); });

    expect(ctx.savingStatus).toBe('error');
    expect(ctx.cambiosPendientes).toBe(true);
    expect(ctx.entesControlPM).toEqual(editados);
    expect(vi.mocked(toast.error).mock.calls.at(-1)![1]).toMatchObject({
      description: expect.stringContaining('Tiene planes asociados'),
    });

    vi.mocked(legalService.saveConfiguration).mockResolvedValue({});
    await act(async () => { await ctx.guardarConfiguraciones(); });
    expect(ctx.savingStatus).toBe('saved');
    expect(ctx.cambiosPendientes).toBe(false);
  });

  it('Restablecer devuelve los entes al último estado guardado y limpia la caché local', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    await act(async () => { ctx.actualizarEntesControlPM([ente('X', 'Sin guardar')]); });
    await act(async () => { ctx.restablecerDefecto(); });

    expect(ctx.entesControlPM).toEqual(remotos);
    expect(ctx.cambiosPendientes).toBe(false);
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual(remotos);
  });

  it('getEntesControlPMActivos solo devuelve los activos (formulario Nuevo Plan)', async () => {
    backendConEntes();
    renderProvider();
    await waitFor(() => expect(ctx.entesControlPM).toHaveLength(2));

    expect(ctx.getEntesControlPMActivos().map(e => e.id)).toEqual(['E1']);
  });

  it('si no pudo leer los entes del backend, no los sobrescribe con lo que hay en pantalla', async () => {
    vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) => {
      if (key === CLAVE) throw new Error('500');
      return { value: [] };
    });
    renderProvider();
    await waitFor(
      () => expect(vi.mocked(legalService.getConfiguration).mock.calls.filter(c => c[0] === CLAVE)).toHaveLength(3),
      { timeout: 5000 }
    );
    await act(async () => { });

    await act(async () => { ctx.actualizarEntesControlPM([ente('X', 'A ciegas')]); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });

    expect(guardados()).toHaveLength(0);
  });

  it('en una instalación nueva siembra los 4 entes de fábrica una sola vez', async () => {
    renderProvider();
    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
    await act(async () => { });

    expect(guardados()).toHaveLength(1);
    expect(guardados()[0][1].map((e: any) => e.id)).toEqual(['CONTRALORIA', 'PROCURADURIA', 'OCI', 'AUDITORIA_EXTERNA']);
  });
});
