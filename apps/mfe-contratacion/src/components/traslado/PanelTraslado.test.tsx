import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelTraslado } from './PanelTraslado';
import { contratacionService } from '../../services/contratacionService';
import { EstadoSubsanaciones, EstadoTraslado, InformeEvaluacion, Subsanacion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    traslado: vi.fn(),
    subsanaciones: vi.fn(),
    generarInformeTraslado: vi.fn(),
    trasladarInforme: vi.fn(),
    anularInformeTraslado: vi.fn(),
    registrarSubsanacion: vi.fn(),
    responderSubsanacion: vi.fn(),
    cerrarTraslado: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
    firmaDeActividad: vi.fn().mockResolvedValue({ requiereFirma: false }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  traslado: ReturnType<typeof vi.fn>;
  subsanaciones: ReturnType<typeof vi.fn>;
  registrarSubsanacion: ReturnType<typeof vi.fn>;
  responderSubsanacion: ReturnType<typeof vi.fn>;
  cerrarTraslado: ReturnType<typeof vi.fn>;
};

const informe = (parcial: Partial<InformeEvaluacion> = {}): InformeEvaluacion => ({
  id: 'inf-1',
  numero: 1,
  estado: 'TRASLADADO',
  resultadoId: 'r-1',
  resultado: {
    modalidad: 'ABREVIADA_MENOR_CUANTIA',
    resultadoId: 'r-1',
    ganadora: { oferenteId: 'of-2', nombre: 'Completa SAS', identificacion: '900222222-2' },
    puntajeObtenido: 92,
    puntajeMaximo: 100,
    valorEvaluado: 48_000_000,
    justificacion: 'Mayor puntaje técnico del comparativo.',
    informeDocumentoId: 'd-0',
    evidencias: [],
    ofertas: [
      {
        oferenteId: 'of-1',
        numero: 1,
        nombre: 'Barata SAS',
        identificacion: '900111111-1',
        valorOfertado: 40_000_000,
        ganadora: false,
      },
      {
        oferenteId: 'of-2',
        numero: 2,
        nombre: 'Completa SAS',
        identificacion: '900222222-2',
        valorOfertado: 48_000_000,
        ganadora: true,
      },
    ],
  },
  ofertasRecibidas: 2,
  observacionEntidad: null,
  informe: { id: 'd-1', nombre: 'informe-preliminar.pdf', archivoUrl: '/documentos/d-1' },
  evidencia: null,
  generadoPor: 'Gestora',
  generadoAt: '2026-08-20T14:00:00.000Z',
  trasladadoPor: 'Gestora',
  trasladadoAt: '2026-08-20T15:00:00.000Z',
  plazoDiasHabiles: 3,
  venceEl: '2026-08-25',
  diasRestantes: 2,
  estadoPlazo: 'POR_VENCER',
  cerradoPor: null,
  cerradoAt: null,
  anuladoAt: null,
  motivoAnulacion: null,
  ...parcial,
});

const traslado = (parcial: Partial<EstadoTraslado> = {}): EstadoTraslado => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'ABREVIADA_MENOR_CUANTIA',
  modalidadNombre: 'Selección abreviada de menor cuantía',
  plazo: { diasHabiles: 3, fundamento: 'Supuesto del equipo, sin validar', confirmado: false },
  hayResultado: true,
  puedeGenerar: false,
  puedeTrasladar: false,
  informe: informe(),
  anulados: [],
  ...parcial,
});

const escrito = (parcial: Partial<Subsanacion> = {}): Subsanacion => ({
  id: 's-1',
  tipo: 'SUBSANACION',
  oferta: { id: 'of-1', numero: 1, nombre: 'Barata SAS' },
  presentadoPor: 'Barata SAS',
  identificacion: '900111111-1',
  fechaPresentacion: '2026-08-24',
  extemporanea: false,
  asunto: 'Aporta certificación de experiencia',
  contenido: 'Se adjunta la certificación que no se cargó con la oferta.',
  soportes: [{ id: 'd-2', nombre: 'certificacion.pdf', archivoUrl: '/documentos/d-2' }],
  respuesta: null,
  respuestaDocumento: null,
  aceptada: null,
  respondidaPor: null,
  respondidaAt: null,
  registradoPor: 'Gestora',
  registradoAt: '2026-08-24T14:00:00.000Z',
  ...parcial,
});

const subsanaciones = (parcial: Partial<EstadoSubsanaciones> = {}): EstadoSubsanaciones => ({
  aplica: true,
  motivoNoAplica: null,
  trasladado: true,
  informeId: 'inf-1',
  venceEl: '2026-08-25',
  enTermino: true,
  puedeRegistrar: true,
  pendientesDeRespuesta: 1,
  terminoVencido: false,
  puedeCerrar: false,
  requiereRectificacion: false,
  subsanaciones: [escrito()],
  ...parcial,
});

describe('PanelTraslado · actividades 6.4 a 6.6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.traslado.mockResolvedValue(traslado());
    servicio.subsanaciones.mockResolvedValue(subsanaciones());
  });

  it('dice que el informe trasladado es una copia y no cambia si el comité lo vuelve a cargar', async () => {
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() => expect(screen.getByText(/Completa SAS/)).toBeInTheDocument());
    expect(screen.getByText(/si lo vuelve a cargar después, lo trasladado no cambia/i)).toBeInTheDocument();
  });

  it('la 6.4 pide la evidencia del traslado, no generar el informe (QA, EFDS-1157)', async () => {
    servicio.traslado.mockResolvedValue(
      traslado({ informe: null, puedeGenerar: true, puedeTrasladar: true }),
    );
    servicio.subsanaciones.mockResolvedValue(
      subsanaciones({ trasladado: false, venceEl: null, enTermino: false, subsanaciones: [] }),
    );
    render(<PanelTraslado procesoId="p-1" />);

    expect(
      await screen.findByText('Publicación y traslado del informe preliminar'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Generar informe/i })).toBeNull();
    expect(screen.getByText(/Adjuntar la evidencia de la publicación y el traslado/)).toBeInTheDocument();
  });

  it('cuenta las ofertas recibidas, no las habilitadas', async () => {
    render(<PanelTraslado procesoId="p-1" />);

    // La plataforma no calcula habilitación: decirlo aquí sería afirmar algo
    // que el comité decidió por fuera (EFDS-1157).
    await waitFor(() => expect(screen.getByText(/2 ofertas recibidas/i)).toBeInTheDocument());
  });

  it('advierte que el plazo aplicado todavía no lo confirma Contratación', async () => {
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/Término de 3 días hábiles/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/supuesto del equipo/i)).toBeInTheDocument();
  });

  it('explica que no se puede cerrar mientras el término corre', async () => {
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/El término sigue corriendo/i)).toBeInTheDocument(),
    );
    // Cerrar antes le quitaría al oferente el plazo que se le notificó.
    expect(screen.queryByRole('button', { name: /Cerrar el traslado/i })).not.toBeInTheDocument();
  });

  it('cuando el término venció, dice cuántos escritos faltan por responder', async () => {
    servicio.subsanaciones.mockResolvedValue(
      subsanaciones({ enTermino: false, terminoVencido: true, puedeCerrar: false }),
    );

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/Quedan 1 escritos sin responder/i)).toBeInTheDocument(),
    );
  });

  it('deja cerrar cuando el término venció y no queda nada sin responder', async () => {
    servicio.subsanaciones.mockResolvedValue(
      subsanaciones({
        enTermino: false,
        terminoVencido: true,
        puedeCerrar: true,
        pendientesDeRespuesta: 0,
        subsanaciones: [escrito({ respondidaAt: '2026-08-26T14:00:00.000Z', aceptada: true, respuesta: 'Se acepta lo aportado.' })],
      }),
    );

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Cerrar el traslado/i })).toBeInTheDocument(),
    );
  });

  it('marca lo extemporáneo sin llamarlo rechazado', async () => {
    servicio.subsanaciones.mockResolvedValue({
      ...subsanaciones(),
      subsanaciones: [escrito({ extemporanea: true, fechaPresentacion: '2026-08-27' })],
    });

    render(<PanelTraslado procesoId="p-1" />);

    // La etiqueta dice que llegó tarde y nada más: llamarla rechazada daría por
    // tomada una decisión que es de la entidad, no del sistema.
    const etiqueta = await screen.findByText(/Extemporánea/i);
    expect(etiqueta.textContent).not.toMatch(/rechazad/i);
    expect(screen.getByText(/quien decide si se acepta es la entidad/i)).toBeInTheDocument();
  });

  it('avisa que una subsanación aceptada puede obligar al comité a rectificar', async () => {
    servicio.subsanaciones.mockResolvedValue(subsanaciones({ requiereRectificacion: true }));

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/rectificar su resultado en la actividad 6.3/i)).toBeInTheDocument(),
    );
  });

  it('sin resultado del comité remite a la actividad 6.3', async () => {
    servicio.traslado.mockResolvedValue(
      traslado({ hayResultado: false, informe: null, puedeGenerar: false }),
    );
    servicio.subsanaciones.mockResolvedValue(
      subsanaciones({ trasladado: false, venceEl: null, enTermino: false, subsanaciones: [] }),
    );

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/todavía no ha cargado el informe de evaluación preliminar/i)).toBeInTheDocument(),
    );
  });

  it('no ofrece trasladar en una modalidad sin plazo parametrizado', async () => {
    servicio.traslado.mockResolvedValue(traslado({ plazo: null, puedeTrasladar: false }));

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/no tiene plazo de traslado parametrizado/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Trasladar el informe/i })).not.toBeInTheDocument();
  });

  it('en una modalidad que no traslada informe lo dice y no muestra el trámite', async () => {
    servicio.traslado.mockResolvedValue(
      traslado({ aplica: false, motivoNoAplica: 'La contratación directa no evalúa ofertas.' }),
    );

    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/no traslada informe de evaluación/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Subsanaciones y observaciones/)).not.toBeInTheDocument();
  });

  it('avisa antes de guardar que lo que se registra llegará como extemporáneo', async () => {
    const usuario = userEvent.setup();
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() => expect(screen.getByText(/Subsanaciones y observaciones/)).toBeInTheDocument());
    await usuario.click(
      screen.getByRole('button', { name: /Registrar una subsanación u observación/i }),
    );

    const fecha = screen.getByLabelText(/Fecha en que lo presentó/i);
    await usuario.clear(fecha);
    await usuario.type(fecha, '2026-08-30');

    // Se avisa antes de guardar, no después: registrarlo sigue siendo lo
    // correcto, pero el gestor tiene que saber qué está registrando.
    await waitFor(() =>
      expect(screen.getByText(/Se registrará como extemporáneo/i)).toBeInTheDocument(),
    );
  });

  it('registra con proveedor, tipo, fecha, asunto y varios archivos, sin cédula ni transcripción', async () => {
    const usuario = userEvent.setup();
    servicio.registrarSubsanacion.mockResolvedValue(subsanaciones());
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() => expect(screen.getByText(/Subsanaciones y observaciones/)).toBeInTheDocument());
    await usuario.click(
      screen.getByRole('button', { name: /Registrar una subsanación u observación/i }),
    );

    expect(screen.queryByPlaceholderText(/cédula/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Lo que dice el oferente/i)).not.toBeInTheDocument();

    await usuario.selectOptions(screen.getByDisplayValue('Proveedor'), 'of-1');
    await usuario.type(screen.getByPlaceholderText('Asunto'), 'Certificado');
    const carta = new File(['a'], 'carta.pdf', { type: 'application/pdf' });
    const anexo = new File(['b'], 'anexo.pdf', { type: 'application/pdf' });
    await usuario.upload(screen.getByLabelText('Archivos del escrito'), [carta, anexo]);
    await usuario.click(screen.getByRole('button', { name: /^Registrar$/ }));

    await waitFor(() => expect(servicio.registrarSubsanacion).toHaveBeenCalled());
    const [, datos, archivos] = servicio.registrarSubsanacion.mock.calls[0];
    expect(datos).toEqual({
      oferenteId: 'of-1',
      tipo: 'SUBSANACION',
      fechaPresentacion: expect.any(String),
      asunto: 'Certificado',
    });
    expect(archivos.map((a: File) => a.name)).toEqual(['carta.pdf', 'anexo.pdf']);
  });

  it('acepta una respuesta breve', async () => {
    const usuario = userEvent.setup();
    servicio.responderSubsanacion.mockResolvedValue(subsanaciones());
    render(<PanelTraslado procesoId="p-1" />);

    await waitFor(() => expect(screen.getByText('Aporta certificación de experiencia')).toBeInTheDocument());
    await usuario.click(screen.getByRole('button', { name: /^Responder$/ }));
    await usuario.type(screen.getByPlaceholderText(/La respuesta que se le notifica/i), 'Se acepta.');
    await usuario.click(screen.getByRole('button', { name: /Guardar respuesta/i }));

    await waitFor(() => expect(servicio.responderSubsanacion).toHaveBeenCalled());
    expect(servicio.responderSubsanacion.mock.calls[0][2].respuesta).toBe('Se acepta.');
  });
});
