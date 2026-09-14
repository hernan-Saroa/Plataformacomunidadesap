import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePTARealtimeSync } from './usePTARealtimeSync';
import { getPTARecentEvents, getPTASyncStatus } from '../services/api/ptaApi';

vi.mock('../services/api/ptaApi', () => ({
  getPTASyncStatus: vi.fn(),
  getPTARecentEvents: vi.fn(),
  markPTAEventsRead: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getPTASyncStatus).mockReset().mockResolvedValue({ success: true, data: { counter: 0 } });
  vi.mocked(getPTARecentEvents).mockReset().mockResolvedValue({ success: true, data: [] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('sincronización del estado real del PTA', () => {
  it('refresca decisiones parciales aunque no cambie el contador de eventos', async () => {
    const onRefresh = vi.fn();
    renderHook(() => usePTARealtimeSync({ sistema: 'backoffice', onRefresh }));
    await advance(1500);
    await advance(10000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(getPTARecentEvents).not.toHaveBeenCalled();
  });

  it('detecta 0 → 1 y decisiones de otro usuario del mismo backoffice', async () => {
    const onDataChanged = vi.fn();
    const event = { id: 'decision', sistema_origen: 'backoffice', timestamp: new Date().toISOString() };
    const { result } = renderHook(() => usePTARealtimeSync({ sistema: 'backoffice', onDataChanged }));
    await advance(1500);
    vi.mocked(getPTASyncStatus).mockResolvedValue({ success: true, data: { counter: 1 } });
    vi.mocked(getPTARecentEvents).mockResolvedValue({ success: true, data: [event] });
    await advance(10000);
    expect(onDataChanged).toHaveBeenCalledWith([event]);
    expect(result.current.lastCounter).toBe(1);
    expect(result.current.unreadCount).toBe(0);
  });

  it('refresca datos aunque falle la consulta auxiliar de eventos', async () => {
    const onRefresh = vi.fn();
    const onDataChanged = vi.fn();
    renderHook(() => usePTARealtimeSync({ sistema: 'portal', docenteId: 'docente-1', onRefresh, onDataChanged }));
    await advance(1500);
    vi.mocked(getPTASyncStatus).mockResolvedValue({ success: true, data: { counter: 1 } });
    vi.mocked(getPTARecentEvents).mockResolvedValue({ success: false });
    await advance(10000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(onDataChanged).toHaveBeenCalledWith([]);
    expect(getPTARecentEvents).toHaveBeenCalledWith(expect.any(String), 'docente-1', expect.any(AbortSignal));
  });

  it('consulta al recuperar el foco sin solapar peticiones y cancela al salir', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getPTASyncStatus).mockImplementation(() => new Promise(done => { resolve = done; }));
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() => usePTARealtimeSync({ sistema: 'backoffice', onRefresh }));
    await advance(1500);
    act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('online')); });
    expect(getPTASyncStatus).toHaveBeenCalledTimes(1);
    const signal = vi.mocked(getPTASyncStatus).mock.calls[0][0]!;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve({ success: true, data: { counter: 3 } }); });
    await advance(60000);
    expect(onRefresh).not.toHaveBeenCalled();
    expect(getPTASyncStatus).toHaveBeenCalledTimes(1);
  });

  it('no conserva bucles ni respuestas de la cuenta anterior', async () => {
    let resolveOld!: (value: any) => void;
    vi.mocked(getPTASyncStatus).mockImplementationOnce(() => new Promise(done => { resolveOld = done; }));
    const onRefresh = vi.fn();
    const { rerender } = renderHook(({ docenteId }) => usePTARealtimeSync({ sistema: 'portal', docenteId, onRefresh }), {
      initialProps: { docenteId: 'anterior' },
    });
    await advance(1500);
    rerender({ docenteId: 'actual' });
    await act(async () => { resolveOld({ success: true, data: { counter: 9 } }); });
    await advance(1500);
    await advance(10000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(getPTASyncStatus).toHaveBeenCalledTimes(3);
  });
});
