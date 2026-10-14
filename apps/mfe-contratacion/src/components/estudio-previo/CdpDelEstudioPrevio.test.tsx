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
  rechazado: null,
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
 * La gestión del CDP desde el estudio previo (migración 100): dos caminos
 * —pedirlo o registrar el que ya se tiene— y el aviso de si es obligatorio.
 */
describe('CdpDelEstudioPrevio', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('opcional y sin CDP: ofrece los dos caminos y dice que se pide solo si no', async () => {
    pintar(estado());
    expect(await screen.findByText('Opcional en esta etapa')).toBeTruthy();
    expect(screen.getByText('Solicitar el CDP')).toBeTruthy();
    expect(screen.getByText('Ya tengo el CDP')).toBeTruthy();
    expect(screen.getByText(/se solicita solo cuando se apruebe/)).toBeTruthy();
  });

  it('obligatorio: lo anuncia y le pasa al formulario que no se puede radicar', async () => {
    const onEstado = pintar(estado({ obligatorio: true, permiteRadicar: false, motivo: 'Gestiona el CDP' }));
    expect(await screen.findByText('Obligatorio para enviar a revisión')).toBeTruthy();
    expect(onEstado).toHaveBeenCalledWith(expect.objectContaining({ permiteRadicar: false }));
  });

  it('solicitado: dice que está en trámite y deja retirarlo mientras nadie lo toma', async () => {
    pintar(
      estado({
        cdp: { id: 'c', estado: 'SOLICITADO', origen: 'SOLICITADO_EN_ETAPA_3', valor: 2_000_000, solicitadoPor: 'Laura' },
      }),
    );
    expect(await screen.findByText(/en trámite en la Dirección Financiera/)).toBeTruthy();
    expect(screen.getByText('Retirar')).toBeTruthy();
    expect(screen.queryByText('Solicitar el CDP')).toBeNull();
  });

  it('registrar exige número, valor, rubro, fecha y soporte', async () => {
    pintar(estado());
    fireEvent.click(await screen.findByText('Ya tengo el CDP'));
    const boton = screen.getByText('Registrar el CDP').closest('button')!;
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
