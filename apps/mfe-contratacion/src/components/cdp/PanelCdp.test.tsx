import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { frenteAlEstimado, PanelCdp } from './PanelCdp';
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
  valorEstimado: number | null = null,
) => {
  vi.spyOn(contratacionService, 'respaldoCdp').mockResolvedValue(estadoRespaldo as never);
  vi.spyOn(contratacionService, 'participacion').mockResolvedValue({
    financiera: null,
    puedeTomarFinanciera: false,
    ...participacion,
  } as never);
  render(<PanelCdp numeral={numeral} procesoId="p-1" valorEstimado={valorEstimado} />);
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
    expect(screen.queryByRole('button', { name: /Expedir el CDP/ })).toBeNull();
  });

  it('tomada, muestra el formulario de expedición', async () => {
    pintar(
      respaldo({ puedeGestionar: true }),
      { financiera: financiera({ esMio: true }) },
      '4.2',
    );

    expect(
      await screen.findByRole('button', { name: /Expedir el CDP/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hacerme cargo/ })).toBeNull();
  });
});

/**
 * Desde la 096 la 4.2 recoge lo que eran la 4.3 y la 4.4: rubro, certificado y
 * soporte en un solo formulario, con una confirmación que dice antes de
 * expedir si el valor queda por encima o por debajo del estimado.
 */
describe('PanelCdp · 4.2, expedir en una sola pantalla', () => {
  beforeEach(() => vi.restoreAllMocks());

  const tomada = () =>
    pintar(
      respaldo({ puedeGestionar: true }),
      { financiera: financiera({ esMio: true }) },
      '4.2',
      2_000_000,
    );

  const diligenciar = async (valor: string) => {
    fireEvent.change(await screen.findByLabelText('Rubro presupuestal'), {
      target: { value: 'A-02-02-02-008' },
    });
    fireEvent.change(screen.getByLabelText('Número del CDP'), { target: { value: 'CDP-12' } });
    fireEvent.change(screen.getByLabelText('Valor certificado'), { target: { value: valor } });
  };

  const adjuntar = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['%PDF'], 'cdp.pdf', { type: 'application/pdf' })] },
    });
  };

  it('no deja expedir sin el soporte', async () => {
    tomada();
    await diligenciar('2000000');

    expect(screen.getByRole('button', { name: /Expedir el CDP/ })).toBeDisabled();
    adjuntar();
    expect(screen.getByRole('button', { name: /Expedir el CDP/ })).toBeEnabled();
  });

  it('avisa que el valor queda por debajo antes de confirmar', async () => {
    tomada();
    await diligenciar('1500000');

    expect(screen.getByText('No coincide con el valor estimado')).toBeInTheDocument();
    expect(screen.getByText(/Queda .* por debajo/)).toBeInTheDocument();
  });

  it('avisa que el valor queda por encima antes de confirmar', async () => {
    tomada();
    await diligenciar('2500000');

    expect(screen.getByText(/Queda .* por encima/)).toBeInTheDocument();
  });

  it('pide confirmación y no expide si se cancela', async () => {
    const expedir = vi
      .spyOn(contratacionService, 'expedirCdpConSoporte')
      .mockResolvedValue({} as never);
    tomada();
    await diligenciar('1500000');
    adjuntar();

    fireEvent.click(screen.getByRole('button', { name: /Expedir el CDP/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('El valor no coincide con el estimado del proceso')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(expedir).not.toHaveBeenCalled();
  });

  it('al confirmar, expide con el soporte en una sola llamada', async () => {
    const expedir = vi
      .spyOn(contratacionService, 'expedirCdpConSoporte')
      .mockResolvedValue({} as never);
    tomada();
    await diligenciar('2000000');
    adjuntar();

    fireEvent.click(screen.getByRole('button', { name: /Expedir el CDP/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: /Expedir el CDP/ }));

    await vi.waitFor(() => expect(expedir).toHaveBeenCalled());
    const [procesoId, datos, archivo] = expedir.mock.calls[0];
    expect(procesoId).toBe('p-1');
    expect(datos).toMatchObject({ rubro: 'A-02-02-02-008', numero: 'CDP-12', valor: 2_000_000 });
    expect((archivo as File).name).toBe('cdp.pdf');
  });
});

describe('frenteAlEstimado', () => {
  it('sin estimado no dice nada', () => {
    expect(frenteAlEstimado(1_000, null)).toBeNull();
  });

  it('igual al estimado, cubre', () => {
    expect(frenteAlEstimado(1_000, 1_000)?.tono).toBe('ok');
  });

  it('por debajo y por encima avisan, con la diferencia', () => {
    expect(frenteAlEstimado(800, 1_000)).toMatchObject({ tono: 'aviso' });
    expect(frenteAlEstimado(800, 1_000)?.texto).toMatch(/por debajo/);
    expect(frenteAlEstimado(1_200, 1_000)?.texto).toMatch(/por encima/);
  });
});
