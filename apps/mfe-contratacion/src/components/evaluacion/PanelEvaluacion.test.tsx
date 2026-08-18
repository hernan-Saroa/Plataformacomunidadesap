import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PanelEvaluacion } from './PanelEvaluacion';
import { contratacionService } from '../../services/contratacionService';
import { EstadoEvaluacion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    evaluacion: vi.fn(),
    evaluarOferta: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  evaluacion: ReturnType<typeof vi.fn>;
};

const estado = (parcial: Partial<EstadoEvaluacion> = {}): EstadoEvaluacion => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'ABREVIADA_MENOR_CUANTIA',
  modalidadNombre: 'Selección Abreviada de Menor Cuantía',
  recepcionCerrada: true,
  comiteDesignado: true,
  misDimensiones: [],
  puedeEvaluar: false,
  criteriosSinConfirmar: false,
  puntajeMaximo: 100,
  criterios: [
    {
      id: 'cr-1',
      dimension: 'JURIDICO',
      tipo: 'HABILITANTE',
      nombre: 'Capacidad jurídica',
      descripcion: null,
      puntajeMaximo: null,
      confirmado: true,
    },
  ],
  ofertas: [
    {
      id: 'of-1',
      numero: 1,
      nombre: 'Barata SAS',
      identificacion: '900111111-1',
      valorOfertado: 40000000,
      consolidado: {
        ofertaId: 'of-1',
        estado: 'NO_HABILITADA',
        incumplimientos: [
          {
            criterioId: 'cr-1',
            nombre: 'Capacidad jurídica',
            motivo: 'No acreditó la representación legal',
          },
        ],
        dimensionesPendientes: [],
        puntajePorDimension: { TECNICO: 30 },
        puntajeTotal: 30,
        puntajeMaximo: 100,
      },
      evaluaciones: [],
    },
  ],
  ...parcial,
});

/**
 * Lo que esta pantalla no puede hacer es dejar a alguien mirando una tabla que
 * no explica nada: por qué una oferta quedó fuera, por qué no se puede evaluar
 * todavía, y si lo que se ve es definitivo o descansa en criterios que nadie
 * ha ratificado.
 */
describe('PanelEvaluacion · actividad 6.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('una oferta no habilitada dice qué criterio incumplió y por qué', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText('No habilitada')).toBeInTheDocument();
    expect(
      screen.getByText(/Incumple «Capacidad jurídica»: No acreditó la representación legal/i),
    ).toBeInTheDocument();
  });

  it('explica que falta el comité en vez de dejar el panel vacío', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ comiteDesignado: false }));
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText(/Pendiente del paso 6.2/i)).toBeInTheDocument();
  });

  it('quien no fue designado consulta pero no califica', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText('Barata SAS', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Evaluar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no calificas/i)).toBeInTheDocument();
  });

  it('al evaluador designado le ofrece solo su dimensión', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({ misDimensiones: ['JURIDICO'], puedeEvaluar: true }),
    );
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByRole('button', { name: /Evaluar jurídica/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Evaluar técnica/i })).not.toBeInTheDocument();
  });

  it('advierte cuando los criterios todavía son supuestos del equipo', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ criteriosSinConfirmar: true }));
    render(<PanelEvaluacion procesoId="p1" />);

    expect(await screen.findByText('Criterios sin confirmar')).toBeInTheDocument();
  });

  it('no muestra la tabla cuando la modalidad no evalúa ofertas', async () => {
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
