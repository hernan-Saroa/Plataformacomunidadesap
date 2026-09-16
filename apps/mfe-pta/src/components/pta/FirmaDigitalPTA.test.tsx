// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { FirmaDigitalPTA } from './FirmaDigitalPTA';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('motion/react', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }: any) => children,
    motion: { div: ({ initial, animate, exit, transition, children, ...props }: any) => React.createElement('div', props, children) },
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function confirmar(onFirmaCompleta: any) {
  vi.useFakeTimers();
  const { container } = render(<FirmaDigitalPTA ptaId="pta-1" docenteNombre="Docente"
    periodo="2026-2" totalHoras={800} firmanteNombre="Revisor" firmanteCargo="Revisor"
    etapaLabel="Revisión" onVerifyCodigo={async () => {}} onFirmaCompleta={onFirmaCompleta} onCancelar={vi.fn()} />);
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => fireEvent.change(input, { target: { value: '1' } }));
  await act(async () => {});
  await act(async () => { vi.advanceTimersByTime(4400); });
  fireEvent.click(screen.getByText('Confirmar y firmar'));
  return container;
}

describe('resultado de la firma', () => {
  it('espera al guardado y no confirma éxito cuando el servidor rechaza la decisión', async () => {
    let finish!: (value: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    await confirmar(save);
    expect(screen.getByRole('status').textContent).toContain('Guardando');
    expect(screen.queryByText('Firma registrada')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => { finish(false); });
    expect(screen.getByText('Confirmar y firmar')).toBeTruthy();
    expect(screen.queryByText('Firma registrada')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('confirma éxito únicamente al terminar el guardado', async () => {
    await confirmar(vi.fn().mockResolvedValue(true));
    await act(async () => {});
    expect(screen.getByText('Firma registrada')).toBeTruthy();
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
  it('permite reintentar sin mostrar éxito si falla la conexión', async () => {
    await confirmar(vi.fn().mockRejectedValue(new Error('Conexión interrumpida')));
    await act(async () => {});
    expect(screen.getByText('Confirmar y firmar')).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith('Conexión interrumpida');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
