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

// Bug 2414: los cambios en Ejes Estratégicos solo se guardaban en localStorage y nunca
// llegaban al backend; además Restablecer volvía a valores de fábrica en vez de al
// último estado guardado.
const CLAVE_EJES = 'sigl-ejes-estrategicos';

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

const eje = (id: string, nombre: string, activo = true) => ({
  id, nombre, icono: '🎯', descripcion: `Descripción ${nombre}`, color: '#2962FF', activo, orden: 1,
});

const remotos = [eje('eje-a', 'Eje Remoto A'), eje('eje-b', 'Eje Remoto B', false)];

const backendConEjes = () =>
  vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) =>
    key === CLAVE_EJES ? { value: remotos } : { value: [] }
  );

const guardadosDeEjes = () =>
  vi.mocked(legalService.saveConfiguration).mock.calls.filter(c => c[0] === CLAVE_EJES);

describe('ConfiguracionesSIGLContext · Ejes Estratégicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(legalService.getConfiguration).mockResolvedValue(null);
    vi.mocked(legalService.saveConfiguration).mockResolvedValue({});
  });

  it('carga los ejes desde el backend y los deja en la caché local', async () => {
    backendConEjes();
    renderProvider();

    await waitFor(() => expect(ctx.ejesEstrategicos.map(e => e.nombre)).toEqual(['Eje Remoto A', 'Eje Remoto B']));
    expect(JSON.parse(localStorage.getItem(CLAVE_EJES)!)).toEqual(remotos);
  });

  it('guarda en el backend los cambios de nombre, descripción, ícono, color y estado', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    const editados = [
      { ...remotos[0], nombre: 'Nombre nuevo', descripcion: 'Desc nueva', icono: '🔍', color: '#112233', activo: false },
      remotos[1],
    ];
    await act(async () => { ctx.actualizarEjesEstrategicos(editados); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });

    const llamadas = guardadosDeEjes();
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0][1]).toEqual(editados);
  });

  it('guarda los ejes agregados y los eliminados', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    await act(async () => { ctx.actualizarEjesEstrategicos([...ctx.ejesEstrategicos, eje('eje-nuevo', 'Eje creado')]); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });
    expect(guardadosDeEjes().at(-1)![1].map((e: any) => e.id)).toEqual(['eje-a', 'eje-b', 'eje-nuevo']);

    await act(async () => { ctx.actualizarEjesEstrategicos(ctx.ejesEstrategicos.filter(e => e.id !== 'eje-a')); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });
    expect(guardadosDeEjes().at(-1)![1].map((e: any) => e.id)).toEqual(['eje-b', 'eje-nuevo']);
  });

  it('el autoguardado envía los ejes al backend y apaga los cambios pendientes', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    vi.useFakeTimers();
    try {
      await act(async () => { ctx.actualizarEjesEstrategicos([eje('eje-a', 'Autoguardado')]); });
      expect(ctx.cambiosPendientes).toBe(true);

      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

      expect(guardadosDeEjes().at(-1)![1][0].nombre).toBe('Autoguardado');
      expect(ctx.cambiosPendientes).toBe(false);
      expect(ctx.savingStatus).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('el guardado manual indica "error" si falla y conserva los cambios; el reintento guarda', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    const editados = [eje('eje-a', 'Pendiente de guardar')];
    await act(async () => { ctx.actualizarEjesEstrategicos(editados); });

    vi.mocked(legalService.saveConfiguration).mockRejectedValue(new Error('500'));
    await act(async () => { await expect(ctx.guardarConfiguraciones()).rejects.toThrow(); });

    expect(ctx.savingStatus).toBe('error');
    expect(ctx.cambiosPendientes).toBe(true);
    expect(ctx.ejesEstrategicos).toEqual(editados);

    vi.mocked(legalService.saveConfiguration).mockResolvedValue({});
    await act(async () => { await ctx.guardarConfiguraciones(); });
    expect(ctx.savingStatus).toBe('saved');
    expect(ctx.cambiosPendientes).toBe(false);
  });

  it('Restablecer devuelve los ejes al último estado guardado, no a los de fábrica', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    await act(async () => { ctx.actualizarEjesEstrategicos([eje('eje-x', 'Cambio sin guardar')]); });
    expect(ctx.ejesEstrategicos).toHaveLength(1);

    await act(async () => { ctx.restablecerDefecto(); });

    expect(ctx.ejesEstrategicos).toEqual(remotos);
    expect(ctx.cambiosPendientes).toBe(false);
    expect(JSON.parse(localStorage.getItem(CLAVE_EJES)!)).toEqual(remotos);
  });

  it('Restablecer tras un guardado fallido descarta lo que no llegó al servidor', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    vi.mocked(legalService.saveConfiguration).mockRejectedValue(new Error('500'));
    await act(async () => { ctx.actualizarEjesEstrategicos([eje('eje-x', 'No llegó al servidor')]); });
    await act(async () => { await expect(ctx.guardarConfiguraciones(true)).rejects.toThrow(); });
    // La caché local conserva la edición fallida...
    expect(JSON.parse(localStorage.getItem(CLAVE_EJES)!)[0].nombre).toBe('No llegó al servidor');

    await act(async () => { ctx.restablecerDefecto(); });

    // ...y Restablecer la devuelve al estado guardado para que no reaparezca al recargar.
    expect(ctx.ejesEstrategicos).toEqual(remotos);
    expect(JSON.parse(localStorage.getItem(CLAVE_EJES)!)).toEqual(remotos);
  });

  it('Restablecer sin cambios pendientes no toca nada', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    await act(async () => { ctx.restablecerDefecto(); });

    expect(ctx.ejesEstrategicos).toEqual(remotos);
    expect(ctx.cambiosPendientes).toBe(false);
  });

  it('tras guardar bien, Restablecer ya no vuelve al estado anterior al guardado', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    const guardados = [eje('eje-a', 'Ya guardado')];
    await act(async () => { ctx.actualizarEjesEstrategicos(guardados); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });
    await act(async () => { ctx.restablecerDefecto(); });

    expect(ctx.ejesEstrategicos).toEqual(guardados);
  });

  it('los ejes inactivos no salen en getEjesEstrategicosActivos (formulario Nuevo Indicador)', async () => {
    backendConEjes();
    renderProvider();
    await waitFor(() => expect(ctx.ejesEstrategicos).toHaveLength(2));

    expect(ctx.getEjesEstrategicosActivos().map(e => e.id)).toEqual(['eje-a']);
  });

  it('si no pudo leer los ejes del backend, no los sobrescribe con lo que hay en pantalla', async () => {
    vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) => {
      if (key === CLAVE_EJES) throw new Error('500');
      return { value: [] };
    });
    renderProvider();
    await waitFor(
      () => expect(vi.mocked(legalService.getConfiguration).mock.calls.filter(c => c[0] === CLAVE_EJES)).toHaveLength(3),
      { timeout: 5000 }
    );
    await act(async () => { });

    await act(async () => { ctx.actualizarEjesEstrategicos([eje('eje-x', 'A ciegas')]); });
    await act(async () => { await ctx.guardarConfiguraciones(true); });

    expect(guardadosDeEjes()).toHaveLength(0);
  });

  it('en una instalación nueva siembra los ejes de fábrica una sola vez', async () => {
    renderProvider();
    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
    await act(async () => { });

    const sembrados = guardadosDeEjes();
    expect(sembrados).toHaveLength(1);
    expect(sembrados[0][1]).toEqual(ctx.ejesEstrategicos);
  });
});
