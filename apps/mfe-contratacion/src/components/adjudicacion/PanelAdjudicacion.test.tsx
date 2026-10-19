import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelAdjudicacion } from './PanelAdjudicacion';
import { contratacionService } from '../../services/contratacionService';
import {
  EstadoAdjudicacion,
  EstadoAudienciaAdjudicacion,
  EstadoDeclaratoriaDesierta,
  EstadoInformeDefinitivoProceso,
} from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    audienciaAdjudicacion: vi.fn(),
    informeDefinitivo: vi.fn(),
    adjudicacion: vi.fn(),
    declaratoriaDesierta: vi.fn(),
    celebrarAudiencia: vi.fn(),
    cargarPiezaAudiencia: vi.fn(),
    abrirSobreEconomico: vi.fn(),
    anularAudiencia: vi.fn(),
    generarInformeDefinitivo: vi.fn(),
    publicarInformeDefinitivo: vi.fn(),
    anularInformeDefinitivo: vi.fn(),
    adjudicar: vi.fn(),
    publicarActoAdjudicacion: vi.fn(),
    revocarActoAdjudicacion: vi.fn(),
    declararDesierto: vi.fn(),
    publicarDeclaratoriaDesierta: vi.fn(),
    revocarDeclaratoriaDesierta: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
    firmaDeActividad: vi.fn().mockResolvedValue({ requiereFirma: false }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as {
  audienciaAdjudicacion: ReturnType<typeof vi.fn>;
  informeDefinitivo: ReturnType<typeof vi.fn>;
  adjudicacion: ReturnType<typeof vi.fn>;
  declaratoriaDesierta: ReturnType<typeof vi.fn>;
};

const OFERTAS = [
  { id: 'of-1', numero: 1, nombre: 'Barata SAS', identificacion: '900111111-1', valorOfertado: 40_000_000 },
  { id: 'of-2', numero: 2, nombre: 'Completa SAS', identificacion: '900222222-2', valorOfertado: 48_000_000 },
];

const audiencia = (
  parcial: Partial<EstadoAudienciaAdjudicacion> = {},
): EstadoAudienciaAdjudicacion => ({
  aplica: true,
  motivoNoAplica: null,
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación pública',
  trasladoCerrado: true,
  aplicaSobreEconomico: true,
  motivoNoAplicaSobre: null,
  puedeCelebrar: false,
  audiencia: {
    id: 'aud-1',
    estado: 'CELEBRADA',
    celebradaAt: '2026-09-01T15:00:00.000Z',
    presididaPor: 'Ordenadora del Gasto',
    resumen: null,
    acta: { id: 'd-1', nombre: 'acta.pdf', archivoUrl: '/documentos/d-1' },
    registradaPor: 'Gestora',
    registradaAt: '2026-09-01T16:00:00.000Z',
    anuladaAt: null,
    motivoAnulacion: null,
    piezas: [],
    sobres: [],
  },
  anuladas: [],
  ofertas: OFERTAS,
  ...parcial,
});

const definitivo = (
  parcial: Partial<EstadoInformeDefinitivoProceso> = {},
): EstadoInformeDefinitivoProceso => ({
  aplica: true,
  motivoNoAplica: null,
  trasladoCerrado: true,
  audienciaPendiente: false,
  hayResultado: true,
  puedeGenerar: false,
  puedePublicar: false,
  informe: {
    id: 'def-1',
    estado: 'PUBLICADO',
    informePreliminarId: 'inf-1',
    resultadoId: 'r-1',
    resultado: {
      modalidad: 'LICITACION_PUBLICA',
      resultadoId: 'r-1',
      ganadora: { oferenteId: 'of-2', nombre: 'Completa SAS', identificacion: '900222222-2' },
      puntajeObtenido: 92,
      puntajeMaximo: 100,
      valorEvaluado: 48_000_000,
      justificacion: 'Mayor puntaje técnico.',
      informeDocumentoId: 'd-0',
      evidencias: [],
      ofertas: [],
    },
    cambios: {
      huboRectificacion: false,
      motivoRectificacion: null,
      cambioLaGanadora: false,
      subsanacionesAceptadas: [],
      escritosPresentados: 0,
    },
    ofertasRecibidas: 2,
    informe: { id: 'd-2', nombre: 'definitivo.pdf', archivoUrl: '/documentos/d-2' },
    evidencia: null,
    generadoPor: 'Gestora',
    generadoAt: '2026-09-02T14:00:00.000Z',
    publicadoPor: 'Gestora',
    publicadoAt: '2026-09-02T15:00:00.000Z',
    anuladoAt: null,
    motivoAnulacion: null,
  },
  anulados: [],
  ...parcial,
});

const adjudicacion = (parcial: Partial<EstadoAdjudicacion> = {}): EstadoAdjudicacion => ({
  aplica: true,
  motivoNoAplica: null,
  informeDefinitivoPublicado: true,
  ganadoraPropuesta: { oferenteId: 'of-2', nombre: 'Completa SAS', valorEvaluado: 48_000_000 },
  puedeAdjudicar: true,
  acto: null,
  revocados: [],
  ofertas: OFERTAS,
  ...parcial,
});

const desierta = (
  parcial: Partial<EstadoDeclaratoriaDesierta> = {},
): EstadoDeclaratoriaDesierta => ({
  aplica: true,
  motivoNoAplica: null,
  recepcionCerrada: true,
  ofertasRecibidas: 2,
  causalesPosibles: ['SIN_OFERTAS_HABILITADAS'],
  adjudicado: false,
  ganadoraDelComite: null,
  puedeDeclarar: true,
  declaratoria: null,
  revocadas: [],
  ...parcial,
});

describe('PanelAdjudicacion · etapa 7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.audienciaAdjudicacion.mockResolvedValue(audiencia());
    servicio.informeDefinitivo.mockResolvedValue(definitivo());
    servicio.adjudicacion.mockResolvedValue(adjudicacion());
    servicio.declaratoriaDesierta.mockResolvedValue(desierta());
  });

  it('dice que el informe propone y el acto decide', async () => {
    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/El informe propone; el acto decide/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/propone a/i)).toBeInTheDocument();
  });

  it('avisa mientras se llena el formulario si el acto se aparta del informe', async () => {
    const usuario = userEvent.setup();
    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Adjudicar el proceso/i })).toBeInTheDocument(),
    );
    await usuario.click(screen.getByRole('button', { name: /Adjudicar el proceso/i }));

    // Elegir a otro tiene que verse antes de guardar: quien firma tiene que ver
    // de qué se está apartando.
    await usuario.selectOptions(screen.getByRole('combobox'), 'of-1');

    await waitFor(() =>
      expect(screen.getByText(/se aparta del informe definitivo/i)).toBeInTheDocument(),
    );
  });

  it('no deja adjudicar a otro sin justificación', async () => {
    const usuario = userEvent.setup();
    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Adjudicar el proceso/i })).toBeInTheDocument(),
    );
    await usuario.click(screen.getByRole('button', { name: /Adjudicar el proceso/i }));
    await usuario.selectOptions(screen.getByRole('combobox'), 'of-1');

    const boton = await screen.findByRole('button', { name: /^Adjudicar$/i });
    expect(boton).toBeDisabled();
  });

  it('sin informe definitivo publicado remite a la 7.2', async () => {
    servicio.adjudicacion.mockResolvedValue(
      adjudicacion({ informeDefinitivoPublicado: false, puedeAdjudicar: false, ganadoraPropuesta: null }),
    );

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/El informe definitivo no se ha publicado/i)).toBeInTheDocument(),
    );
  });

  it('con el traslado abierto remite a la 6.6 y no a la audiencia', async () => {
    servicio.audienciaAdjudicacion.mockResolvedValue(
      audiencia({ trasladoCerrado: false, audiencia: null, puedeCelebrar: false }),
    );

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/El traslado del informe de evaluación sigue abierto/i)).toBeInTheDocument(),
    );
  });

  it('marca el sobre cuyo valor no coincide con lo declarado', async () => {
    const base = audiencia();
    servicio.audienciaAdjudicacion.mockResolvedValue({
      ...base,
      audiencia: {
        ...base.audiencia!,
        sobres: [
          {
            id: 's-1',
            oferta: { id: 'of-1', numero: 1, nombre: 'Barata SAS' },
            valorOfertado: 41_000_000,
            valorDeclarado: 40_000_000,
            coincideConLoDeclarado: false,
            observacion: null,
            abiertoPor: 'Gestora',
            abiertoAt: '2026-09-01T15:30:00.000Z',
            evidenciaUrl: null,
          },
        ],
      },
    });

    render(<PanelAdjudicacion procesoId="p-1" />);

    // Es el hecho por el que el sobre se abre delante de todos.
    await waitFor(() =>
      expect(screen.getByText(/No coincide con lo declarado/i)).toBeInTheDocument(),
    );
  });

  it('avisa cuando la ganadora del definitivo no es la que se trasladó', async () => {
    const base = definitivo();
    servicio.informeDefinitivo.mockResolvedValue({
      ...base,
      informe: {
        ...base.informe!,
        cambios: {
          huboRectificacion: true,
          motivoRectificacion: 'Se aceptó la certificación aportada',
          cambioLaGanadora: true,
          subsanacionesAceptadas: [
            { id: 's-1', oferente: 'Barata SAS', asunto: 'Aporta certificación' },
          ],
          escritosPresentados: 1,
        },
      },
    });

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/La ganadora cambió respecto del informe trasladado/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Aporta certificación/)).toBeInTheDocument();
  });

  it('en una licitación que no es de obra lo dice en vez de ofrecerlo', async () => {
    servicio.audienciaAdjudicacion.mockResolvedValue(
      audiencia({
        aplicaSobreEconomico: false,
        motivoNoAplicaSobre:
          'Este proceso no adelanta la actividad 7.1.1: el sobre económico solo se abre en audiencia en la licitación de obra pública, y la tipología del estudio previo es «Suministro»',
      }),
    );

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/la tipología del estudio previo es «Suministro»/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Abrir un sobre económico/i })).not.toBeInTheDocument();
  });

  it('en una modalidad sin audiencia lo dice y sigue mostrando el acto', async () => {
    servicio.audienciaAdjudicacion.mockResolvedValue(
      audiencia({
        aplica: false,
        motivoNoAplica: 'La mínima cuantía no celebra audiencia.',
        audiencia: null,
      }),
    );

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/no celebra audiencia de adjudicación/i)).toBeInTheDocument(),
    );
    // Sin audiencia el proceso igual se adjudica: la etapa no se bloquea.
    expect(screen.getByRole('button', { name: /Adjudicar el proceso/i })).toBeInTheDocument();
  });

  it('muestra el acto adjudicado con su resolución y su valor', async () => {
    servicio.adjudicacion.mockResolvedValue(
      adjudicacion({
        puedeAdjudicar: false,
        acto: {
          id: 'acto-1',
          estado: 'VIGENTE',
          informeDefinitivoId: 'def-1',
          adjudicatario: OFERTAS[1],
          numeroActo: 'RES-2026-114',
          fechaActo: '2026-09-05',
          valorAdjudicado: 48_000_000,
          correoContratista: null,
          acto: { id: 'd-3', nombre: 'resolucion.pdf', archivoUrl: '/documentos/d-3' },
          evidencia: null,
          notificadoAt: null,
          publicadoAt: null,
          emitidoPor: 'Ordenadora',
          emitidoAt: '2026-09-05T14:00:00.000Z',
          revocadoPor: null,
          revocadoAt: null,
          motivoRevocacion: null,
        },
      }),
    );

    render(<PanelAdjudicacion procesoId="p-1" />);

    await waitFor(() =>
      expect(screen.getByText(/Adjudicado a Completa SAS/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/RES-2026-114/)).toBeInTheDocument();
    expect(screen.getByText(/Todavía sin notificar ni publicar/i)).toBeInTheDocument();
  });

  // ------------------------------------------- revisión de QA (EFDS-1159) --

  it('la 7.1.1 pide la oferta económica del proveedor antes de abrir el sobre', async () => {
    const usuario = userEvent.setup();
    servicio.audienciaAdjudicacion.mockResolvedValue(audiencia());
    render(<PanelAdjudicacion procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Abrir un sobre económico/i }));
    await usuario.selectOptions(screen.getByDisplayValue('¿De qué oferta es el sobre?'), 'of-1');
    await usuario.type(screen.getByPlaceholderText('Valor que traía el sobre'), '40000000');

    const abrir = screen.getByRole('button', { name: /^Abrir sobre$/ });
    expect(abrir).toBeDisabled();
    expect(screen.getByText(/No se pide video/i)).toBeInTheDocument();

    await usuario.upload(
      screen.getByLabelText('Oferta económica del proveedor'),
      new File(['o'], 'oferta-economica.xlsx'),
    );
    expect(abrir).toBeEnabled();
  });

  it('publica el definitivo con el enlace de SECOP y su evidencia', async () => {
    const usuario = userEvent.setup();
    const borrador = definitivo();
    borrador.informe = { ...borrador.informe!, estado: 'BORRADOR', publicadoAt: null };
    servicio.informeDefinitivo.mockResolvedValue({ ...borrador, puedePublicar: true });
    (contratacionService.publicarInformeDefinitivo as any).mockResolvedValue(definitivo());
    render(<PanelAdjudicacion procesoId="p-1" />);

    const enlace = await screen.findByLabelText('Enlace de la publicación en SECOP');
    const publicar = screen.getByRole('button', { name: /Publicar informe definitivo/i });

    await usuario.type(enlace, 'en secop');
    expect(screen.getByText(/dirección completa, con https/i)).toBeInTheDocument();
    await usuario.clear(enlace);
    await usuario.type(enlace, 'https://community.secop.gov.co/Public/Tendering/1');

    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    await usuario.upload(inputs[inputs.length - 1], new File(['e'], 'pantallazo.png'));
    expect(publicar).toBeEnabled();
    await usuario.click(publicar);

    await waitFor(() => expect(contratacionService.publicarInformeDefinitivo).toHaveBeenCalled());
    expect((contratacionService.publicarInformeDefinitivo as any).mock.calls[0][1]).toBe(
      'https://community.secop.gov.co/Public/Tendering/1',
    );
  });

  it('actualizar el definitivo pide motivo y muestra el historial', async () => {
    const usuario = userEvent.setup();
    const conVersiones = definitivo({ puedeGenerar: true, actualizarPideMotivo: true });
    conVersiones.informe = {
      ...conVersiones.informe!,
      versiones: [
        {
          numero: 1,
          generadoAt: '2026-09-02T14:00:00.000Z',
          generadoPor: 'Gestora',
          motivo: null,
          informe: { id: 'd-1', nombre: 'definitivo-v1.pdf', archivoUrl: '/documentos/d-1' },
          evidencia: null,
          enlacePublicacion: 'https://community.secop.gov.co/1',
          publicadoAt: '2026-09-02T15:00:00.000Z',
          publicadoPor: 'Gestora',
        },
        {
          numero: 2,
          generadoAt: '2026-09-03T14:00:00.000Z',
          generadoPor: 'Gestora',
          motivo: 'Fórmulas aplicadas a la oferta económica',
          informe: { id: 'd-2', nombre: 'definitivo.pdf', archivoUrl: '/documentos/d-2' },
          evidencia: null,
          enlacePublicacion: null,
          publicadoAt: null,
          publicadoPor: null,
        },
      ],
    };
    servicio.informeDefinitivo.mockResolvedValue(conVersiones);
    (contratacionService.generarInformeDefinitivo as any).mockResolvedValue(conVersiones);
    render(<PanelAdjudicacion procesoId="p-1" />);

    expect(await screen.findByText('Historial de versiones')).toBeInTheDocument();
    expect(screen.getByText(/Fórmulas aplicadas a la oferta económica/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Actualizar informe definitivo/i }));
    await usuario.type(
      await screen.findByLabelText(/Motivo de la actualización/i),
      'Llegó una observación nueva después de la audiencia',
    );
    await usuario.click(screen.getByRole('button', { name: /Actualizar el informe/i }));

    await waitFor(() => expect(contratacionService.generarInformeDefinitivo).toHaveBeenCalled());
    expect((contratacionService.generarInformeDefinitivo as any).mock.calls[0][2]).toBe(
      'Llegó una observación nueva después de la audiencia',
    );
  });

  it('avisa que el correo al adjudicatario es solo informativo', async () => {
    const usuario = userEvent.setup();
    render(<PanelAdjudicacion procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: 'Adjudicar el proceso' }));

    expect(screen.getByText(/correo informativo/i)).toBeInTheDocument();
    expect(screen.getByText(/No reemplaza la notificación/i)).toBeInTheDocument();
  });

  it('el informe definitivo pide elegir la ganadora (QA, EFDS-1157)', async () => {
    const usuario = userEvent.setup();
    servicio.informeDefinitivo.mockResolvedValue(
      definitivo({ informe: null, puedeGenerar: true, actualizarPideMotivo: false }),
    );
    servicio.adjudicacion.mockResolvedValue(
      adjudicacion({ informeDefinitivoPublicado: false, puedeAdjudicar: false, ganadoraPropuesta: null }),
    );
    (contratacionService.generarInformeDefinitivo as any).mockResolvedValue(definitivo());
    render(<PanelAdjudicacion procesoId="p-1" />);

    const generar = await screen.findByRole('button', { name: /Generar informe definitivo/i });
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    const delDefinitivo = inputs.find((i) =>
      i.parentElement?.textContent?.includes('Adjuntar el informe definitivo'),
    )!;
    await usuario.upload(delDefinitivo, new File(['d'], 'definitivo.pdf'));
    // Sin ganadora no se genera: la evaluación preliminar no la nombra.
    expect(generar).toBeDisabled();

    await usuario.selectOptions(screen.getByLabelText('Oferta ganadora del informe definitivo'), 'of-1');
    await usuario.type(screen.getByLabelText('Valor evaluado de la ganadora'), '39500000');
    await usuario.click(generar);

    await waitFor(() => expect(contratacionService.generarInformeDefinitivo).toHaveBeenCalled());
    expect((contratacionService.generarInformeDefinitivo as any).mock.calls[0][3]).toEqual({
      oferenteId: 'of-1',
      valorEvaluado: 39_500_000,
    });
  });
});

