import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelOfertas } from './PanelOfertas';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recepcion = (cambios: Record<string, unknown> = {}) => ({
  id: 'r-1',
  estado: 'ABIERTA',
  // Las cinco de la tarde en Bogotá, que es la hora de cierre de ventanilla.
  vencimiento: '2026-10-15T17:00:00.000-05:00',
  vencimientoDia: '2026-10-15',
  plazoDiasHabiles: 10,
  vencido: false,
  diasHabilesRestantes: 8,
  estadoPlazo: 'VIGENTE',
  cerradaAt: null,
  cerradaPor: null,
  ...cambios,
});

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  etapa: 6,
  abierto: true,
  plazoParametrizado: true,
  plazoConfirmado: true,
  recepcion: recepcion(),
  puedeRegistrar: true,
  puedeCerrar: false,
  listaPublicada: false,
  oferentes: [],
  ...cambios,
});

/**
 * El vencimiento del plazo de ofertas — actividad 6.1 (EFDS-1155).
 *
 * Era un `window.prompt` que pedía «AAAA-MM-DD HH:MM» en texto libre: un
 * diálogo gris del navegador que bloquea la pestaña, no se puede estilar y no
 * valida nada hasta enviarlo.
 */
describe('PanelOfertas · el vencimiento del plazo', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(datos as never);
    render(<PanelOfertas procesoId="p-1" />);
  };

  const abrir = async () =>
    userEvent.click(await screen.findByRole('button', { name: /Corregir el vencimiento/ }));

  it('se pide en campos de fecha y hora, no escrito a mano', async () => {
    pintar(estado());
    await abrir();

    expect(screen.getByLabelText(/Fecha/)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/Hora/)).toHaveAttribute('type', 'time');
  });

  it('llega precargado con el vencimiento que ya tenía', async () => {
    // Casi siempre se entra aquí a mover la hora del cronograma, no a inventar
    // una fecha desde cero.
    pintar(estado());
    await abrir();

    expect(screen.getByLabelText(/Fecha/)).toHaveValue('2026-10-15');
    expect(screen.getByLabelText(/Hora/)).toHaveValue('17:00');
  });

  it('sin vencimiento todavía, propone hoy a las cinco', async () => {
    pintar(estado({ recepcion: null, plazoParametrizado: false }));

    await userEvent.click(
      await screen.findByRole('button', { name: /Fijar el vencimiento/ }),
    );

    expect(screen.getByLabelText(/Hora/)).toHaveValue('17:00');
  });

  it('no deja guardar lo mismo que ya estaba', async () => {
    // Guardar sin cambio dejaría `plazoDiasHabiles` en null —el vencimiento
    // pasaría a ser «fijado a mano»— sin que nadie hubiera cambiado nada.
    pintar(estado());
    await abrir();

    expect(screen.getByRole('button', { name: /Guardar el vencimiento/ })).toBeDisabled();
  });

  it('avisa cuando la fecha elegida ya pasó, porque eso habilita el cierre', async () => {
    pintar(estado());
    await abrir();

    const fecha = screen.getByLabelText(/Fecha/);
    await userEvent.clear(fecha);
    await userEvent.type(fecha, '2020-01-02');

    expect(screen.getByText(/Ese vencimiento ya pasó/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar el vencimiento/ })).toBeEnabled();
  });

  it('manda el instante con el desfase de Bogotá escrito', async () => {
    // En UTC, las 23:59 de Bogotá son ya el día siguiente: dejarlo a la zona
    // del navegador es un plazo mal contado.
    const fijar = vi
      .spyOn(contratacionService, 'fijarPlazoOfertas')
      .mockResolvedValue(estado() as never);
    pintar(estado());
    await abrir();

    const hora = screen.getByLabelText(/Hora/);
    await userEvent.clear(hora);
    await userEvent.type(hora, '10:30');
    await userEvent.click(screen.getByRole('button', { name: /Guardar el vencimiento/ }));

    expect(fijar).toHaveBeenCalledWith('p-1', '2026-10-15T10:30:00-05:00');
  });

  it('cancelar lo cierra sin tocar nada', async () => {
    const fijar = vi.spyOn(contratacionService, 'fijarPlazoOfertas');
    pintar(estado());
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(screen.queryByLabelText(/Hora/)).toBeNull();
    expect(fijar).not.toHaveBeenCalled();
  });

  it('cerrada la recepción ya no se ofrece: mover el plazo cambiaría la regla aplicada', async () => {
    pintar(
      estado({
        listaPublicada: true,
        recepcion: recepcion({ estado: 'CERRADA', vencido: true, cerradaAt: '2026-10-15T22:00:00Z' }),
      }),
    );

    expect(await screen.findByText(/Lista de oferentes publicada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vencimiento/ })).toBeNull();
  });
});
