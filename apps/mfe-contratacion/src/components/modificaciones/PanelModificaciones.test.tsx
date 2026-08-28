import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelModificaciones } from './PanelModificaciones';
import { contratacionService } from '../../services/contratacionService';
import { EstadoModificaciones } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    modificaciones: vi.fn(),
    solicitarAdicion: vi.fn(),
    solicitarProrroga: vi.fn(),
    solicitarCesion: vi.fn(),
    solicitarAclaratorio: vi.fn(),
    solicitarSuspension: vi.fn(),
    solicitarReanudacion: vi.fn(),
    solicitarTerminacion: vi.fn(),
    aprobarModificacion: vi.fn(),
    rechazarModificacion: vi.fn(),
    revocarModificacion: vi.fn(),
    publicarModificacion: vi.fn(),
    solicitarRespaldoAdicion: vi.fn(),
    urlDescarga: (url: string) => `https://gateway${url}`,
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const servicio = contratacionService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const TIPOS = [
  { tipo: 'ADICION', nombre: 'la adición' },
  { tipo: 'PRORROGA', nombre: 'la prórroga' },
  { tipo: 'CESION', nombre: 'la cesión' },
  { tipo: 'ACLARATORIO', nombre: 'el aclaratorio' },
  { tipo: 'SUSPENSION', nombre: 'la suspensión' },
  { tipo: 'REANUDACION', nombre: 'la reanudación' },
  { tipo: 'TERMINACION_ANTICIPADA', nombre: 'la terminación anticipada' },
] as const;

const enEjecucion = (): EstadoModificaciones => ({
  contrato: {
    numero: 'CTO-2026-014',
    objeto: 'Servicios profesionales',
    estado: 'EJECUCION',
    valor: 100_000_000,
    plazoDias: 180,
    contratistaNombre: 'Consultora Andina SAS',
    contratistaDocumento: '900111111-1',
  },
  tope: { porcentaje: 50, fundamento: 'Ley 80', confirmado: true },
  margen: {
    valorInicial: 100_000_000,
    yaAdicionado: 0,
    topePorcentaje: 50,
    topeValor: 50_000_000,
    margenDisponible: 50_000_000,
    cabe: true,
    motivo: null,
  },
  tipos: TIPOS.map((t) => ({
    ...t,
    puede: t.tipo !== 'REANUDACION',
    motivo: t.tipo === 'REANUDACION' ? 'el contrato no está suspendido: no hay nada que reanudar' : null,
  })),
  suspension: null,
  puedeSolicitar: true,
  motivoNoPuede: null,
  modificaciones: [],
});

const suspendido = (): EstadoModificaciones => ({
  ...enEjecucion(),
  contrato: { ...(enEjecucion().contrato as any), estado: 'SUSPENDIDO' },
  tipos: TIPOS.map((t) => ({
    ...t,
    puede: t.tipo === 'REANUDACION' || t.tipo === 'TERMINACION_ANTICIPADA',
    motivo:
      t.tipo === 'REANUDACION' || t.tipo === 'TERMINACION_ANTICIPADA'
        ? null
        : 'el contrato está suspendido: primero hay que reanudarlo',
  })),
  suspension: { id: 'm-1', numero: 'OT-3', desde: '2026-09-01', hastaPrevista: null },
});

const pintar = () => render(<PanelModificaciones procesoId="p-1" />);

describe('PanelModificaciones · qué tipo se puede tramitar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modificaciones.mockResolvedValue(enEjecucion());
  });

  it('ofrece los siete tipos de la matriz', async () => {
    pintar();
    await screen.findByRole('button', { name: /Adición en dinero/ });
    for (const nombre of [
      'Adición en dinero',
      'Prórroga',
      'Cesión',
      'Aclaratorio',
      'Suspensión',
      'Reanudación',
      'Terminación anticipada',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(nombre) })).toBeInTheDocument();
    }
  });

  it('apaga reanudar cuando el contrato no está suspendido, y dice por qué', async () => {
    pintar();
    const boton = await screen.findByRole('button', { name: /Reanudación/ });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('title', expect.stringMatching(/no está suspendido/));
  });
});

describe('PanelModificaciones · el contrato suspendido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modificaciones.mockResolvedValue(suspendido());
  });

  it('lo avisa arriba en vez de dejarlo deducir de los botones', async () => {
    pintar();
    expect(await screen.findByText(/Contrato suspendido desde/)).toBeInTheDocument();
    expect(screen.getByText(/no admite pagos ni liquidación/)).toBeInTheDocument();
  });

  it('deja reanudar y terminar, y apaga todo lo demás', async () => {
    // Terminar un contrato en pausa es el desenlace de una suspensión que no se
    // supera: obligar a reanudarlo antes dejaría en el expediente una ejecución
    // que nunca se retomó.
    pintar();
    expect(await screen.findByRole('button', { name: /Reanudación/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Terminación anticipada/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Adición en dinero/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Prórroga/ })).toBeDisabled();
  });
});

describe('PanelModificaciones · los formularios de cada tipo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modificaciones.mockResolvedValue(enEjecucion());
    servicio.solicitarProrroga.mockResolvedValue(enEjecucion());
    servicio.solicitarCesion.mockResolvedValue(enEjecucion());
  });

  it('la prórroga dice cómo queda el plazo y que no toca el presupuesto', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Prórroga/ }));

    await userEvent.type(screen.getByLabelText(/Días de prórroga/), '30');
    expect(screen.getByText(/El plazo pasa de 180 a 210 días/)).toBeInTheDocument();
    expect(screen.getByText(/no toca el presupuesto/)).toBeInTheDocument();
  });

  it('la cesión nombra a quién sustituye el cesionario', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Cesión/ }));
    expect(screen.getByText(/Sustituye a Consultora Andina SAS/)).toBeInTheDocument();
  });

  it('no deja enviar sin una justificación con sustento', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Prórroga/ }));
    await userEvent.type(screen.getByLabelText(/Días de prórroga/), '30');

    expect(screen.getByRole('button', { name: /^Solicitar$/ })).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/Justificación/),
      'La entrega se retrasó por el invierno en la zona de obra.',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Solicitar$/ })).toBeEnabled(),
    );
  });

  it('manda la prórroga por su propia ruta, con los días', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Prórroga/ }));
    await userEvent.type(screen.getByLabelText(/Días de prórroga/), '30');
    await userEvent.type(
      screen.getByLabelText(/Justificación/),
      'La entrega se retrasó por el invierno en la zona de obra.',
    );
    await userEvent.click(screen.getByRole('button', { name: /^Solicitar$/ }));

    await waitFor(() =>
      expect(servicio.solicitarProrroga).toHaveBeenCalledWith('p-1', {
        diasProrroga: 30,
        justificacion: 'La entrega se retrasó por el invierno en la zona de obra.',
      }),
    );
    expect(servicio.solicitarAdicion).not.toHaveBeenCalled();
  });

  it('el aclaratorio solo pide justificación', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Aclaratorio/ }));

    expect(screen.getByText(/no cambia plazo, valor ni partes/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Días de prórroga/)).toBeNull();
    expect(screen.queryByLabelText(/Valor de la adición/)).toBeNull();
  });

  it('la terminación pide causal y fecha, y dice que el incumplimiento no va ahí', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Terminación anticipada/ }));

    expect(screen.getByLabelText(/Causal/)).toHaveValue('MUTUO_ACUERDO');
    expect(screen.getByLabelText(/Deja de ejecutarse el/)).toBeInTheDocument();
    expect(screen.getByText(/proceso\s+sancionatorio/)).toBeInTheDocument();
  });

  it('manda la terminación por su propia ruta, con la causal y la fecha', async () => {
    servicio.solicitarTerminacion.mockResolvedValue(enEjecucion());
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Terminación anticipada/ }));

    await userEvent.selectOptions(screen.getByLabelText(/Causal/), 'UNILATERAL');
    await userEvent.type(
      screen.getByLabelText(/Justificación/),
      'El contratista no repuso la garantía y la entidad decide no continuar.',
    );
    await userEvent.click(screen.getByRole('button', { name: /^Solicitar$/ }));

    await waitFor(() =>
      expect(servicio.solicitarTerminacion).toHaveBeenCalledWith('p-1', {
        terminacionCausal: 'UNILATERAL',
        terminacionEl: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        justificacion: 'El contratista no repuso la garantía y la entidad decide no continuar.',
      }),
    );
  });

  it('la suspensión deja la fecha prevista en blanco cuando es indefinida', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Suspensión/ }));

    expect(screen.getByLabelText(/Hasta \(prevista\)/)).toHaveValue('');
    expect(screen.getByText(/Se deja en blanco si la suspensión es indefinida/)).toBeInTheDocument();
  });
});

describe('PanelModificaciones · aprobar lo que no es una adición', () => {
  /**
   * El CDP y el RP son de la adición y de nadie más.
   *
   * Pedírselos a los demás tipos dejaba su botón de aprobar apagado para
   * siempre, esperando un certificado que nadie iba a tramitar: la prórroga no
   * toca el presupuesto y el aclaratorio no cambia nada.
   */
  const conProrrogaEnTramite = (): EstadoModificaciones => ({
    ...enEjecucion(),
    modificaciones: [
      {
        id: 'm-9',
        tipo: 'PRORROGA',
        estado: 'EN_TRAMITE',
        numero: null,
        fechaSuscripcion: null,
        justificacion: 'La entrega se retrasó por el invierno en la zona de obra.',
        valorAdicionado: null,
        valorContratoAntes: null,
        valorContratoDespues: null,
        topePorcentaje: null,
        solicitadaPor: 'Gestor',
        aprobadaPor: null,
        aprobadaAt: null,
        revocadaAt: null,
        revocadaPor: null,
        motivoRevocacion: null,
        diasProrroga: 30,
        plazoDiasAntes: null,
        plazoDiasDespues: null,
        suspensionDesde: null,
        suspensionHasta: null,
        reanudaModificacionId: null,
        reanudadaEl: null,
        terminacionCausal: null,
        terminacionEl: null,
        estadoContratoAntes: null,
        cedenteNombre: null,
        cedenteDocumento: null,
        cesionarioNombre: null,
        cesionarioDocumento: null,
        cesionarioTipo: null,
        documento: null,
        cdp: null,
        rp: null,
        publicacion: null,
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modificaciones.mockResolvedValue(conProrrogaEnTramite());
  });

  it('no le exige CDP ni RP a una prórroga', async () => {
    pintar();
    expect(await screen.findByRole('button', { name: /^Aprobar$/ })).toBeEnabled();
    expect(screen.queryByText(/Dirección Financiera expida/)).toBeNull();
  });

  it('al aprobar dice lo que le hace al contrato, y no habla de dinero', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /^Aprobar$/ }));

    expect(screen.getByText(/el plazo del contrato crece en 30 días/)).toBeInTheDocument();
    expect(screen.queryByText(/el valor del contrato aumenta/)).toBeNull();
  });
});
