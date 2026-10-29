import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { frenteAlEstimado, PanelCdp } from './PanelCdp';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cdp = (cambios: Record<string, unknown> = {}) => ({
  id: 'cdp-1',
  numero: 'CDP-12',
  valor: 2_000_000,
  rubro: 'A-02',
  fechaExpedicion: '2026-10-05',
  vigenciaFiscal: 2026,
  estado: 'EXPEDIDO',
  observaciones: null,
  documentoId: 'doc-1',
  solicitadoPor: 'ana.area@esap.edu.co',
  expedidoPor: 'ana.area@esap.edu.co',
  origen: 'ETAPA_4',
  ...cambios,
});

const respaldo = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  cdp: null,
  expedido: false,
  soporteAdjunto: false,
  puedeAbrirse: false,
  motivo: 'El proceso no tiene CDP cargado',
  puedeCargar: true,
  ...cambios,
});

const pintar = (estadoRespaldo: unknown, valorEstimado: number | null = 2_000_000) => {
  vi.spyOn(contratacionService, 'respaldoCdp').mockResolvedValue(estadoRespaldo as never);
  render(<PanelCdp numeral="4.2" procesoId="p-1" valorEstimado={valorEstimado} />);
};

/**
 * Desde la 103 el CDP se tramita por fuera y el área lo carga en la 4.2: rubro,
 * certificado y soporte en un solo formulario, con una confirmación que dice
 * antes de cargar si el valor queda por encima o por debajo del estimado.
 */
describe('PanelCdp · cargar el CDP', () => {
  beforeEach(() => vi.restoreAllMocks());

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

  it('no ofrece solicitarlo: dice que se tramita por fuera', async () => {
    pintar(respaldo());

    expect(await screen.findByText(/se solicita y se expide por fuera del aplicativo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Solicitar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Hacerme cargo/ })).toBeNull();
  });

  it('quien no puede cargarlo ve que le toca al área', async () => {
    pintar(respaldo({ puedeCargar: false }));

    expect(await screen.findByText(/Este paso lo realiza el área solicitante/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Número del CDP')).toBeNull();
  });

  it('no deja cargar sin el soporte', async () => {
    pintar(respaldo());
    await diligenciar('2000000');

    expect(screen.getByRole('button', { name: /Cargar el CDP/ })).toBeDisabled();
    adjuntar();
    expect(screen.getByRole('button', { name: /Cargar el CDP/ })).toBeEnabled();
  });

  it('avisa que el valor queda por debajo antes de confirmar', async () => {
    pintar(respaldo());
    await diligenciar('1500000');

    expect(screen.getByText('No coincide con el valor estimado')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000 queda .* por debajo/)).toBeInTheDocument();
  });

  it('no compara mientras el valor se está tecleando', async () => {
    pintar(respaldo());
    await diligenciar('1');
    const valor = screen.getByLabelText('Valor certificado');

    fireEvent.focus(valor);
    fireEvent.change(valor, { target: { value: '15' } });
    expect(screen.queryByText('No coincide con el valor estimado')).toBeNull();

    fireEvent.blur(valor);
    expect(screen.getByText(/\$\s15 queda .* por debajo/)).toBeInTheDocument();
  });

  it('pide confirmación y no carga si se cancela', async () => {
    const cargar = vi.spyOn(contratacionService, 'cargarCdp').mockResolvedValue({} as never);
    pintar(respaldo());
    await diligenciar('1500000');
    adjuntar();

    fireEvent.click(screen.getByRole('button', { name: /Cargar el CDP/ }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('El valor no coincide con el estimado del proceso')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(cargar).not.toHaveBeenCalled();
  });

  it('al confirmar, carga con el soporte en una sola llamada', async () => {
    const cargar = vi.spyOn(contratacionService, 'cargarCdp').mockResolvedValue({} as never);
    pintar(respaldo());
    await diligenciar('2000000');
    adjuntar();

    fireEvent.click(screen.getByRole('button', { name: /Cargar el CDP/ }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: /Cargar el CDP/ }));

    await vi.waitFor(() => expect(cargar).toHaveBeenCalled());
    const [procesoId, datos, archivo] = cargar.mock.calls[0];
    expect(procesoId).toBe('p-1');
    expect(datos).toMatchObject({ rubro: 'A-02-02-02-008', numero: 'CDP-12', valor: 2_000_000 });
    expect((archivo as File).name).toBe('cdp.pdf');
  });

  it('una solicitud de antes de la 103 se completa cargando el certificado', async () => {
    pintar(respaldo({ cdp: cdp({ estado: 'SOLICITADO', numero: null, rubro: 'A-01' }) }));

    expect(await screen.findByText('Quedó una solicitud de antes')).toBeInTheDocument();
    expect(screen.getByLabelText('Rubro presupuestal')).toHaveValue('A-01');
  });
});

describe('PanelCdp · ya cargado', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra el certificado y quién lo cargó', async () => {
    pintar(respaldo({ cdp: cdp(), expedido: true, soporteAdjunto: true, puedeAbrirse: true }));

    expect(await screen.findByText('CDP CDP-12 cargado')).toBeInTheDocument();
    expect(screen.getByText(/Cargado por ana\.area@esap\.edu\.co/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Número del CDP')).toBeNull();
  });

  it('dice si lo cargó el área desde el estudio previo', async () => {
    pintar(
      respaldo({
        cdp: cdp({ origen: 'REGISTRADO_EN_ETAPA_3' }),
        expedido: true,
        soporteAdjunto: true,
        puedeAbrirse: true,
      }),
    );

    expect(await screen.findByText(/desde el estudio previo/)).toBeInTheDocument();
  });

  it('sin soporte, deja adjuntarlo a quien puede cargar', async () => {
    pintar(respaldo({ cdp: cdp({ documentoId: null }), expedido: true, puedeAbrirse: true }));

    expect(await screen.findByRole('button', { name: /Adjuntar soporte/ })).toBeInTheDocument();
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
