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
    expect(screen.getByText(/los cargas en la etapa 4/)).toBeTruthy();
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

  describe('con uno o más CDP (152)', () => {
    const cargado = (id: string, numero: string, valor: number) => ({
      id,
      estado: 'EXPEDIDO',
      origen: 'REGISTRADO_EN_ETAPA_3',
      numero,
      valor,
      rubro: 'A-02',
      fechaExpedicion: '2026-10-01',
      expedidoPor: 'Laura',
    });

    it('con uno cargado ofrece cargar otro', async () => {
      pintar(estado({ cdps: [cargado('c1', 'CDP-7', 1_000_000)], valorTotal: 1_000_000 }));
      expect(await screen.findByText('Cargar otro CDP')).toBeTruthy();
    });

    it('lista cada CDP con su corrección y retiro, y dice cuánto suman', async () => {
      pintar(
        estado({
          cdps: [cargado('c1', 'CDP-7', 1_000_000), cargado('c2', 'CDP-8', 500_000)],
          valorTotal: 1_500_000,
        }),
      );
      expect(await screen.findByText('CDP CDP-7 cargado')).toBeTruthy();
      expect(screen.getByText('CDP CDP-8 cargado')).toBeTruthy();
      expect(screen.getAllByText('Corregir los datos')).toHaveLength(2);
      expect(screen.getAllByText('Retirar')).toHaveLength(2);
      expect(screen.getByText(/Los 2 CDP suman \$\s1\.500\.000/)).toBeTruthy();
      // Por debajo del estimado ($2.000.000), con la suma y no con cada uno.
      expect(screen.getByText(/queda \$\s500\.000 por debajo/)).toBeTruthy();
    });

    it('al cargar otro, sugiere lo que falta para el estimado y no manda cdpId', async () => {
      const registrar = vi
        .spyOn(contratacionService, 'registrarCdpDesdeElEstudioPrevio')
        .mockResolvedValue(estado() as never);
      pintar(estado({ cdps: [cargado('c1', 'CDP-7', 1_500_000)], valorTotal: 1_500_000 }));

      fireEvent.click(await screen.findByText('Cargar otro CDP'));
      expect(screen.getByLabelText('Valor certificado')).toHaveProperty('value', '500000');
      fireEvent.change(screen.getByLabelText('Número del CDP'), { target: { value: 'CDP-9' } });
      fireEvent.change(screen.getByLabelText('Rubro presupuestal'), { target: { value: 'A-03' } });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(['%PDF'], 'cdp.pdf', { type: 'application/pdf' })] } });
      fireEvent.click(screen.getAllByText('Cargar el CDP').at(-1)!.closest('button')!);

      await vi.waitFor(() => expect(registrar).toHaveBeenCalled());
      expect(registrar.mock.calls[0][1]).toMatchObject({ numero: 'CDP-9', valor: 500_000, cdpId: undefined });
    });

    it('al corregir uno, manda su cdpId', async () => {
      const registrar = vi
        .spyOn(contratacionService, 'registrarCdpDesdeElEstudioPrevio')
        .mockResolvedValue(estado() as never);
      pintar(estado({ cdps: [cargado('c1', 'CDP-7', 1_000_000), cargado('c2', 'CDP-8', 500_000)] }));

      fireEvent.click((await screen.findAllByText('Corregir los datos'))[1]);
      expect(screen.getByLabelText('Número del CDP')).toHaveProperty('value', 'CDP-8');
      fireEvent.click(screen.getByText('Guardar la corrección').closest('button')!);

      await vi.waitFor(() => expect(registrar).toHaveBeenCalled());
      expect(registrar.mock.calls[0][1]).toMatchObject({ numero: 'CDP-8', cdpId: 'c2' });
    });
  });

  it('una modalidad sin CDP no muestra nada', async () => {
    const onEstado = pintar(estado({ aplica: false }));
    await vi.waitFor(() => expect(onEstado).toHaveBeenCalled());
    expect(screen.queryByText('CDP del proceso')).toBeNull();
  });
});
