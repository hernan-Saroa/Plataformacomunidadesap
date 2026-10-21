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
 * arma el estudio previo, porque de ella depende la lista de documentos.
 */
describe('ModalidadDelEstudioPrevio', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'modalidades').mockResolvedValue([
      { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía' },
      { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública' },
    ] as never);
    vi.spyOn(contratacionService, 'sugerenciaModalidad').mockResolvedValue(sinVeto as never);
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
      .spyOn(contratacionService, 'cambiarCuantiaDelEstudioPrevio')
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

    // El valor viaja sin cambios: la modalidad se cambia por la misma ruta.
    expect(cambiar).toHaveBeenCalledWith('p-1', 20000000, 'LICITACION_PUBLICA');
    expect(onCambiada).toHaveBeenCalledWith(nuevo);
  });

  it('corrige el valor que se digitó mal, conservando la modalidad', async () => {
    const nuevo = { ...proceso, valorEstimado: 2000000 };
    const cambiar = vi
      .spyOn(contratacionService, 'cambiarCuantiaDelEstudioPrevio')
      .mockResolvedValue({ proceso: nuevo } as never);
    const onCambiada = vi.fn();
    render(
      <ModalidadDelEstudioPrevio procesoId="p-1" proceso={proceso} puedeCambiar onCambiada={onCambiada} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const valor = screen.getByLabelText(/Valor estimado del contrato/);
    expect(valor).toHaveValue('20.000.000');
    await userEvent.clear(valor);
    await userEvent.type(valor, '2.000.000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar el cambio' }));

    expect(await screen.findByText(/Pasa de .*20\.000\.000 a .*2\.000\.000/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Corregir el valor' }));

    expect(cambiar).toHaveBeenCalledWith('p-1', 2000000, 'MINIMA_CUANTIA');
    expect(onCambiada).toHaveBeenCalledWith(nuevo);
  });

  it('si el valor nuevo obliga a licitación, la fija y deshabilita las de menor cuantía', async () => {
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
