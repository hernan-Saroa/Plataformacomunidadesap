import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelRegistroActividad } from './PanelRegistroActividad';
import { contratacionService } from '../../services/contratacionService';
import { EstadoRegistroActividad } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    registroActividad: vi.fn(),
    registrarActividad: vi.fn(),
    anularRegistroActividad: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  registroActividad: ReturnType<typeof vi.fn>;
  registrarActividad: ReturnType<typeof vi.fn>;
  anularRegistroActividad: ReturnType<typeof vi.fn>;
};

const estado = (parcial: Partial<EstadoRegistroActividad> = {}): EstadoRegistroActividad => ({
  numeral: '5.10',
  etapa: 5,
  exigeSoporte: true,
  exigenciaConfirmada: true,
  notaFuente: 'Campo de sí/no, adjunta soporte.',
  aplica: true,
  motivoNoAplica: null,
  registro: null,
  historial: [],
  ...parcial,
});

const pintar = (numeral = '5.10', nombre = 'Sorteo') =>
  render(
    <PanelRegistroActividad procesoId="p-1" numeral={numeral} nombre={nombre} />,
  );

describe('PanelRegistroActividad · las actividades que se cumplen dejando constancia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.registroActividad.mockResolvedValue(estado());
  });

  it('muestra el numeral, el nombre y lo que dice la matriz', async () => {
    pintar();
    expect(await screen.findByText(/5\.10 · Sorteo/)).toBeInTheDocument();
    expect(screen.getByText(/Campo de sí\/no, adjunta soporte/)).toBeInTheDocument();
  });

  it('dice que la actividad ocurre por fuera de la plataforma', async () => {
    // El criterio que atraviesa el módulo: la pantalla no aparenta que el dato
    // venga de SECOP II.
    pintar();
    expect(await screen.findByText(/por fuera de la plataforma/i)).toBeInTheDocument();
  });

  it('no ofrece registrar cuando la modalidad no adelanta la actividad', async () => {
    servicio.registroActividad.mockResolvedValue(
      estado({ aplica: false, motivoNoAplica: 'La mínima cuantía no hace subasta.' }),
    );
    pintar('6.10', 'Evento de subasta');

    expect(await screen.findByText(/no adelanta la actividad/i)).toBeInTheDocument();
    expect(screen.getByText(/La mínima cuantía no hace subasta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar la actividad/ })).toBeNull();
  });

  it('avisa cuando la exigencia de soporte es criterio del equipo', async () => {
    // Una suposición no se presenta como si viniera de la norma.
    servicio.registroActividad.mockResolvedValue(
      estado({ numeral: '3.3', exigeSoporte: true, exigenciaConfirmada: false }),
    );
    pintar('3.3', 'Radicación en la Dirección de Contratación');

    expect(await screen.findByText(/criterio del equipo/i)).toBeInTheDocument();
  });

  it('no avisa nada cuando la exigencia sí sale de la matriz', async () => {
    pintar();
    await screen.findByText(/5\.10 · Sorteo/);
    expect(screen.queryByText(/criterio del equipo/i)).toBeNull();
  });

  it('no deja registrar sin nota', async () => {
    pintar();
    await screen.findByText(/5\.10 · Sorteo/);
    expect(screen.getByRole('button', { name: /Registrar la actividad/ })).toBeDisabled();
  });

  it('sigue sin dejar registrar con nota pero sin el soporte que la actividad exige', async () => {
    pintar();
    await screen.findByText(/5\.10 · Sorteo/);

    await userEvent.type(
      screen.getByPlaceholderText(/Qué se hizo/),
      'Se sorteó entre los tres oferentes que manifestaron interés.',
    );

    expect(screen.getByRole('button', { name: /Registrar la actividad/ })).toBeDisabled();
  });

  it('deja registrar sin soporte cuando la actividad no lo exige', async () => {
    // La 5.9 es «campo para nota de trazabilidad»: la matriz no pide adjunto.
    servicio.registroActividad.mockResolvedValue(
      estado({ numeral: '5.9', exigeSoporte: false }),
    );
    pintar('5.9', 'Manifestación de interés');
    await screen.findByText(/5\.9 · Manifestación de interés/);

    await userEvent.type(
      screen.getByPlaceholderText(/Qué se hizo/),
      'Dos interesados manifestaron dentro del término del cronograma.',
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Registrar la actividad/ })).toBeEnabled(),
    );
  });

  it('muestra el registro vigente con su nota y quién lo transcribió', async () => {
    servicio.registroActividad.mockResolvedValue(
      estado({
        registro: {
          id: 'r-1',
          fecha: '2026-08-20',
          nota: 'Se sorteó entre los tres oferentes.',
          datos: {},
          registradoPor: 'Ana Gestora',
          registradoAt: '2026-08-21T14:00:00.000Z',
          soporte: { nombre: 'Acta del sorteo', url: '/hiring/documentos/d-1/descargar' },
        },
      }),
    );
    pintar();

    expect(await screen.findByText(/Se sorteó entre los tres oferentes/)).toBeInTheDocument();
    expect(screen.getByText(/Ana Gestora/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver el soporte/ })).toBeInTheDocument();
  });

  it('exige motivo para anular', async () => {
    servicio.registroActividad.mockResolvedValue(
      estado({
        registro: {
          id: 'r-1',
          fecha: '2026-08-20',
          nota: 'Se sorteó entre los tres oferentes.',
          datos: {},
          registradoPor: 'Ana Gestora',
          registradoAt: '2026-08-21T14:00:00.000Z',
          soporte: null,
        },
      }),
    );
    pintar();

    await userEvent.click(await screen.findByRole('button', { name: /Anular y registrar/ }));
    expect(screen.getByRole('button', { name: /Anular el registro/ })).toBeDisabled();

    await userEvent.type(
      screen.getByPlaceholderText(/Por qué se anula/),
      'El acta cargada era la del proceso anterior.',
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Anular el registro/ })).toBeEnabled(),
    );
  });

  it('lista los registros anulados con su motivo', async () => {
    servicio.registroActividad.mockResolvedValue(
      estado({
        historial: [
          {
            fecha: '2026-08-18',
            nota: 'Primer intento del sorteo.',
            anuladoAt: '2026-08-19T10:00:00.000Z',
            anuladoPor: 'Ana Gestora',
            motivoAnulacion: 'Se cargó el acta equivocada.',
          },
        ],
      }),
    );
    pintar();

    expect(await screen.findByText(/Registros anulados/)).toBeInTheDocument();
    expect(screen.getByText(/Se cargó el acta equivocada/)).toBeInTheDocument();
  });
});
