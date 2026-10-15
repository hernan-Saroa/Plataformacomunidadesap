import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RevisoresDeLosEscalones } from './RevisoresDeLosEscalones';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const datos = (cambios: Record<string, unknown> = {}) => ({
  puedeDesignar: true,
  historial: [],
  escalones: [
    {
      orden: 2,
      nombre: 'Director',
      roles: ['Director de Contratación'],
      designado: null,
      cambiable: true,
      leToca: false,
      ...cambios,
    },
  ],
});

/**
 * Quién revisa cada escalón por rol de la 3.1, en la 3.3 (migración 102).
 */
describe('RevisoresDeLosEscalones', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('dice que sin designar el escalón no lo decide nadie', () => {
    render(<RevisoresDeLosEscalones procesoId="p-1" datos={datos() as never} onCambio={vi.fn()} />);

    expect(screen.getByText(/Escalón 2 · Director/)).toBeInTheDocument();
    expect(screen.getByText(/no lo decide nadie/)).toBeInTheDocument();
  });

  it('designa entre las cuentas que tienen el rol', async () => {
    vi.spyOn(contratacionService, 'candidatosDeEscalon').mockResolvedValue([
      { usuarioId: 'u-diana', usuarioNombre: 'diana.castro@esap.edu.co', nombre: 'Diana Castro' },
    ] as never);
    const designar = vi
      .spyOn(contratacionService, 'designarEscalon')
      .mockResolvedValue(datos() as never);
    render(<RevisoresDeLosEscalones procesoId="p-1" datos={datos() as never} onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Designar/ }));
    await userEvent.selectOptions(await screen.findByRole('combobox'), 'u-diana');
    await userEvent.click(screen.getAllByRole('button', { name: /Designar/ }).at(-1)!);

    expect(designar).toHaveBeenCalledWith('p-1', 2, 'u-diana', undefined);
  });

  it('cambiar a quien estaba pide motivo', async () => {
    vi.spyOn(contratacionService, 'candidatosDeEscalon').mockResolvedValue([
      { usuarioId: 'u-otro', usuarioNombre: 'otro@esap.edu.co', nombre: 'Otro Director' },
    ] as never);
    render(
      <RevisoresDeLosEscalones
        procesoId="p-1"
        datos={datos({ designado: { usuarioId: 'u-diana', nombre: 'Diana Castro', usuarioNombre: 'diana', asignadoAt: '2026-10-14T10:00:00Z', asignadoPor: 'laura' } }) as never}
        onCambio={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Cambiar/ }));
    await userEvent.selectOptions(await screen.findByRole('combobox'), 'u-otro');

    expect(screen.getAllByRole('button', { name: /Cambiar/ }).at(-1)).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Motivo del cambio'), 'Diana sale a vacaciones');
    expect(screen.getAllByRole('button', { name: /Cambiar/ }).at(-1)).toBeEnabled();
  });

  it('lo que ya decidió en esta revisión no se ofrece cambiar', () => {
    render(<RevisoresDeLosEscalones procesoId="p-1" datos={datos({ cambiable: false }) as never} onCambio={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Designar|Cambiar/ })).toBeNull();
  });
});
