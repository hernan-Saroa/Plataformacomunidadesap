import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelSuscripcionActa } from './PanelSuscripcionActa';
import { contratacionService } from '../../services/contratacionService';
import { EstadoSuscripcionActa } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    actaSuscrita: vi.fn(),
    registrarActaSuscrita: vi.fn(),
    firmaDeActividad: vi.fn().mockResolvedValue({ requiereFirma: false }),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  actaSuscrita: ReturnType<typeof vi.fn>;
  registrarActaSuscrita: ReturnType<typeof vi.fn>;
};

const estado = (parcial: Partial<EstadoSuscripcionActa> = {}): EstadoSuscripcionActa => ({
  aplica: true,
  puedeRegistrar: true,
  motivoNoPuede: null,
  legalizado: true,
  requiereArl: false,
  suscripcion: null,
  ...parcial,
});

/** La 8.7, separada de la reunión de inicio (migración 089). */
describe('PanelSuscripcionActa · el acta de inicio suscrita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('se titula como la actividad, no como la reunión', async () => {
    servicio.actaSuscrita.mockResolvedValue(estado());
    render(<PanelSuscripcionActa procesoId="p-1" />);

    expect(await screen.findByText('Acta de inicio')).toBeInTheDocument();
    expect(screen.queryByText('Reunión de inicio')).toBeNull();
  });

  it('no pregunta si el contrato la pactó: lo dice la matriz de la modalidad', async () => {
    servicio.actaSuscrita.mockResolvedValue(estado({ aplica: false, puedeRegistrar: false }));
    render(<PanelSuscripcionActa procesoId="p-1" />);

    expect(await screen.findByText('Esta modalidad no suscribe acta de inicio')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Registrar acta de inicio/ })).toBeNull();
  });

  it('registra el acta con su fecha de firma', async () => {
    servicio.actaSuscrita.mockResolvedValue(estado());
    servicio.registrarActaSuscrita.mockResolvedValue(
      estado({
        puedeRegistrar: false,
        suscripcion: {
          fechaSuscripcion: '2026-09-20',
          registradoPor: 'Ana Gestora',
          createdAt: '2026-09-21T14:00:00.000Z',
          documento: { nombre: 'acta.pdf', url: '/hiring/files/a.pdf', mimeType: 'application/pdf' },
        },
      }),
    );
    const { container } = render(<PanelSuscripcionActa procesoId="p-1" />);

    const boton = await screen.findByRole('button', { name: /Registrar acta de inicio/ });
    expect(boton).toBeDisabled();

    const archivo = new File(['%PDF'], 'acta.pdf', { type: 'application/pdf' });
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, archivo);
    await waitFor(() => expect(boton).not.toBeDisabled());
    await userEvent.click(boton);

    await waitFor(() => expect(servicio.registrarActaSuscrita).toHaveBeenCalled());
    const [procesoId, datos, enviado] = servicio.registrarActaSuscrita.mock.calls[0];
    expect(procesoId).toBe('p-1');
    expect(datos.fechaSuscripcion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(enviado).toBe(archivo);
    expect(await screen.findByText(/Suscrita el/)).toBeInTheDocument();
  });

  it('manda a la actividad que falta en vez de apagar el botón sin explicar', async () => {
    servicio.actaSuscrita.mockResolvedValue(
      estado({
        puedeRegistrar: false,
        motivoNoPuede: 'el contrato todavía no tiene supervisor designado',
      }),
    );
    render(<PanelSuscripcionActa procesoId="p-1" />);

    expect(await screen.findByText(/todavía no tiene supervisor designado/)).toBeInTheDocument();
  });
});
