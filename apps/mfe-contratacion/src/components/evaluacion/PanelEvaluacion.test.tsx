import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelEvaluacion } from './PanelEvaluacion';
import { contratacionService } from '../../services/contratacionService';
import { EstadoEvaluacion, ResultadoEvaluacion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    evaluacion: vi.fn(),
    registrarResultadoEvaluacion: vi.fn(),
    rectificarResultadoEvaluacion: vi.fn(),
    cargarEvidenciaEvaluacion: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  evaluacion: ReturnType<typeof vi.fn>;
  registrarResultadoEvaluacion: ReturnType<typeof vi.fn>;
};

const OFERTAS = [
  {
    id: 'of-1',
    numero: 1,
    nombre: 'Barata SAS',
    identificacion: '900111111-1',
    valorOfertado: 40_000_000,
  },
  {
    id: 'of-2',
    numero: 2,
    nombre: 'Completa SAS',
    identificacion: '900222222-2',
    valorOfertado: 48_000_000,
  },
];

const resultado = (parcial: Partial<ResultadoEvaluacion> = {}): ResultadoEvaluacion => ({
  id: 'r-1',
  estado: 'VIGENTE',
  ganadora: OFERTAS[1],
  puntajeObtenido: 92,
  puntajeMaximo: 100,
  valorEvaluado: 48_000_000,
  justificacion: 'Cumplió los habilitantes y obtuvo el mayor puntaje técnico del comparativo.',
  informe: { id: 'd-1', nombre: 'informe-evaluacion.pdf', archivoUrl: '/documentos/d-1' },
  registradoPor: 'Evaluadora jurídica',
  registradoAt: '2026-08-19T15:00:00.000Z',
  rectificadoPor: null,
  rectificadoAt: null,
  motivoRectificacion: null,
  evidencias: [],
  ...parcial,
});

const estado = (parcial: Partial<EstadoEvaluacion> = {}): EstadoEvaluacion => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'ABREVIADA_MENOR_CUANTIA',
  modalidadNombre: 'Selección Abreviada de Menor Cuantía',
  recepcionCerrada: true,
  comiteDesignado: true,
  misDimensiones: [],
  esMiembroDelComite: false,
  puedeRegistrar: false,
  ofertas: OFERTAS,
  resultado: null,
  rectificados: [],
  ...parcial,
});

/**
 * La evaluación se hace por fuera (EFDS-1157): esta pantalla recibe la decisión
 * del comité, no la produce. Lo que no puede hacer es dejar a alguien mirando
 * un panel que no explica qué falta para registrar, quién puede hacerlo, ni de
 * dónde salió el resultado que se ve.
 */
describe('PanelEvaluacion · actividad 6.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra la ganadora con su puntaje, su justificación y el informe', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ resultado: resultado() }));
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText(/Ganadora: Completa SAS/i)).toBeInTheDocument();
    expect(screen.getByText(/Puntaje 92 de 100/i)).toBeInTheDocument();
    expect(screen.getByText(/mayor puntaje técnico del comparativo/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /informe-evaluacion.pdf/i })).toHaveAttribute(
      'href',
      'https://gateway/documentos/d-1',
    );
  });

  it('dice que la modalidad no puntúa en vez de mostrar un puntaje vacío', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({ resultado: resultado({ puntajeObtenido: null, puntajeMaximo: null }) }),
    );
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText(/La modalidad no puntúa/i)).toBeInTheDocument();
  });

  it('explica que falta el comité en vez de dejar el panel vacío', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ comiteDesignado: false }));
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText(/Pendiente del paso 6.2/i)).toBeInTheDocument();
  });

  it('quien no integra el comité consulta pero no registra', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText('Barata SAS', { exact: false })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Registrar el resultado/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/no la registras/i)).toBeInTheDocument();
  });

  it('el miembro del comité registra el resultado con el informe adjunto', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({ esMiembroDelComite: true, misDimensiones: ['JURIDICO'], puedeRegistrar: true }),
    );
    servicio.registrarResultadoEvaluacion.mockResolvedValue(
      estado({ esMiembroDelComite: true, misDimensiones: ['JURIDICO'], resultado: resultado() }),
    );

    render(<PanelEvaluacion procesoId="p1" />);
    await userEvent.click(await screen.findByRole('button', { name: /Registrar el resultado/i }));

    await userEvent.selectOptions(screen.getByLabelText(/Oferta ganadora/i), 'of-2');
    await userEvent.type(
      screen.getByLabelText(/Por qué esa oferta/i),
      'Obtuvo el mayor puntaje del cuadro comparativo del comité.',
    );
    await userEvent.upload(
      screen.getByLabelText(/Informe de evaluación del comité/i),
      new File(['x'], 'informe.pdf', { type: 'application/pdf' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /^Registrar resultado$/i }));

    await waitFor(() => expect(servicio.registrarResultadoEvaluacion).toHaveBeenCalled());
    const [, datos] = servicio.registrarResultadoEvaluacion.mock.calls[0];
    expect(datos.oferenteId).toBe('of-2');
    // En blanco no es cero: sin puntaje digitado no se reporta ninguno.
    expect(datos.puntajeObtenido).toBeUndefined();
    expect(datos.puntajeMaximo).toBeUndefined();
  });

  it('los resultados rectificados quedan a la vista con su motivo', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({
        rectificados: [
          resultado({
            id: 'r-0',
            estado: 'RECTIFICADO',
            ganadora: OFERTAS[0],
            rectificadoPor: 'Evaluador técnico',
            rectificadoAt: '2026-08-18T15:00:00.000Z',
            motivoRectificacion: 'El cuadro comparativo traía un error aritmético',
          }),
        ],
      }),
    );
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText('Resultados rectificados')).toBeInTheDocument();
    expect(screen.getByText(/error aritmético/i)).toBeInTheDocument();
  });

  it('no muestra las ofertas cuando la modalidad no evalúa', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({
        aplica: false,
        motivoNoAplica: 'La contratación directa no evalúa ofertas en competencia',
      }),
    );
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText(/no evalúa ofertas en competencia/i)).toBeInTheDocument();
    expect(screen.queryByText('Barata SAS', { exact: false })).not.toBeInTheDocument();
  });
});
