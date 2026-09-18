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

  it('si el usuario borró todos, la lista queda vacía y NO reaparecen los de fábrica', async () => {
    // Fila existente en backend con lista vacía: es una decisión del usuario, no "sin configurar".
    vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) =>
      key === CLAVE_DESTINATARIOS ? { value: [] } : null
    );

    renderProvider();

    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
    await act(async () => { });

    expect(ctx.destinatariosInforme).toEqual([]);
    expect(ctx.getDestinatariosInformeActivos()).toEqual([]);
    // Y no se vuelve a sembrar por detrás.
    const sembrados = vi.mocked(legalService.saveConfiguration).mock.calls
      .filter(c => c[0] === CLAVE_DESTINATARIOS);
    expect(sembrados).toHaveLength(0);
  });

  it('respeta una lista vaciada aunque el backend todavía no tenga la fila (usa la caché local)', async () => {
    localStorage.setItem(CLAVE_DESTINATARIOS, '[]');
    vi.mocked(legalService.getConfiguration).mockResolvedValue(null);

    renderProvider();

    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
    await act(async () => { });

    expect(ctx.destinatariosInforme).toEqual([]);
  });

  it('en una instalación nueva siembra los valores de fábrica UNA vez en el backend', async () => {
    vi.mocked(legalService.getConfiguration).mockResolvedValue(null);

    renderProvider();

    await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
    await act(async () => { });

    // Se muestran los de fábrica...
    expect(ctx.destinatariosInforme.length).toBeGreaterThan(0);
    // ...y quedan escritos en backend, para que a partir de ahí la fila exista y
    // un borrado total se pueda distinguir de "nunca configurado".
    const sembrado = vi.mocked(legalService.saveConfiguration).mock.calls
      .find(c => c[0] === CLAVE_DESTINATARIOS);
    expect(sembrado).toBeDefined();
    expect(sembrado![1]).toEqual(ctx.destinatariosInforme);
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

  // Regresión del bug de QA: la parametrización de Términos e Informes se perdía al
  // cerrar sesión. Cuando la lectura inicial fallaba, el contexto lo interpretaba como
  // "nunca se configuró", mostraba los valores de fábrica y los escribía encima de la
  // fila real del backend; como el logout limpia localStorage, en la sesión siguiente
  // ya no quedaba rastro de lo configurado.
  describe('lectura fallida del backend', () => {
    const fallaLectura = () =>
      vi.mocked(legalService.getConfiguration).mockRejectedValue(new Error('500 Internal Server Error'));

    // La lectura reintenta antes de rendirse: hay que esperar a que agote los intentos.
    const esperarLecturaAgotada = async () => {
      await waitFor(
        () => expect(
          vi.mocked(legalService.getConfiguration).mock.calls.filter(c => c[0] === CLAVE_DESTINATARIOS)
        ).toHaveLength(3),
        { timeout: 5000 }
      );
      await act(async () => { });
    };

    it('no siembra los valores de fábrica encima de lo ya guardado', async () => {
      fallaLectura();

      renderProvider();
      await esperarLecturaAgotada();

      const escrituras = vi.mocked(legalService.saveConfiguration).mock.calls
        .filter(c => c[0] === CLAVE_DESTINATARIOS);
      expect(escrituras).toHaveLength(0);
      // Tampoco se cachean los de fábrica: si no sabemos qué hay guardado, no inventamos.
      expect(localStorage.getItem(CLAVE_DESTINATARIOS)).toBeNull();
    });

    it('reintenta antes de darse por vencido y aplica lo que devuelve el servidor', async () => {
      const remotos: DestinatarioInforme[] = [
        { id: 'dest-remoto', nombre: 'Contraloría General', descripcion: 'Guardado en sesiones previas', activo: true },
      ];
      let intentos = 0;
      vi.mocked(legalService.getConfiguration).mockImplementation(async (key: string) => {
        // Las demás claves ya existen en backend: así esta prueba no dispara siembras
        // que se resolverían fuera de ella.
        if (key !== CLAVE_DESTINATARIOS) return { value: [] };
        intentos++;
        if (intentos === 1) throw new Error('ECONNRESET');
        return { value: remotos };
      });

      renderProvider();

      await waitFor(
        () => expect(screen.getByTestId('destinatarios')).toHaveTextContent('Contraloría General'),
        { timeout: 3000 }
      );
    });

    it('una edición posterior no sobrescribe en el backend la lista que no se pudo leer', async () => {
      fallaLectura();

      renderProvider();
      await esperarLecturaAgotada();

      // Solo interesan las escrituras provocadas por la edición.
      vi.mocked(legalService.saveConfiguration).mockClear();

      await act(async () => {
        ctx.actualizarDestinatariosInforme([
          { id: 'dest-nuevo', nombre: 'Agregado a ciegas', descripcion: '', activo: true },
        ]);
      });
      await act(async () => {
        await ctx.guardarConfiguraciones(true);
      });

      const claves = vi.mocked(legalService.saveConfiguration).mock.calls.map(c => c[0]);
      expect(claves).not.toContain(CLAVE_DESTINATARIOS);
      expect(claves).not.toContain(CLAVE_FUENTES);
    });

    it('un 404 sí se trata como "nunca configurado" y siembra los valores de fábrica', async () => {
      const noEncontrado: any = new Error('Not Found');
      noEncontrado.statusCode = 404;
      vi.mocked(legalService.getConfiguration).mockRejectedValue(noEncontrado);

      renderProvider();
      await waitFor(() => expect(legalService.getConfiguration).toHaveBeenCalled());
      await act(async () => { });

      const sembrado = vi.mocked(legalService.saveConfiguration).mock.calls
        .find(c => c[0] === CLAVE_DESTINATARIOS);
      expect(sembrado).toBeDefined();
    });
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
