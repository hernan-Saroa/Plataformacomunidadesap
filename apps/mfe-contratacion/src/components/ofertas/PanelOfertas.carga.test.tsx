import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** La parte se «sube» a mitad y luego entera, para ver la barra moverse. */
let soltarParte: (() => void) | null = null;
vi.mock('../../services/contratacionService', async (original) => {
  const real: any = await original();
  return {
    ...real,
    subirParte: vi.fn(
      (_ruta: string, trozo: Blob, onEnviado: (b: number) => void) =>
        new Promise<void>((resolve) => {
          onEnviado(trozo.size / 2);
          soltarParte = () => {
            onEnviado(trozo.size);
            resolve();
          };
        }),
    ),
  };
});

import { PanelOfertas } from './PanelOfertas';
import { contratacionService } from '../../services/contratacionService';

const MB = 1024 * 1024;

const estado = {
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  etapa: 6,
  abierto: true,
  plazoParametrizado: true,
  plazoConfirmado: true,
  recepcion: {
    id: 'r-1',
    estado: 'ABIERTA',
    vencimiento: '2026-10-15T17:00:00.000-05:00',
    vencimientoDia: '2026-10-15',
    plazoDiasHabiles: 10,
    vencido: false,
    diasHabilesRestantes: 8,
    estadoPlazo: 'VIGENTE',
    cerradaAt: null,
    cerradaPor: null,
  },
  puedeRegistrar: true,
  puedeCorregirVencimiento: false,
  puedeCerrar: false,
  audienciaRiesgos: { cumplido: true, motivo: null },
  listaPublicada: false,
  prorrogas: [],
  oferentes: [],
};

describe('PanelOfertas · soporte por partes con barra de carga (BUG-004)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    soltarParte = null;
  });

  it('muestra cuánto lleva, no deja registrar hasta que termina y registra con el id de la carga', async () => {
    vi.spyOn(contratacionService, 'ofertas').mockResolvedValue(estado as never);
    vi.spyOn(contratacionService, 'iniciarCarga').mockResolvedValue({ id: 'c-1', partes: 1, tamanoParte: 5 * MB });
    vi.spyOn(contratacionService, 'completarCarga').mockResolvedValue({
      id: 'c-1',
      nombre: 'oferta.zip',
      tamano: 4 * MB,
      archivos: 3,
    });
    const registrar = vi.spyOn(contratacionService, 'registrarOferente').mockResolvedValue(estado as never);

    const vista = render(<PanelOfertas procesoId="p-1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Registrar una oferta/ }));

    await userEvent.type(screen.getByLabelText(/Nombre o razón social/), 'Empresa 4');
    await userEvent.type(screen.getByLabelText(/NIT con dígito/), '800197268-4');
    await userEvent.type(screen.getByLabelText(/Fecha y hora de radicación/), '2026-10-10T09:30');

    const input = vista.container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File([new Uint8Array(4 * MB)], 'oferta.zip', { type: 'application/zip' }));

    // A mitad: la barra dice cuánto lleva y el botón espera.
    const barra = await screen.findByRole('progressbar');
    await waitFor(() => expect(barra).toHaveAttribute('aria-valuenow', '50'));
    expect(screen.getByText(/Subiendo 2 MB de 4 MB · 50 %/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Esperando el archivo · 50 %/ })).toBeDisabled();

    soltarParte!();
    expect(await screen.findByText(/Archivo cargado · 4 MB · 3 documentos en el \.zip/)).toBeInTheDocument();

    const boton = screen.getByRole('button', { name: /^Registrar oferta$/ });
    expect(boton).toBeEnabled();
    await userEvent.click(boton);

    await waitFor(() => expect(registrar).toHaveBeenCalled());
    expect(registrar.mock.calls[0][2]).toEqual({ cargaId: 'c-1' });
  });
});
