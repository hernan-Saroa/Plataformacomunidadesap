import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CronogramaPredeterminado } from './CronogramaPredeterminado';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

const predeterminado = (cambios: Record<string, unknown> = {}) => ({
  modalidad: 'LICITACION_PUBLICA',
  nombre: 'Licitación Pública',
  etapas: [],
  actividades: [
    { numeral: '5.6', nombre: 'Observaciones al proyecto de pliego', etapa: 5, incluida: false },
    { numeral: '6.1', nombre: 'Cierre del proceso y recepción de ofertas', etapa: 6, incluida: false },
    { numeral: '6.6', nombre: 'Subsanaciones', etapa: 6, incluida: false },
  ],
  propias: [],
  actualizadoPor: null,
  ...cambios,
});

/** Cronograma predeterminado por modalidad en Configuración: qué etapas y actividades salen (144). */
describe('CronogramaPredeterminado', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'resumenCronogramaPredeterminado').mockResolvedValue([
      { modalidad: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', etapas: 0, actividades: 0 },
      { modalidad: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', etapas: 2, actividades: 3 },
    ] as never);
  });

  it('no pide días ni fechas: solo qué etapas y actividades salen', async () => {
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(predeterminado() as never);
    render(<CronogramaPredeterminado />);

    expect(await screen.findByText(/Licitación Pública · sin configurar/)).toBeInTheDocument();
    expect(await screen.findByLabelText('Incluir la etapa 6')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    // Las actividades de una etapa no se ven hasta incluirla y desplegarla.
    expect(screen.queryByLabelText('Incluir la 6.1')).not.toBeInTheDocument();
  });

  it('incluir una etapa trae sus actividades; se quitan las que no y se agrega una propia', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(predeterminado() as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaPredeterminado')
      .mockResolvedValue(predeterminado({ etapas: [6] }) as never);
    render(<CronogramaPredeterminado />);

    await usuario.click(await screen.findByLabelText('Incluir la etapa 6'));
    expect(screen.getByLabelText('Incluir la 6.1')).toBeChecked();
    await usuario.click(screen.getByLabelText('Incluir la 6.6'));
    await usuario.click(screen.getByRole('button', { name: /Agregar una actividad propia/ }));
    await usuario.type(screen.getByLabelText('Nombre de la actividad propia'), 'Visita técnica');

    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma de Licitación Pública/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0]).toEqual([
      'LICITACION_PUBLICA',
      { etapas: [6], numerales: ['6.1'], propias: [{ nombre: 'Visita técnica', etapa: 6 }] },
    ]);
  });

  it('quitar una etapa quita también sus actividades', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(
      predeterminado({
        etapas: [5, 6],
        actividades: [
          { numeral: '5.6', nombre: 'Observaciones', etapa: 5, incluida: true },
          { numeral: '6.1', nombre: 'Cierre', etapa: 6, incluida: true },
        ],
      }) as never,
    );
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaPredeterminado')
      .mockResolvedValue(predeterminado() as never);
    render(<CronogramaPredeterminado />);

    await usuario.click(await screen.findByLabelText('Incluir la etapa 6'));
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0][1]).toEqual({ etapas: [5], numerales: ['5.6'], propias: [] });
  });

  it('no deja guardar una actividad propia sin nombre', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(predeterminado() as never);
    render(<CronogramaPredeterminado />);

    await usuario.click(await screen.findByLabelText('Incluir la etapa 6'));
    await usuario.click(screen.getByRole('button', { name: /Agregar una actividad propia/ }));

    expect(screen.getByText('Ponle nombre a la actividad propia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar el cronograma/ })).toBeDisabled();
  });
});
