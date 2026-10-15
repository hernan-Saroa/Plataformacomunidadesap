import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BorrarProceso } from './BorrarProceso';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Borrar un proceso (108): pide el radicado y el motivo antes de hacerlo. */
describe('BorrarProceso', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('pide radicado y motivo, borra y vuelve al listado', async () => {
    const borrar = vi
      .spyOn(contratacionService, 'borrarProceso')
      .mockResolvedValue({ radicado: 'CTO-2026-0009', archivosBorrados: 2 });
    const onBorrado = vi.fn();
    render(<BorrarProceso procesoId="p-1" radicado="CTO-2026-0009" onBorrado={onBorrado} />);

    await userEvent.click(screen.getByRole('button', { name: /Borrar/ }));
    expect(screen.getByText(/No se puede deshacer/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Escribe el radicado/), 'CTO-2026-0009');
    await userEvent.type(screen.getByLabelText(/Por qué se borra/), 'Proceso creado de prueba');
    await userEvent.click(screen.getByRole('button', { name: 'Borrar el proceso' }));

    expect(borrar).toHaveBeenCalledWith('p-1', 'CTO-2026-0009', 'Proceso creado de prueba');
    expect(onBorrado).toHaveBeenCalled();
  });

  it('cancelar no borra nada', async () => {
    const borrar = vi.spyOn(contratacionService, 'borrarProceso');
    render(<BorrarProceso procesoId="p-1" radicado="CTO-2026-0009" onBorrado={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Borrar/ }));
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(borrar).not.toHaveBeenCalled();
  });
});
