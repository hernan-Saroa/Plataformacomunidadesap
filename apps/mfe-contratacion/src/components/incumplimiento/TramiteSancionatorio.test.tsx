import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TramiteSancionatorio } from './TramiteSancionatorio';
import {
  AudienciaSancionatoria,
  CasoIncumplimiento,
  ResolucionSancionatoria,
  TramiteSancionatorio as DatosTramite,
} from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    abrirTramite: vi.fn(),
    citarAudienciaSancionatoria: vi.fn(),
    celebrarAudienciaSancionatoria: vi.fn(),
    cerrarAudienciaSinCelebrar: vi.fn(),
    decidirCaso: vi.fn(),
    notificarResolucion: vi.fn(),
    revocarResolucion: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const tramite = (parcial: Partial<DatosTramite> = {}): DatosTramite => ({
  audiencias: [],
  resoluciones: [],
  audienciasCelebradas: 0,
  audienciaPendiente: null,
  puedeAbrir: false,
  motivoNoAbrir: null,
  puedeCitar: false,
  motivoNoCitar: null,
  puedeSancionar: false,
  motivoNoSancionar: null,
  puedeArchivar: false,
  motivoNoArchivar: null,
  motivoNoCaducar: null,
  ...parcial,
});

const caso = (
  estado: CasoIncumplimiento['estado'],
  datosTramite: Partial<DatosTramite> = {},
): CasoIncumplimiento => ({
  id: 'caso-1',
  motivo: 'La obra lleva tres semanas detenida',
  fechaHecho: '2026-08-01',
  estado,
  reportadoPor: 'supervisor@esap.edu.co',
  createdAt: '2026-08-02T10:00:00-05:00',
  soporte: null,
  tramite: tramite(datosTramite),
});

const audiencia = (parcial: Partial<AudienciaSancionatoria> = {}): AudienciaSancionatoria => ({
  id: 'aud-1',
  citadaPara: '2026-09-15T09:00:00-05:00',
  objeto: null,
  estado: 'CITADA',
  celebradaEl: null,
  resumen: null,
  motivo: null,
  citadaPor: 'juridica@esap.edu.co',
  citacion: { nombre: 'citacion.pdf', url: '/hiring/files/citacion.pdf' },
  acta: null,
  ...parcial,
});

const resolucion = (parcial: Partial<ResolucionSancionatoria> = {}): ResolucionSancionatoria => ({
  id: 'res-1',
  tipo: 'APERTURA',
  numero: '0451',
  fechaExpedicion: '2026-08-10',
  sentido: null,
  valorSancion: null,
  notificadaEl: null,
  firmeEl: null,
  expedidaPor: 'juridica@esap.edu.co',
  revocadaAt: null,
  revocadaPor: null,
  motivoRevocacion: null,
  documento: { nombre: 'resolucion.pdf', url: '/hiring/files/resolucion.pdf' },
  ...parcial,
});

const pintar = (elCaso: CasoIncumplimiento) =>
  render(
    <TramiteSancionatorio
      procesoId="p-1"
      caso={elCaso}
      onEstado={vi.fn()}
      onCambio={vi.fn()}
    />,
  );

/**
 * Criterios de EFDS-1181 (RF-INC-02): el área jurídica tramita las
 * resoluciones y audiencias sancionatorias, y la caducidad queda registrada
 * como causal contractual.
 *
 * Lo que se prueba aquí es que la pantalla no ofrezca lo que el servidor
 * rechaza: en un procedimiento sancionatorio, un botón de más es anunciarle a
 * la entidad una decisión que no puede tomar.
 */
describe('TramiteSancionatorio · EFDS-1181', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sobre el caso apenas reportado solo ofrece abrir el trámite', () => {
    pintar(caso('REPORTADO', { puedeAbrir: true }));

    expect(screen.getByRole('button', { name: /Abrir el trámite/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Citar a audiencia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Decidir el caso/i })).not.toBeInTheDocument();
  });

  it('sin audiencia celebrada, decidir solo puede archivar', async () => {
    const usuario = userEvent.setup();
    pintar(
      caso('EN_TRAMITE', {
        resoluciones: [resolucion()],
        puedeCitar: true,
        puedeArchivar: true,
        puedeSancionar: false,
        motivoNoSancionar:
          'no se ha celebrado ninguna audiencia: no se sanciona sin haber oído al contratista',
      }),
    );

    // El motivo se dice en pantalla en vez de dejar un botón apagado.
    expect(screen.getByText(/no se sanciona sin haber oído al contratista/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Decidir el caso/i }));

    expect(screen.getByRole('option', { name: /Archiva el caso/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Declara el incumplimiento/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Declara la caducidad/i }),
    ).not.toBeInTheDocument();
  });

  it('con una audiencia celebrada ofrece las tres salidas, caducidad incluida', async () => {
    const usuario = userEvent.setup();
    pintar(
      caso('EN_TRAMITE', {
        audiencias: [audiencia({ estado: 'CELEBRADA', celebradaEl: '2026-09-15', resumen: 'El contratista expuso su defensa' })],
        audienciasCelebradas: 1,
        puedeCitar: true,
        puedeSancionar: true,
        puedeArchivar: true,
      }),
    );

    await usuario.click(screen.getByRole('button', { name: /Decidir el caso/i }));

    expect(screen.getByRole('option', { name: /Declara el incumplimiento/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Declara la caducidad/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Archiva el caso/i })).toBeInTheDocument();
  });

  it('no ofrece la caducidad cuando el contrato no la admite, y dice por qué', async () => {
    const usuario = userEvent.setup();
    pintar(
      caso('EN_TRAMITE', {
        audienciasCelebradas: 1,
        puedeSancionar: true,
        puedeArchivar: true,
        motivoNoCaducar: 'el contrato ya está liquidado: la caducidad interrumpe una ejecución que ya terminó',
      }),
    );

    expect(screen.getByText(/la caducidad interrumpe una ejecución que ya terminó/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Decidir el caso/i }));

    expect(screen.getByRole('option', { name: /Declara el incumplimiento/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Declara la caducidad/i })).not.toBeInTheDocument();
  });

  it('celebrar la audiencia no se habilita sin acta ni resumen', async () => {
    const usuario = userEvent.setup();
    pintar(
      caso('EN_TRAMITE', {
        audiencias: [audiencia()],
        resoluciones: [resolucion()],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: /Registrar lo que pasó/i }));

    // El acta es la prueba de que el contratista fue oído: sin ella la
    // decisión posterior se apoyaría en una audiencia que el expediente no
    // puede mostrar.
    const registrar = screen.getByRole('button', { name: /Registrar la audiencia/i });
    expect(registrar).toBeDisabled();

    await usuario.type(
      screen.getByLabelText(/Qué pasó en la audiencia/i),
      'El contratista expuso su defensa y aportó pruebas',
    );
    expect(registrar).toBeDisabled();
  });

  it('suspender la audiencia exige motivo', async () => {
    const usuario = userEvent.setup();
    pintar(caso('EN_TRAMITE', { audiencias: [audiencia()], resoluciones: [resolucion()] }));

    await usuario.click(screen.getByRole('button', { name: /Suspenderla/i }));

    const boton = screen.getAllByRole('button', { name: /Suspenderla/i }).pop() as HTMLElement;
    expect(boton).toBeDisabled();

    await usuario.type(screen.getByPlaceholderText(/Por qué no se celebró/i), 'No compareció el apoderado');
    expect(boton).toBeEnabled();
  });

  it('la resolución revocada se muestra con su motivo y ya no ofrece acciones', () => {
    pintar(
      caso('EN_TRAMITE', {
        resoluciones: [
          resolucion({
            tipo: 'DECISION',
            sentido: 'DECLARA_CADUCIDAD',
            revocadaAt: '2026-09-20T10:00:00-05:00',
            revocadaPor: 'juridica@esap.edu.co',
            motivoRevocacion: 'Prosperó el recurso de reposición',
          }),
        ],
      }),
    );

    // No se borra: se expidió y pudo notificarse, así que queda en el
    // expediente con su motivo.
    expect(screen.getByText(/Prosperó el recurso de reposición/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Revocar$/i })).not.toBeInTheDocument();
  });
});
