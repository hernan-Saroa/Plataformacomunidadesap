import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelDesierta } from './PanelDesierta';
import { EstadoDeclaratoriaDesierta } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    declararDesierto: vi.fn(),
    publicarDeclaratoriaDesierta: vi.fn(),
    revocarDeclaratoriaDesierta: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const estado = (parcial: Partial<EstadoDeclaratoriaDesierta> = {}): EstadoDeclaratoriaDesierta => ({
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

const pintar = (parcial: Partial<EstadoDeclaratoriaDesierta> = {}) =>
  render(<PanelDesierta procesoId="p-1" estado={estado(parcial)} onCambio={vi.fn()} />);

describe('PanelDesierta · etapa 7', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no ofrece elegir causal: la deduce del expediente', async () => {
    const usuario = userEvent.setup();
    pintar();

    await usuario.click(screen.getByRole('button', { name: /Declarar desierto el proceso/i }));

    // Con dos ofertas recibidas la única causal posible es que ninguna quedara
    // habilitada. Ofrecer la otra sería invitar a firmar un acto que contradice
    // la lista de oferentes del mismo expediente.
    expect(screen.getByText(/Causal: Ninguna oferta quedó habilitada/i)).toBeInTheDocument();
    expect(screen.getByText(/recibió 2 oferta/i)).toBeInTheDocument();
  });

  it('cuando no se presentó nadie, la causal es esa y no pide informe del comité', async () => {
    const usuario = userEvent.setup();
    pintar({ ofertasRecibidas: 0, causalesPosibles: ['SIN_OFERTAS'] });

    await usuario.click(screen.getByRole('button', { name: /Declarar desierto el proceso/i }));

    expect(screen.getByText(/Causal: No se presentó ninguna oferta/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe del comité/i)).not.toBeInTheDocument();
  });

  it('pide el informe del comité cuando la causal es que ninguna quedó habilitada', async () => {
    const usuario = userEvent.setup();
    pintar();

    await usuario.click(screen.getByRole('button', { name: /Declarar desierto el proceso/i }));

    expect(screen.getByText(/informe del comité/i)).toBeInTheDocument();
  });

  it('pone delante la ganadora del comité antes de dejar declarar', async () => {
    const usuario = userEvent.setup();
    pintar({ ganadoraDelComite: { oferenteId: 'of-2', numero: 2, nombre: 'Completa SAS' } });

    await usuario.click(screen.getByRole('button', { name: /Declarar desierto el proceso/i }));

    // Es la contradicción que hay que sustentar, no un detalle: se nombra.
    expect(screen.getByText(/El comité ya registró una ganadora/i)).toBeInTheDocument();
    expect(screen.getByText(/Completa SAS/)).toBeInTheDocument();
  });

  it('explica que un proceso adjudicado no se declara desierto', () => {
    pintar({ adjudicado: true, puedeDeclarar: false });

    expect(screen.getByText(/El proceso ya está adjudicado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Declarar desierto el proceso/i }),
    ).not.toBeInTheDocument();
  });

  it('dice que con la recepción abierta "no hay ofertas" todavía no es un hecho', () => {
    pintar({ recepcionCerrada: false, causalesPosibles: [], puedeDeclarar: false });

    expect(screen.getByText(/todavía no es un hecho/i)).toBeInTheDocument();
  });

  it('no se muestra en las modalidades que no reciben ofertas', () => {
    const { container } = render(
      <PanelDesierta
        procesoId="p-1"
        estado={estado({ aplica: false, motivoNoAplica: 'Contratación directa' })}
        onCambio={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  describe('con declaratoria vigente', () => {
    const VIGENTE = {
      id: 'des-1',
      estado: 'VIGENTE' as const,
      causal: 'SIN_OFERTAS_HABILITADAS' as const,
      motivo: 'Ninguna oferta acreditó la experiencia mínima exigida en el pliego',
      numeroActo: 'RES-2026-220',
      fechaActo: '2026-09-10',
      ofertasRecibidas: 2,
      seApartaDelResultado: false,
      acto: { id: 'd-1', nombre: 'declaratoria.pdf', archivoUrl: '/documentos/d-1' },
      informeComite: { id: 'd-2', nombre: 'informe.pdf', archivoUrl: '/documentos/d-2' },
      evidencia: null,
      notificadaAt: null,
      publicadaAt: null,
      declaradaPor: 'Gestora',
      declaradaAt: '2026-09-10T15:00:00.000Z',
      revocadaPor: null,
      revocadaAt: null,
      motivoRevocacion: null,
    };

    it('muestra la causal, la motivación y el acto', () => {
      pintar({ declaratoria: VIGENTE, puedeDeclarar: false });

      expect(screen.getByText(/Proceso declarado desierto/i)).toBeInTheDocument();
      expect(screen.getByText(/Ninguna oferta acreditó la experiencia/i)).toBeInTheDocument();
      expect(screen.getByText(/RES-2026-220/)).toBeInTheDocument();
    });

    it('deja publicar y revocar, y no volver a declarar', () => {
      pintar({ declaratoria: VIGENTE, puedeDeclarar: false });

      expect(screen.getByRole('button', { name: /Notificar y publicar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Revocar la declaratoria/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Declarar desierto el proceso/i }),
      ).not.toBeInTheDocument();
    });

    it('avisa cuando la declaratoria se apartó del resultado del comité', () => {
      pintar({
        declaratoria: { ...VIGENTE, seApartaDelResultado: true },
        puedeDeclarar: false,
      });

      expect(screen.getByText(/se apartó del resultado/i)).toBeInTheDocument();
    });
  });
});
