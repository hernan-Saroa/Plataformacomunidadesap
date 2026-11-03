import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CdpDelEstudioPrevio } from './CdpDelEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  obligatorio: false,
  cdp: null,
  permiteRadicar: true,
  motivo: null,
  puedeGestionar: true,
  ...cambios,
});

const pintar = (e: unknown, onEstado = vi.fn()) => {
  vi.spyOn(contratacionService, 'cdpDelEstudioPrevio').mockResolvedValue(e as never);
  render(<CdpDelEstudioPrevio procesoId="p-1" valorEstimado={2_000_000} onEstado={onEstado} />);
  return onEstado;
};

/**
 * El CDP desde el estudio previo (migraciones 100 y 103): desde la 103 se
 * tramita por fuera, así que aquí solo se carga, con el aviso de si es
 * obligatorio.
 */
describe('CdpDelEstudioPrevio', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('opcional y sin CDP: solo ofrece cargarlo, y dice que si no se carga en la etapa 4', async () => {
    pintar(estado());
    expect(await screen.findByText('Opcional en esta etapa')).toBeTruthy();
    expect(screen.getByText('Cargar el CDP')).toBeTruthy();
    expect(screen.queryByText('Solicitar el CDP')).toBeNull();
    expect(screen.getByText(/lo cargas en la etapa 4/)).toBeTruthy();
  });

  it('obligatorio: lo anuncia y le pasa al formulario que no se puede radicar', async () => {
    const onEstado = pintar(estado({ obligatorio: true, permiteRadicar: false, motivo: 'Gestiona el CDP' }));
    expect(await screen.findByText('Obligatorio para enviar a revisión')).toBeTruthy();
    expect(onEstado).toHaveBeenCalledWith(expect.objectContaining({ permiteRadicar: false }));
  });

  it('una solicitud de antes de la 103: dice que nadie la va a atender y deja retirarla', async () => {
    pintar(
      estado({
        cdp: { id: 'c', estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3', valor: 2_000_000, solicitadoPor: 'Laura' },
      }),
    );
    expect(await screen.findByText('Quedó una solicitud de CDP sin atender')).toBeTruthy();
    expect(screen.getByText('Retirar')).toBeTruthy();
    expect(screen.queryByText('Cargar el CDP')).toBeNull();
  });

  it('cargado: lo muestra y deja corregirlo o retirarlo', async () => {
    pintar(
      estado({
        cdp: {
          id: 'c',
          estado: 'EXPEDIDO',
          origen: 'REGISTRADO_EN_ETAPA_3',
          numero: 'CDP-7',
          valor: 2_000_000,
          rubro: 'A-02',
          fechaExpedicion: '2026-10-01',
          expedidoPor: 'Laura',
        },
      }),
    );
    expect(await screen.findByText('CDP CDP-7 cargado')).toBeTruthy();
    expect(screen.getByText('Corregir los datos')).toBeTruthy();
    expect(screen.getByText('Retirar')).toBeTruthy();
  });

  it('cargar exige número, valor, rubro, fecha y soporte', async () => {
    pintar(estado());
    fireEvent.click(await screen.findByText('Cargar el CDP'));
    const boton = screen.getAllByText('Cargar el CDP').at(-1)!.closest('button')!;
    expect(boton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Número del CDP'), { target: { value: 'CDP-1' } });
    fireEvent.change(screen.getByLabelText('Rubro presupuestal'), { target: { value: 'A-02' } });
    // Sin el certificado adjunto sigue apagado.
    expect(boton.disabled).toBe(true);
  });

  it('una modalidad sin CDP no muestra nada', async () => {
    const onEstado = pintar(estado({ aplica: false }));
    await vi.waitFor(() => expect(onEstado).toHaveBeenCalled());
    expect(screen.queryByText('CDP del proceso')).toBeNull();
  });
});
