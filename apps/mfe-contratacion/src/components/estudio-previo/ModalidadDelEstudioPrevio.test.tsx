import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ModalidadDelEstudioPrevio } from './ModalidadDelEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';
import { EstudioPrevio } from '../../types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const proceso: EstudioPrevio['proceso'] = {
  id: 'p-1',
  radicado: 'CON-2026-0001',
  objeto: 'Adquisición de equipos',
  modalidad: 'MINIMA_CUANTIA',
  modalidadNombre: 'Mínima Cuantía',
  valorEstimado: 20000000,
  etapa: 3,
  radicadoPorMi: true,
};

/**
 * La modalidad dentro de la 3.1 (migración 094): el área la cambia mientras
 * arma el estudio previo, porque de ella depende la lista de documentos.
 */
describe('ModalidadDelEstudioPrevio', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'modalidades').mockResolvedValue([
      { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía' },
      { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública' },
    ] as never);
  });

  it('muestra la modalidad y la cuantía, y que se ratifica con el estudio previo', () => {
    render(
      <ModalidadDelEstudioPrevio procesoId="p-1" proceso={proceso} puedeCambiar onCambiada={vi.fn()} />,
    );

    expect(screen.getByText('Mínima Cuantía')).toBeInTheDocument();
    expect(screen.getByText(/Valor estimado/)).toBeInTheDocument();
    expect(screen.getByText(/ratifica al aprobar el estudio previo/)).toBeInTheDocument();
  });

  it('quien no la puede cambiar no ve el botón', () => {
    render(
      <ModalidadDelEstudioPrevio
        procesoId="p-1"
        proceso={proceso}
        puedeCambiar={false}
        onCambiada={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Cambiar' })).toBeNull();
  });

  it('cambiarla pide confirmación y avisa con el proceso nuevo', async () => {
    const nuevo = { ...proceso, modalidad: 'LICITACION_PUBLICA', modalidadNombre: 'Licitación Pública' };
    const cambiar = vi
      .spyOn(contratacionService, 'cambiarModalidadDelEstudioPrevio')
      .mockResolvedValue({ proceso: nuevo } as never);
    const onCambiada = vi.fn();
    render(
      <ModalidadDelEstudioPrevio procesoId="p-1" proceso={proceso} puedeCambiar onCambiada={onCambiada} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await screen.findByRole('option', { name: 'Licitación Pública' });
    await userEvent.selectOptions(screen.getByLabelText(/Modalidad que corresponde/), 'LICITACION_PUBLICA');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar la modalidad' }));

    // El diálogo explica qué pasa con la lista antes de hacerlo.
    expect(await screen.findByText(/La lista de documentos pasa a ser la de esta modalidad/)).toBeInTheDocument();
    expect(cambiar).not.toHaveBeenCalled();
    const botones = screen.getAllByRole('button', { name: 'Cambiar la modalidad' });
    await userEvent.click(botones[botones.length - 1]);

    expect(cambiar).toHaveBeenCalledWith('p-1', 'LICITACION_PUBLICA');
    expect(onCambiada).toHaveBeenCalledWith(nuevo);
  });
});
