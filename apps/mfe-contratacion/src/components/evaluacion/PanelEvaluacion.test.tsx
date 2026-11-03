import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelEvaluacion } from './PanelEvaluacion';
import { contratacionService } from '../../services/contratacionService';
import { EstadoDeclaratoriaDesierta, EstadoEvaluacion, ResultadoEvaluacion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    evaluacion: vi.fn(),
    declaratoriaDesierta: vi.fn(),
    registrarResultadoEvaluacion: vi.fn(),
    actualizarInformeEvaluacion: vi.fn(),
    cargarEvidenciaEvaluacion: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
    firmaDeActividad: vi.fn().mockResolvedValue({ requiereFirma: false }),
  },
}));

// La declaratoria tiene sus propias pruebas: aquí basta con saber que se abre.
vi.mock('../adjudicacion/PanelDesierta', () => ({
  PanelDesierta: () => <div>Formulario de la declaratoria desierta</div>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  evaluacion: ReturnType<typeof vi.fn>;
  declaratoriaDesierta: ReturnType<typeof vi.fn>;
  registrarResultadoEvaluacion: ReturnType<typeof vi.fn>;
  actualizarInformeEvaluacion: ReturnType<typeof vi.fn>;
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

/** Un informe preliminar como los de la 120: sin ganadora ni puntajes. */
const resultado = (parcial: Partial<ResultadoEvaluacion> = {}): ResultadoEvaluacion => ({
  id: 'r-1',
  estado: 'VIGENTE',
  ganadora: null,
  puntajeObtenido: null,
  puntajeMaximo: null,
  valorEvaluado: null,
  justificacion: null,
  informe: { id: 'd-1', nombre: 'Evaluación jurídica', archivoUrl: '/documentos/d-1' },
  registradoPor: 'Evaluadora jurídica',
  registradoAt: '2026-08-19T15:00:00.000Z',
  rectificadoPor: null,
  rectificadoAt: null,
  motivoRectificacion: null,
  evidencias: [
    {
      id: 'e-1',
      descripcion: 'Evaluación jurídica',
      cargadaPor: 'Evaluadora jurídica',
      cargadaAt: '2026-08-19T15:00:00.000Z',
      archivoUrl: '/documentos/d-1',
    },
    {
      id: 'e-2',
      descripcion: 'Evaluación financiera y económica',
      cargadaPor: 'Evaluadora jurídica',
      cargadaAt: '2026-08-19T15:00:00.000Z',
      archivoUrl: '/documentos/d-2',
    },
  ],
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
  puedeActualizar: false,
  ofertas: OFERTAS,
  resultado: null,
  rectificados: [],
  ...parcial,
});

const desierta = (parcial: Partial<EstadoDeclaratoriaDesierta> = {}): EstadoDeclaratoriaDesierta => ({
  aplica: true,
  motivoNoAplica: null,
  recepcionCerrada: true,
  ofertasRecibidas: 2,
  causalesPosibles: ['SIN_OFERTAS_HABILITADAS'],
  adjudicado: false,
  ganadoraDelComite: null,
  informePreliminarCargado: false,
  puedeDeclarar: true,
  declaratoria: null,
  revocadas: [],
  ...parcial,
});

const miembro = {
  misDimensiones: ['JURIDICO' as const],
  esMiembroDelComite: true,
};

/**
 * La evaluación de la 6.3 es preliminar (EFDS-1157): el comité carga su
 * informe consolidado, en uno o varios archivos, sin puntajes ni ganadora. La
 * pantalla tiene que dejarlo cargar, volver a cargar con historial y, si no
 * hubo ofertas o ninguna cumple, declarar desierto el proceso.
 */
describe('PanelEvaluacion · actividad 6.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.declaratoriaDesierta.mockResolvedValue(desierta());
  });

  it('no pide ganadora ni puntajes al cargar el informe (QA, EFDS-1157)', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ ...miembro, puedeRegistrar: true }));
    render(<PanelEvaluacion procesoId="p-1" />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Cargar el informe de evaluación preliminar/i }),
    );

    expect(screen.queryByLabelText(/Oferta ganadora/i)).toBeNull();
    expect(screen.queryByLabelText(/Puntaje/i)).toBeNull();
    expect(screen.getByLabelText('Archivos del informe')).toHaveAttribute('multiple');
  });

  it('carga el informe en varios archivos, cada uno con su dimensión', async () => {
    const usuario = userEvent.setup();
    servicio.evaluacion.mockResolvedValue(estado({ ...miembro, puedeRegistrar: true }));
    servicio.registrarResultadoEvaluacion.mockResolvedValue(estado({ resultado: resultado() }));
    render(<PanelEvaluacion procesoId="p-1" />);

    await usuario.click(
      await screen.findByRole('button', { name: /Cargar el informe de evaluación preliminar/i }),
    );
    const cargar = screen.getByRole('button', { name: 'Cargar informe' });
    expect(cargar).toBeDisabled();

    await usuario.upload(screen.getByLabelText('Archivos del informe'), [
      new File(['j'], 'juridico.pdf', { type: 'application/pdf' }),
      new File(['f'], 'financiero.xlsx'),
    ]);
    await usuario.selectOptions(screen.getByLabelText('De qué es juridico.pdf'), 'JURIDICO');
    await usuario.selectOptions(screen.getByLabelText('De qué es financiero.xlsx'), 'FINANCIERO');
    await usuario.click(cargar);

    await waitFor(() => expect(servicio.registrarResultadoEvaluacion).toHaveBeenCalled());
    const [, datos, archivos] = servicio.registrarResultadoEvaluacion.mock.calls[0];
    expect(datos.dimensiones).toEqual(['JURIDICO', 'FINANCIERO']);
    expect(archivos.map((a: File) => a.name)).toEqual(['juridico.pdf', 'financiero.xlsx']);
  });

  it('muestra el informe vigente con todos sus archivos', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ resultado: resultado() }));
    render(<PanelEvaluacion procesoId="p-1" />);

    expect(await screen.findByText('Informe de evaluación preliminar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Evaluación jurídica/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Evaluación financiera y económica/ })).toBeInTheDocument();
    expect(screen.queryByText(/Ganadora/)).toBeNull();
  });

  it('volver a cargar el informe pide motivo', async () => {
    const usuario = userEvent.setup();
    servicio.evaluacion.mockResolvedValue(
      estado({ ...miembro, puedeActualizar: true, resultado: resultado() }),
    );
    servicio.actualizarInformeEvaluacion.mockResolvedValue(estado({ resultado: resultado() }));
    render(<PanelEvaluacion procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Volver a cargar el informe/i }));
    await usuario.upload(
      screen.getByLabelText('Archivos del informe'),
      new File(['c'], 'informe-corregido.pdf', { type: 'application/pdf' }),
    );
    const enviar = screen.getByRole('button', { name: 'Volver a cargar' });
    expect(enviar).toBeDisabled();

    await usuario.type(
      screen.getByLabelText(/Por qué se vuelve a cargar/i),
      'Faltaba la verificación financiera',
    );
    await usuario.click(enviar);

    await waitFor(() => expect(servicio.actualizarInformeEvaluacion).toHaveBeenCalled());
    expect(servicio.actualizarInformeEvaluacion.mock.calls[0][1].motivo).toBe(
      'Faltaba la verificación financiera',
    );
  });

  it('las versiones anteriores quedan a la vista con quién, cuándo y por qué', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({
        resultado: resultado({ id: 'r-2' }),
        rectificados: [
          resultado({
            estado: 'RECTIFICADO',
            rectificadoPor: 'Evaluador técnico',
            rectificadoAt: '2026-08-20T15:00:00.000Z',
            motivoRectificacion: 'Faltaba la verificación financiera',
          }),
        ],
      }),
    );
    render(<PanelEvaluacion procesoId="p-1" />);

    expect(await screen.findByText('Versiones anteriores del informe')).toBeInTheDocument();
    expect(screen.getByText(/Reemplazado por Evaluador técnico/)).toBeInTheDocument();
    expect(screen.getByText(/Faltaba la verificación financiera/)).toBeInTheDocument();
  });

  it('desde la 6.3 se declara desierto el proceso (QA, EFDS-1157)', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    render(<PanelEvaluacion procesoId="p-1" />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Declarar desierto el proceso/i }),
    );

    expect(screen.getByText('Formulario de la declaratoria desierta')).toBeInTheDocument();
  });

  it('no ofrece declarar desierto con el proceso adjudicado', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    servicio.declaratoriaDesierta.mockResolvedValue(
      desierta({ adjudicado: true, puedeDeclarar: false }),
    );
    render(<PanelEvaluacion procesoId="p-1" />);

    await screen.findByText('Evaluación de las ofertas');
    expect(screen.queryByRole('button', { name: /Declarar desierto/i })).toBeNull();
  });

  it('explica que falta el comité en vez de dejar el panel vacío', async () => {
    servicio.evaluacion.mockResolvedValue(estado({ comiteDesignado: false }));
    render(<PanelEvaluacion procesoId="p-1" />);

    expect(await screen.findByText(/No hay comité evaluador designado/)).toBeInTheDocument();
  });

  it('quien no integra el comité consulta pero no carga', async () => {
    servicio.evaluacion.mockResolvedValue(estado());
    render(<PanelEvaluacion procesoId="p-1" />);

    expect(await screen.findByText(/no cargas el informe/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cargar el informe/i })).toBeNull();
  });

  it('no muestra las ofertas cuando la modalidad no evalúa', async () => {
    servicio.evaluacion.mockResolvedValue(
      estado({ aplica: false, motivoNoAplica: 'La contratación directa no evalúa ofertas.' }),
    );
    render(<PanelEvaluacion procesoId="p-1" />);

    expect(await screen.findByText(/La contratación directa no evalúa ofertas/)).toBeInTheDocument();
    expect(screen.queryByText('Barata SAS')).toBeNull();
  });
});
