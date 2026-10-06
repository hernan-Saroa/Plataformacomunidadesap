import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DecisionEstudioPrevio } from './DecisionEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
// La firma solo se pide si la actividad la exige; aquí no.
vi.mock('../shared/useFirma', () => ({
  useFirma: () => ({ conFirma: (hacer: () => unknown) => hacer(), modal: null }),
}));

/**
 * La decisión sobre el estudio previo, fuera del formulario de quien redactó.
 */
describe('DecisionEstudioPrevio', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('devolver con archivos adjunta todas las correcciones después de devolver', async () => {
    const devolver = vi.spyOn(contratacionService, 'devolver').mockResolvedValue({} as never);
    const subir = vi
      .spyOn(contratacionService, 'subirSoporteDevolucion')
      .mockResolvedValue({} as never);
    const onDecidido = vi.fn();
    render(<DecisionEstudioPrevio procesoId="p-1" onDecidido={onDecidido} variante="tarjeta" />);

    await userEvent.click(screen.getByRole('button', { name: /Devolver/ }));
    await userEvent.type(screen.getByLabelText(/Observaciones/), 'Falta el estudio de mercado.');
    const archivo = new File(['x'], 'correcciones.pdf', { type: 'application/pdf' });
    const anexo = new File(['y'], 'anexo-tecnico.docx', { type: 'application/msword' });
    await userEvent.upload(screen.getByLabelText('Documentos con las correcciones'), [archivo, anexo]);
    // Se pueden ir sumando y quitar uno a uno.
    const sobra = new File(['z'], 'equivocado.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Documentos con las correcciones'), sobra);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar equivocado.pdf' }));
    // El último «Devolver» es el que confirma, dentro del modal.
    await userEvent.click(screen.getAllByRole('button', { name: /^Devolver$/ }).at(-1)!);

    expect(devolver).toHaveBeenCalledWith('p-1', 'Falta el estudio de mercado.');
    expect(subir).toHaveBeenCalledTimes(2);
    expect(subir).toHaveBeenNthCalledWith(1, 'p-1', '3.1', archivo);
    expect(subir).toHaveBeenNthCalledWith(2, 'p-1', '3.1', anexo);
    expect(onDecidido).toHaveBeenCalled();
  });

  it('al aprobar dice a dónde pasa el proceso', async () => {
    render(
      <DecisionEstudioPrevio
        procesoId="p-1"
        onDecidido={vi.fn()}
        pasaA="Definir modalidad de contratación · Gestor de contratación"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Aprobar/ }));

    expect(screen.getByText(/Definir modalidad de contratación · Gestor de contratación/)).toBeInTheDocument();
  });

  it('devolver sin observaciones no se deja confirmar', async () => {
    render(<DecisionEstudioPrevio procesoId="p-1" onDecidido={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Devolver/ }));

    expect(screen.getAllByRole('button', { name: /^Devolver$/ }).at(-1)).toBeDisabled();
  });

  it('ofrece las tres decisiones', () => {
    render(<DecisionEstudioPrevio procesoId="p-1" onDecidido={vi.fn()} variante="tarjeta" />);

    expect(screen.getByRole('button', { name: /Aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver/ })).toBeInTheDocument();
    // La tercera es la que faltaba: sin ella un proceso rechazado de plano se
    // devolvía, y el área se quedaba esperando saber qué corregir.
    expect(screen.getByRole('button', { name: /Negar/ })).toBeInTheDocument();
  });

  it('negar exige motivo antes de dejar confirmar', async () => {
    const negar = vi.spyOn(contratacionService, 'negar');
    render(<DecisionEstudioPrevio procesoId="p-1" onDecidido={vi.fn()} variante="tarjeta" />);

    await userEvent.click(screen.getByRole('button', { name: /Negar/ }));

    expect(screen.getByRole('button', { name: /Negar el proceso/ })).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText(/Motivo de la negativa/),
      'El objeto ya está cubierto por el contrato marco vigente.',
    );
    expect(screen.getByRole('button', { name: /Negar el proceso/ })).toBeEnabled();
    expect(negar).not.toHaveBeenCalled();
  });
});
