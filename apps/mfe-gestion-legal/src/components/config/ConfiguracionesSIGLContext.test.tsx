import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

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
import {
  ConfiguracionesSIGLProvider,
  useConfiguracionesSIGL,
  DestinatarioInforme,
} from './ConfiguracionesSIGLContext';

const CLAVE_DESTINATARIOS = 'sigl-destinatarios-informe';
const CLAVE_FUENTES = 'sigl-tipos-fuente-normativa';

// Expone las piezas del contexto que necesitan las pruebas y permite dispararlas
// desde fuera del árbol de React.
let ctx: ReturnType<typeof useConfiguracionesSIGL>;
function Sonda() {
  ctx = useConfiguracionesSIGL();
  return <div data-testid="destinatarios">{ctx.destinatariosInforme.map(d => d.nombre).join('|')}</div>;
}

const renderProvider = () =>
  render(
    <ConfiguracionesSIGLProvider>
      <Sonda />
    </ConfiguracionesSIGLProvider>
  );

describe('ConfiguracionesSIGLContext · persistencia de las listas de Términos e Informes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(legalService.getConfiguration).mockResolvedValue(null);
    vi.mocked(legalService.saveConfiguration).mockResolvedValue({});
  });

  it('carga los destinatarios desde el backend, no solo desde localStorage', async () => {
    const remotos: DestinatarioInforme[] = [
      { id: 'dest-remoto', nombre: 'Ministerio de Hacienda', descripcion: 'Definido por otro usuario', activo: true },
    ];
    vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) =>
      key === CLAVE_DESTINATARIOS ? { value: remotos } : null
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('destinatarios')).toHaveTextContent('Ministerio de Hacienda')
    );
    // Y queda cacheado localmente para el siguiente arranque.
    expect(JSON.parse(localStorage.getItem(CLAVE_DESTINATARIOS)!)).toEqual(remotos);
  });

  it('una respuesta lenta del backend no pisa lo que el usuario ya editó', async () => {
    let resolverBackend: (v: any) => void = () => { };
    vi.mocked(legalService.getConfiguration).mockImplementation((key: string) =>
      key === CLAVE_DESTINATARIOS
        ? new Promise(res => { resolverBackend = res; })
        : Promise.resolve(null)
    );

    renderProvider();

    await act(async () => {
      ctx.actualizarDestinatariosInforme([
        { id: 'dest-local', nombre: 'Editado por el usuario', descripcion: '', activo: true },
      ]);
    });

    await act(async () => {
      resolverBackend({ value: [{ id: 'dest-viejo', nombre: 'Valor anterior', descripcion: '', activo: true }] });
    });

    expect(screen.getByTestId('destinatarios')).toHaveTextContent('Editado por el usuario');
    expect(screen.getByTestId('destinatarios')).not.toHaveTextContent('Valor anterior');
  });

  it('guarda los destinatarios y los tipos de fuente normativa en el backend', async () => {
    renderProvider();
    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());

    const destinatarios: DestinatarioInforme[] = [
      { id: 'dest-1', nombre: 'Oficina de Planeación (editada)', descripcion: 'x', activo: true },
    ];

    await act(async () => {
      ctx.actualizarDestinatariosInforme(destinatarios);
    });
    await act(async () => {
      await ctx.guardarConfiguraciones(true);
    });

    const claves = vi.mocked(legalService.saveConfiguration).mock.calls.map(c => c[0]);
    expect(claves).toContain(CLAVE_DESTINATARIOS);
    expect(claves).toContain(CLAVE_FUENTES);

    const llamada = vi.mocked(legalService.saveConfiguration).mock.calls
      .find(c => c[0] === CLAVE_DESTINATARIOS);
    expect(llamada![1]).toEqual(destinatarios);
  });

  it('si el backend falla, la edición no se pierde: queda en la caché local', async () => {
    renderProvider();
    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());

    vi.mocked(legalService.saveConfiguration).mockRejectedValue(new Error('500 Internal Server Error'));

    const destinatarios: DestinatarioInforme[] = [
      { id: 'dest-1', nombre: 'Sobrevive al fallo del backend', descripcion: '', activo: true },
    ];

    await act(async () => {
      ctx.actualizarDestinatariosInforme(destinatarios);
    });
    await act(async () => {
      await expect(ctx.guardarConfiguraciones(true)).rejects.toThrow();
    });

    expect(JSON.parse(localStorage.getItem(CLAVE_DESTINATARIOS)!)).toEqual(destinatarios);
  });

  it('autoguarda también las categorías de documentos', async () => {
    vi.useFakeTimers();
    try {
      renderProvider();

      await act(async () => {
        ctx.actualizarCategoriasDocumentos([
          { id: 'cat-1', nombre: 'Categoría editada', icono: 'File', color: '#000', activo: true, orden: 1 },
        ]);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(legalService.saveConfiguration).toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem('sigl-categorias-documentos')!)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
