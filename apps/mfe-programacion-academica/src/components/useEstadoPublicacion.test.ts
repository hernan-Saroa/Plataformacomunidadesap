// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEstadoPublicacion } from './useEstadoPublicacion';
import { invalidarEscrituraProgramacion } from '../services/actualizacionProgramacion';
import { getEstadoPublicacion } from '../services/api/catalogoApi';

vi.mock('../services/api/catalogoApi', () => ({ getEstadoPublicacion: vi.fn() }));

const estado = (total: number) => ({ idPeriodo: '220', total, programado: total, publicada: 0, tomada: 0, aprobada: 0, devuelta: 0 });

beforeEach(() => { vi.clearAllMocks(); });
// Sin globals de Vitest no hay limpieza automática: un hook montado de otra prueba también consultaría.
afterEach(cleanup);

describe('panel de publicación: se actualiza solo tras una escritura confirmada', () => {
  it('tras crear una franja el panel pasa de 0 a 1 sin recargar la página', async () => {
    vi.mocked(getEstadoPublicacion).mockResolvedValueOnce(estado(0) as any).mockResolvedValue(estado(1) as any);
    const { result } = renderHook(() => useEstadoPublicacion('220'));
    await waitFor(() => expect(result.current[0]?.total).toBe(0));

    // POST /horarios confirmado por el servidor: el cliente invalida con el mecanismo común.
    act(() => invalidarEscrituraProgramacion('/programacion-academica/api/v1/horarios'));

    await waitFor(() => expect(result.current[0]?.total).toBe(1));
    expect(getEstadoPublicacion).toHaveBeenCalledTimes(2);
  });

  it('también se actualiza con las escrituras de publicación y de grupos', async () => {
    vi.mocked(getEstadoPublicacion).mockResolvedValue(estado(1) as any);
    renderHook(() => useEstadoPublicacion('220'));
    await waitFor(() => expect(getEstadoPublicacion).toHaveBeenCalledTimes(1));
    act(() => invalidarEscrituraProgramacion('/programacion-academica/api/v1/publicaciones/220/publicar'));
    await waitFor(() => expect(getEstadoPublicacion).toHaveBeenCalledTimes(2));
    act(() => invalidarEscrituraProgramacion('/programacion-academica/api/v1/grupos'));
    await waitFor(() => expect(getEstadoPublicacion).toHaveBeenCalledTimes(3));
  });

  it('una lectura vieja de otro periodo no pisa el estado del periodo actual', async () => {
    let soltarViejo!: (e: any) => void;
    vi.mocked(getEstadoPublicacion)
      .mockImplementationOnce(() => new Promise<any>((r) => { soltarViejo = r; }))
      .mockResolvedValue({ ...estado(5), idPeriodo: '11' } as any);
    const { result, rerender } = renderHook(({ id }) => useEstadoPublicacion(id), { initialProps: { id: '220' } });
    rerender({ id: '11' });
    await waitFor(() => expect(result.current[0]?.idPeriodo).toBe('11'));
    soltarViejo(estado(9));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current[0]?.idPeriodo).toBe('11');
  });

  it('sin periodo no consulta nada', () => {
    renderHook(() => useEstadoPublicacion(''));
    expect(getEstadoPublicacion).not.toHaveBeenCalled();
  });
});
