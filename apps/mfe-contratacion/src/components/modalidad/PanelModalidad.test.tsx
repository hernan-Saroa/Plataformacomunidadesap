import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelModalidad } from './PanelModalidad';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MODALIDADES = [
  { codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía', orden: 90 },
  { codigo: 'LICITACION_PUBLICA', nombre: 'Licitación Pública', orden: 10 },
];

const estado = (cambios: Record<string, unknown> = {}) => ({
  modalidad: 'MINIMA_CUANTIA',
  modalidadNombre: 'Mínima Cuantía',
  valorEstimado: 45000000,
  estado: 'EN_REVISION',
  puedeCorregir: false,
  puedeDecidir: false,
  abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres.rojas@esap.edu.co' },
  motivoNoDecide: null,
  revisiones: [],
  ...cambios,
});

/**
 * Actividad 3.5 · Definir la modalidad (EFDS-1183).
 *
 * La modalidad se elige al crear el proceso; aquí se ratifica. Mientras fue el
 * panel genérico de constancia se daba por definida subiendo un papel, sin que
 * nadie hubiera mirado si era la que correspondía a la cuantía.
 */
describe('PanelModalidad · ratificar la modalidad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'modalidades').mockResolvedValue(MODALIDADES as never);
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'modalidadDelProceso').mockResolvedValue(datos as never);
    render(<PanelModalidad procesoId="p-1" />);
  };

  it('enseña la modalidad elegida y la cuantía contra la que se comprueba', async () => {
    pintar(estado());

    expect(await screen.findByText('Mínima Cuantía')).toBeInTheDocument();
    expect(screen.getByText(/Valor estimado/)).toBeInTheDocument();
  });

  it('al abogado le ofrece ratificar o devolver', async () => {
    pintar(estado({ puedeDecidir: true }));

    expect(await screen.findByRole('button', { name: /Ratificar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver para corregir/ })).toBeInTheDocument();
  });

  it('a quien no le toca decidir le dice de quién es', async () => {
    pintar(estado({ motivoNoDecide: 'NO_ES_TUYO' }));

    expect(await screen.findByText(/La revisa Andrés Rojas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ratificar/ })).toBeNull();
  });

  it('devolver exige decir qué modalidad corresponde', async () => {
    // Sin decirlo el área repetiría la misma elección y el ciclo no acabaría.
    pintar(estado({ puedeDecidir: true }));

    await userEvent.click(await screen.findByRole('button', { name: /Devolver para corregir/ }));
    expect(screen.getByRole('button', { name: /^Devolver$/ })).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Qué modalidad corresponde/),
      'Por la cuantía corresponde licitación pública.',
    );
    expect(screen.getByRole('button', { name: /^Devolver$/ })).toBeEnabled();
  });

  it('devuelta, el área ve el motivo y puede corregirla', async () => {
    pintar(
      estado({
        estado: 'DEVUELTO',
        puedeCorregir: true,
        revisiones: [
          {
            decision: 'DEVUELTO',
            observaciones: 'Por la cuantía corresponde licitación pública.',
            revisadoPor: 'andres.rojas@esap.edu.co',
            createdAt: '2026-09-09T15:00:00.000Z',
          },
        ],
      }),
    );

    expect(await screen.findByText(/El abogado la devolvió/)).toBeInTheDocument();
    expect(screen.getAllByText(/corresponde licitación pública/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Corregir la modalidad/ })).toBeInTheDocument();
  });

  it('ratificada, ya no se cambia', async () => {
    // Cambiarla después alteraría qué actividades recorre un proceso que ya
    // avanzó por otras.
    pintar(estado({ estado: 'APROBADO', puedeCorregir: false, puedeDecidir: false }));

    expect(await screen.findByText(/Ratificada por el abogado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Corregir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ratificar/ })).toBeNull();
  });
});
