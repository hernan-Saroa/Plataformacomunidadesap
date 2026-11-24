import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CuantiaDelComite } from './CuantiaDelComite';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CUANTIA = {
  clave: 'cuantia_minima_comite',
  valor: 1000,
  minimo: 1,
  maximo: 100000,
  descripcion: 'SMMLV que debe superar el valor del proceso',
};

/**
 * La cuantía del comité, en Configuración y no entre las alertas: decide si la
 * 3.7 se convoca, y al lado se ve qué modalidades no la siguen.
 */
describe('CuantiaDelComite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fijarAlcance({ alcances: [], transversales: ['contratacion.config.manage'] });
    vi.spyOn(contratacionService, 'parametrosAlerta').mockResolvedValue([
      { clave: 'hora_aviso', valor: 7, minimo: 0, maximo: 23, descripcion: 'Hora' },
      CUANTIA,
    ]);
    vi.spyOn(contratacionService, 'umbralesComite').mockResolvedValue({
      smmlv: { anio: 2026, valor: 1623500, confirmado: false },
      umbrales: [
        {
          modalidad: 'CONTRATACION_DIRECTA',
          modalidadNombre: 'Contratación Directa',
          valor: 1000,
          unidad: 'SMMLV',
          fundamento: 'RF-DOC-05',
          confirmado: false,
        },
      ],
    });
  });

  it('dice la cuantía general y qué modalidades tienen la suya', async () => {
    render(<CuantiaDelComite />);

    expect(await screen.findByText('General · todas las modalidades')).toBeInTheDocument();
    expect(await screen.findByText('Contratación Directa')).toBeInTheDocument();
    // La general y la de la directa: las dos a la vista.
    expect(screen.getAllByText(/Más de 1\.000 SMMLV/)).toHaveLength(2);
    expect(screen.getByText(/no siguen la cuantía general/)).toBeInTheDocument();
  });

  it('cambia la cuantía general y manda solo esa clave', async () => {
    const guardar = vi
      .spyOn(contratacionService, 'guardarParametrosAlerta')
      .mockResolvedValue([{ ...CUANTIA, valor: 1200 }]);
    render(<CuantiaDelComite />);

    await userEvent.click(await screen.findByRole('button', { name: /Cambiar la cuantía general/ }));
    const campo = screen.getByRole('textbox', { name: /Cuantía para ir al Comité/ });
    await userEvent.clear(campo);
    await userEvent.type(campo, '1200');
    await userEvent.click(screen.getByRole('button', { name: /Guardar cuantía/ }));

    expect(guardar).toHaveBeenCalledWith({ cuantia_minima_comite: 1200 });
  });

  it('a quien no administra no le ofrece cambiarla', async () => {
    fijarAlcance({ alcances: [], transversales: [] });
    render(<CuantiaDelComite />);

    await screen.findByText('General · todas las modalidades');
    expect(screen.queryByRole('button', { name: /Cambiar/ })).toBeNull();
  });
});
