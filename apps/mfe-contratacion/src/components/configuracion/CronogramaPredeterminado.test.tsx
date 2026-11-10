import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CronogramaPredeterminado } from './CronogramaPredeterminado';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

const predeterminado = (configuracion: unknown = null) => ({
  modalidad: 'LICITACION_PUBLICA',
  nombre: 'Licitación Pública',
  actividades: [
    { numeral: '5.6', nombre: 'Observaciones al proyecto de pliego', etapa: 5, configuracion: null },
    { numeral: '6.1', nombre: 'Cierre del proceso y recepción de ofertas', etapa: 6, configuracion },
  ],
  propias: [],
  actualizadoPor: null,
});

/** Cronograma predeterminado por modalidad en Configuración (140, EFDS-1152). */
describe('CronogramaPredeterminado', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'resumenCronogramaPredeterminado').mockResolvedValue([
      { modalidad: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', actividades: 0, actualizadoAt: null },
      { modalidad: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', actividades: 3, actualizadoAt: null },
    ] as never);
  });

  it('configura una actividad del flujo y una propia, en días desde el día cero', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(predeterminado() as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaPredeterminado')
      .mockResolvedValue(predeterminado() as never);
    render(<CronogramaPredeterminado />);

    expect(await screen.findByText(/Licitación Pública · sin configurar/)).toBeInTheDocument();
    await usuario.click(await screen.findByLabelText('Incluir la 6.1'));
    await usuario.type(screen.getByLabelText('Día de fin de 6.1'), '20');
    await usuario.selectOptions(screen.getByLabelText('Tipo de días de 6.1'), 'CALENDARIO');

    await usuario.click(screen.getByRole('button', { name: /Agregar una actividad propia a la etapa 6/ }));
    await usuario.type(screen.getByLabelText('Nombre de la actividad propia'), 'Visita técnica');
    await usuario.type(screen.getByLabelText('Día de inicio de Visita técnica'), '3');
    await usuario.type(screen.getByLabelText('Día de fin de Visita técnica'), '5');

    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma de Licitación Pública/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [modalidad, filas] = guardar.mock.calls[0];
    expect(modalidad).toBe('LICITACION_PUBLICA');
    expect(filas).toEqual([
      expect.objectContaining({ numeral: '6.1', diaInicio: null, diaFin: 20, tipoDias: 'CALENDARIO' }),
      expect.objectContaining({ numeral: null, nombre: 'Visita técnica', etapa: 6, diaInicio: 3, diaFin: 5, tipoDias: 'HABILES' }),
    ]);
  });

  it('no deja guardar si una actividad empieza después de terminar', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronogramaPredeterminado').mockResolvedValue(predeterminado() as never);
    render(<CronogramaPredeterminado />);

    await usuario.click(await screen.findByLabelText('Incluir la 6.1'));
    await usuario.type(screen.getByLabelText('Día de inicio de 6.1'), '9');
    await usuario.type(screen.getByLabelText('Día de fin de 6.1'), '4');

    expect(screen.getByText(/6\.1: empieza después de terminar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar el cronograma/ })).toBeDisabled();
  });
});
