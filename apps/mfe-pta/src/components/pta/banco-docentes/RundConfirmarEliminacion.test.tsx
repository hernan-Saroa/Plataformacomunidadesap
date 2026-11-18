import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RundConfirmarEliminacion, type ConfirmacionEliminar } from './RundConfirmarEliminacion';

afterEach(cleanup);
const base = (extra: Partial<ConfirmacionEliminar> = {}): ConfirmacionEliminar => ({
  titulo: 'Eliminar archivo', objeto: '1.1.1_PREGRADO_UNAL.pdf', descripcion: 'La versión queda en el historial.', confirmar: vi.fn(), ...extra,
});

describe('Confirmación de eliminación con el diseño de la página', () => {
  it('no se muestra sin confirmación pendiente', () => {
    render(<RundConfirmarEliminacion confirmacion={null} onCancelar={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('muestra título, descripción y el objeto a eliminar; confirmar ejecuta la acción', () => {
    const confirmacion = base({ detalle: 'Detalle extra' });
    render(<RundConfirmarEliminacion confirmacion={confirmacion} onCancelar={vi.fn()} />);
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByText('Eliminar archivo', { selector: 'h2' })).toBeTruthy();
    expect(within(dialogo).getByText('1.1.1_PREGRADO_UNAL.pdf')).toBeTruthy();
    expect(within(dialogo).getByText('Detalle extra')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar archivo' }));
    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
  });

  it('Cancelar y Esc cierran sin confirmar', () => {
    const confirmacion = base();
    const onCancelar = vi.fn();
    render(<RundConfirmarEliminacion confirmacion={confirmacion} onCancelar={onCancelar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancelar).toHaveBeenCalledTimes(2);
    expect(confirmacion.confirmar).not.toHaveBeenCalled();
  });

  it('con una acción en curso bloquea cancelar y confirmar', () => {
    const onCancelar = vi.fn();
    render(<RundConfirmarEliminacion confirmacion={base()} ocupado onCancelar={onCancelar} />);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Eliminando…' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('para títulos el botón dice «Eliminar título»', () => {
    render(<RundConfirmarEliminacion confirmacion={base({ titulo: 'Eliminar título', objeto: 'Abogado' })} onCancelar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Eliminar título' })).toBeTruthy();
  });
});
