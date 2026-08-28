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
    puede: t.tipo === 'REANUDACION',
    motivo: t.tipo === 'REANUDACION' ? null : 'el contrato está suspendido: primero hay que reanudarlo',
  })),
  suspension: { id: 'm-1', numero: 'OT-3', desde: '2026-09-01', hastaPrevista: null },
});

const pintar = () => render(<PanelModificaciones procesoId="p-1" />);

describe('PanelModificaciones · qué tipo se puede tramitar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.modificaciones.mockResolvedValue(enEjecucion());
  });

  it('ofrece los seis tipos con trámite', async () => {
    pintar();
    await screen.findByRole('button', { name: /Adición en dinero/ });
    for (const nombre of ['Adición en dinero', 'Prórroga', 'Cesión', 'Aclaratorio', 'Suspensión', 'Reanudación']) {
      expect(screen.getByRole('button', { name: new RegExp(nombre) })).toBeInTheDocument();
    }
  });

  it('no ofrece la terminación anticipada, que quedó por confirmar', async () => {
    pintar();
    await screen.findByRole('button', { name: /Adición en dinero/ });
    expect(screen.queryByRole('button', { name: /Terminación anticipada/ })).toBeNull();
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

  it('deja reanudar y apaga todo lo demás', async () => {
    pintar();
    expect(await screen.findByRole('button', { name: /Reanudación/ })).toBeEnabled();
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

  it('la suspensión deja la fecha prevista en blanco cuando es indefinida', async () => {
    pintar();
    await userEvent.click(await screen.findByRole('button', { name: /Suspensión/ }));

    expect(screen.getByLabelText(/Hasta \(prevista\)/)).toHaveValue('');
    expect(screen.getByText(/Se deja en blanco si la suspensión es indefinida/)).toBeInTheDocument();
  });
});
