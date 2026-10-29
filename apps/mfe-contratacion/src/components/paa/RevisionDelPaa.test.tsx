import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RevisionDelPaa } from './RevisionDelPaa';
import { contratacionService } from '../../services/contratacionService';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    paa: { revision: vi.fn(), decidir: vi.fn(), buscarLineas: vi.fn() },
  },
}));

const paa = (contratacionService as unknown as { paa: Record<string, ReturnType<typeof vi.fn>> }).paa;

const REVISION = {
  id: 'rev-1',
  procesoId: 'p-1',
  radicado: 'CTO-2026-0007',
  objeto: 'Soporte técnico',
  etapa: 3,
  estadoProceso: 'EN_CURSO',
  region: 'Sede Central',
  regionId: 'r-sede',
  codigo: 'LINEA 1',
  tipo: 'CAMBIO_VIGENCIA',
  porCambioAnual: true,
  versionAnterior: { numero: 31, anio: 2026 },
  versionNueva: { numero: 1, anio: 2027 },
  cambios: { linea: [], proceso: [] },
  motivo: 'Evaluación por cambio anual.',
  bloquea: true,
  responsable: null,
  estado: 'PENDIENTE',
  decision: null,
  justificacion: null,
  decididaPor: null,
  decididaAt: null,
  createdAt: '2026-10-09T10:00:00Z',
  puedeDecidir: true,
  decisiones: [
    { decision: 'CONTINUAR', disponible: true, motivo: null },
    { decision: 'DEVOLVER', disponible: true, motivo: null },
    { decision: 'MIGRAR', disponible: true, motivo: null },
    { decision: 'CANCELAR', disponible: true, motivo: null },
  ],
};

describe('RevisionDelPaa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paa.revision.mockResolvedValue(REVISION);
    paa.decidir.mockResolvedValue({ id: 'rev-1', decision: 'MIGRAR' });
    paa.buscarLineas.mockResolvedValue({
      lineas: [{ id: 'l-5', codigo: 'LINEA 5', objeto: 'Soporte 2027', modalidad: null, valorTotal: 1, enUso: null }],
    });
  });

  const render_ = () =>
    render(<RevisionDelPaa revisionId="rev-1" volverA="Mi trabajo" onVolver={vi.fn()} onVerProceso={vi.fn()} />);

  it('dice que es una evaluación por cambio anual, no una actualización', async () => {
    render_();
    expect(await screen.findByText(/no una actualización de la misma vigencia/)).toBeInTheDocument();
  });

  it('migrar exige elegir la línea del año nuevo y la justificación', async () => {
    render_();
    await userEvent.click(await screen.findByRole('radio', { name: /Migrar/ }));
    await userEvent.type(screen.getByLabelText(/Justificación/), 'La necesidad sigue en 2027');

    const registrar = screen.getByRole('button', { name: /Registrar la decisión/ });
    expect(registrar).toBeDisabled();

    await userEvent.click(await screen.findByRole('button', { name: /LINEA 5/ }));
    await userEvent.click(registrar);

    await waitFor(() =>
      expect(paa.decidir).toHaveBeenCalledWith('rev-1', 'MIGRAR', 'La necesidad sigue en 2027', 'l-5'),
    );
    expect(paa.buscarLineas).toHaveBeenCalledWith('r-sede', '', 1, 2027);
  });

  it('muestra apagada la decisión que no aplica, con su porqué', async () => {
    paa.revision.mockResolvedValue({
      ...REVISION,
      decisiones: [
        ...REVISION.decisiones.slice(0, 2),
        { decision: 'MIGRAR', disponible: false, motivo: 'Migrar solo aplica al cambio de vigencia.' },
        REVISION.decisiones[3],
      ],
    });
    render_();
    expect(await screen.findByRole('radio', { name: /Migrar/ })).toBeDisabled();
    expect(screen.getByText('Migrar solo aplica al cambio de vigencia.')).toBeInTheDocument();
  });

  it('a quien no decide le dice quién decide', async () => {
    paa.revision.mockResolvedValue({ ...REVISION, puedeDecidir: false, responsable: { id: 'u', nombre: 'Andrés Rojas', usuario: 'andres' } });
    render_();
    expect(await screen.findByText(/la decide Andrés Rojas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar/ })).toBeNull();
  });
});
