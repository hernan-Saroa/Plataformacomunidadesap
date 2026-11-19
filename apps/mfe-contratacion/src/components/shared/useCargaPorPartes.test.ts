import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../../services/contratacionService', async (original) => {
  const real: any = await original();
  return {
    ...real,
    subirParte: vi.fn(),
    contratacionService: {
      ...real.contratacionService,
      iniciarCarga: vi.fn(),
      completarCarga: vi.fn(),
      cancelarCarga: vi.fn(),
    },
  };
});

import { ParteFallidaError, contratacionService, subirParte } from '../../services/contratacionService';
import { useCargaPorPartes } from './useCargaPorPartes';
import { megas, tiempoRestante } from './BarraDeCarga';

const servicio = contratacionService as any;
const parte = subirParte as any;
const MB = 1024 * 1024;

/** Un archivo de 12 MB: tres partes de 5, 5 y 2 MB. */
const archivo = () => new File([new Uint8Array(12 * MB)], 'oferta.zip', { type: 'application/zip' });

describe('useCargaPorPartes (BUG-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.iniciarCarga.mockResolvedValue({ id: 'c-1', partes: 3, tamanoParte: 5 * MB });
    servicio.completarCarga.mockResolvedValue({ id: 'c-1', nombre: 'oferta.zip', tamano: 12 * MB, archivos: 7 });
    servicio.cancelarCarga.mockResolvedValue({ cancelada: true });
    parte.mockImplementation(async (_ruta: string, trozo: Blob, onEnviado: (b: number) => void) => {
      onEnviado(trozo.size);
    });
  });

  it('sube las partes en orden, avanza la barra y termina lista con el id', async () => {
    const { result } = renderHook(() => useCargaPorPartes('p-1', '6.1', { pausaEntreIntentos: 0 }));
    act(() => {
      result.current.subir(archivo());
    });

    await waitFor(() => expect(result.current.carga.estado).toBe('lista'));
    expect(parte).toHaveBeenCalledTimes(3);
    expect(parte.mock.calls.map((c: any[]) => c[0])).toEqual([
      '/procesos/p-1/actividades/6.1/cargas/c-1/partes/0',
      '/procesos/p-1/actividades/6.1/cargas/c-1/partes/1',
      '/procesos/p-1/actividades/6.1/cargas/c-1/partes/2',
    ]);
    expect(parte.mock.calls[2][1].size).toBe(2 * MB);
    expect(result.current.carga).toMatchObject({ porcentaje: 100, cargaId: 'c-1', archivosEnZip: 7 });
  });

  it('una parte que falla por la red se reintenta sola', async () => {
    parte.mockRejectedValueOnce(new ParteFallidaError('Se perdió la conexión', true));
    const { result } = renderHook(() => useCargaPorPartes('p-1', '6.1', { pausaEntreIntentos: 0 }));
    act(() => {
      result.current.subir(archivo());
    });

    await waitFor(() => expect(result.current.carga.estado).toBe('lista'));
    expect(parte).toHaveBeenCalledTimes(4);
  });

  it('si sigue fallando queda en «falló» y al reintentar retoma desde la parte que faltaba', async () => {
    // La primera parte pasa; la segunda falla los cuatro intentos.
    parte
      .mockImplementationOnce(async (_r: string, t: Blob, on: (b: number) => void) => on(t.size))
      .mockRejectedValue(new ParteFallidaError('Se perdió la conexión', true));
    const { result } = renderHook(() => useCargaPorPartes('p-1', '6.1', { pausaEntreIntentos: 0 }));
    act(() => {
      result.current.subir(archivo());
    });

    await waitFor(() => expect(result.current.carga.estado).toBe('fallo'));
    expect(result.current.carga.error).toMatch(/Se perdió la conexión/);
    expect(result.current.carga.porcentaje).toBeGreaterThan(0);

    parte.mockReset();
    parte.mockImplementation(async (_r: string, t: Blob, on: (b: number) => void) => on(t.size));
    act(() => result.current.reintentar());

    await waitFor(() => expect(result.current.carga.estado).toBe('lista'));
    // No se volvió a pedir una carga nueva ni a subir la parte 0.
    expect(servicio.iniciarCarga).toHaveBeenCalledTimes(1);
    expect(parte.mock.calls.map((c: any[]) => c[0].split('/').pop())).toEqual(['1', '2']);
  });

  it('un .zip rechazado al verificar no se reintenta: dice por qué', async () => {
    servicio.completarCarga.mockRejectedValue(new Error('El .zip trae un archivo ejecutable («a.exe»)'));
    const { result } = renderHook(() => useCargaPorPartes('p-1', '6.1', { pausaEntreIntentos: 0 }));
    act(() => {
      result.current.subir(archivo());
    });

    await waitFor(() => expect(result.current.carga.estado).toBe('fallo'));
    expect(result.current.carga.error).toMatch(/ejecutable/);
  });

  it('cancelar le pide al servidor que borre lo que llegó', async () => {
    const { result } = renderHook(() => useCargaPorPartes('p-1', '6.1', { pausaEntreIntentos: 0 }));
    act(() => {
      result.current.subir(archivo());
    });
    await waitFor(() => expect(result.current.carga.estado).toBe('lista'));

    act(() => result.current.descartar());
    expect(result.current.carga.estado).toBe('inactiva');
    expect(servicio.cancelarCarga).toHaveBeenCalledWith('p-1', '6.1', 'c-1');
  });
});

describe('BarraDeCarga · textos', () => {
  it('dice el peso y el tiempo que falta en palabras', () => {
    expect(megas(1.5 * MB)).toBe('1,5 MB');
    expect(megas(120 * MB)).toBe('120 MB');
    expect(tiempoRestante(40)).toBe('quedan unos 40 s');
    expect(tiempoRestante(180)).toBe('quedan unos 3 min');
    expect(tiempoRestante(null)).toBeNull();
  });
});
