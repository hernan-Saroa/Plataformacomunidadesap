import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const sinVeto = {
  valorEstimado: 20000000,
  modalidad: 'MINIMA_CUANTIA',
  nombre: 'Mínima Cuantía',
  forzosa: false,
  umbral: null,
  modalidadesBloqueadas: [],
  motivo: null,
  advertencia: null,
};

/**
 * La modalidad dentro de la 3.1 (migración 094): el área la cambia mientras
 * arma el estudio previo, porque de ella depende la lista de documentos. El
 * valor no: sale del PAA (migración 105).
 */
describe('ModalidadDelEstudioPrevio', () => {
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
    await userEvent.click(screen.getByRole('button', { name: 'Guardar el cambio' }));

    // El diálogo explica qué pasa con la lista antes de hacerlo.
    expect(await screen.findByText(/La lista de documentos pasa a ser la de esta modalidad/)).toBeInTheDocument();
    expect(cambiar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar la modalidad' }));

    expect(cambiar).toHaveBeenCalledWith('p-1', 'LICITACION_PUBLICA');
    expect(onCambiada).toHaveBeenCalledWith(nuevo);
  });

  it('el valor viene del PAA y no se edita (migración 105)', async () => {
    render(
      <ModalidadDelEstudioPrevio procesoId="p-1" proceso={proceso} puedeCambiar onCambiada={vi.fn()} />,
    );

    expect(screen.getByText(/según el PAA/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    expect(screen.queryByLabelText(/Valor estimado del contrato/)).toBeNull();
    // Sin elegir otra modalidad no hay nada que guardar.
    expect(screen.getByRole('button', { name: 'Guardar el cambio' })).toBeDisabled();
  });

  it('si el valor del PAA obliga a licitación, la fija y deshabilita las de menor cuantía', async () => {
    vi.spyOn(contratacionService, 'sugerenciaModalidad').mockResolvedValue({
      ...sinVeto,
      valorEstimado: 9000000000,
      modalidad: 'LICITACION_PUBLICA',
      nombre: 'Licitación Pública',
      forzosa: true,
      modalidadesBloqueadas: ['MINIMA_CUANTIA'],
      motivo: 'Supera el umbral de licitación pública ($ 1.000.000.000)',
    } as never);
    render(
      <ModalidadDelEstudioPrevio procesoId="p-1" proceso={proceso} puedeCambiar onCambiada={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await screen.findByRole('option', { name: 'Licitación Pública' });

    expect(await screen.findByText(/Licitación Pública obligatoria/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/Modalidad que corresponde/)).toHaveValue('LICITACION_PUBLICA'),
    );
    expect(screen.getByRole('option', { name: /Mínima Cuantía — no aplica por la cuantía/ })).toBeDisabled();
  });
});
