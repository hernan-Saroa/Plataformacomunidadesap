import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PanelCdp } from './PanelCdp';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cdp = (cambios: Record<string, unknown> = {}) => ({
  id: 'cdp-1',
  numero: null,
  valor: 2_000_000,
  rubro: null,
  fechaExpedicion: null,
  vigenciaFiscal: 2026,
  estado: 'SOLICITADO',
  observaciones: null,
  documentoId: null,
  solicitadoPor: 'laura.pineda@esap.edu.co',
  expedidoPor: null,
  ...cambios,
});

const respaldo = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  cdp: cdp(),
  expedido: false,
  soporteAdjunto: false,
  puedeAbrirse: false,
  motivo: null,
  puedeSolicitar: false,
  puedeGestionar: false,
  ...cambios,
});

const financiera = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Marta Ruiz',
  usuarioNombre: 'marta.ruiz@esap.edu.co',
  asignadoAt: '2026-09-30T14:00:00.000Z',
  esMio: false,
  ...cambios,
});

const pintar = (
  estadoRespaldo: unknown,
  participacion: Record<string, unknown> = {},
  numeral = '4.1',
) => {
  vi.spyOn(contratacionService, 'respaldoCdp').mockResolvedValue(estadoRespaldo as never);
  vi.spyOn(contratacionService, 'participacion').mockResolvedValue({
    financiera: null,
    puedeTomarFinanciera: false,
    ...participacion,
  } as never);
  render(<PanelCdp numeral={numeral} procesoId="p-1" />);
};

/**
 * Actividad 4.1 · la solicitud de CDP, dicha como sus pasos: se radica sola,
 * alguien de la Financiera se hace cargo y sigue la verificación en la 4.2.
 */
describe('PanelCdp · 4.1, hacerse cargo de la solicitud', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('sin radicar, los tres pasos esperan a que se cierre la etapa 3', async () => {
    pintar(respaldo({ cdp: null }));

    expect(await screen.findByText(/Se radica sola/)).toBeInTheDocument();
    expect(screen.getAllByText('En espera')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Hacerme cargo/ })).toBeNull();
  });

  it('radicada y sin tomar, a la Financiera le toca hacerse cargo', async () => {
    pintar(respaldo(), { puedeTomarFinanciera: true });

    expect(await screen.findByText('Hecho')).toBeInTheDocument();
    expect(screen.getByText('Te toca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hacerme cargo/ })).toBeInTheDocument();
  });

  it('quien no es de la Financiera ve que espera, sin botón', async () => {
    pintar(respaldo());

    expect(
      await screen.findByText(/alguien de la Dirección Financiera se haga cargo\.$/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hacerme cargo/ })).toBeNull();
  });

  it('tomada, dice quién la lleva y que sigue en la 4.2', async () => {
    pintar(respaldo(), { financiera: financiera() });

    expect(await screen.findByText(/Marta Ruiz · desde el/)).toBeInTheDocument();
    expect(screen.getByText('Sigue en 4.2')).toBeInTheDocument();
  });
});

/**
 * La 4.1 se aprueba sola al radicarse, así que al entrar al proceso se abre la
 * 4.2. Hacerse cargo tiene que estar ahí también, o la Financiera tendría que
 * volver a la 4.1 a buscar el botón.
 */
describe('PanelCdp · 4.2, antes de que alguien la tome', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('ofrece hacerse cargo ahí mismo y deja la verificación en espera', async () => {
    pintar(respaldo({ puedeGestionar: true }), { puedeTomarFinanciera: true }, '4.2');

    expect(await screen.findByRole('button', { name: /Hacerme cargo/ })).toBeInTheDocument();
    expect(screen.getByText('En espera')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar disponibilidad/ })).toBeNull();
  });

  it('tomada, muestra el formulario de verificación', async () => {
    pintar(
      respaldo({ puedeGestionar: true }),
      { financiera: financiera({ esMio: true }) },
      '4.2',
    );

    expect(
      await screen.findByRole('button', { name: /Confirmar disponibilidad/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hacerme cargo/ })).toBeNull();
  });
});
