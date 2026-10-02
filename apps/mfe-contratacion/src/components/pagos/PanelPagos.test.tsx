import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelPagos } from './PanelPagos';
import { LugarDeDecision } from '../shared/LugarDeDecision';
import { SoloLectura } from '../shared/SoloLectura';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const pago = (estado: string) => ({
  id: 'pg-1',
  numero: 3,
  periodoDesde: '2026-08-01',
  periodoHasta: '2026-08-31',
  valor: 5000000,
  estado,
  radicadoAt: '2026-09-01T10:00:00.000Z',
  radicadoPor: 'contratista@correo.com',
  avaladoAt: null,
  avaladoPor: null,
  observacionAval: null,
  devueltoAt: null,
  motivoDevolucion: null,
  tramitadoAt: null,
  referenciaPago: null,
  motivoAnulacion: null,
  factura: null,
  informe: null,
  soportes: [],
});

const conCuenta = (estado: string) => ({
  admitePagos: true,
  motivoNoAdmite: null,
  contrato: { numero: 'CTO-1', objeto: 'Vigilancia', estado: 'EN_EJECUCION', valor: 60000000, fechaInicio: '2026-07-01' },
  supervisor: { nombre: 'Diana Castro', cargo: null, personaId: 'per-1' },
  puedeRadicar: true,
  esSupervisor: true,
  integracionClick: false,
  pagos: [pago(estado)],
  resumen: { cobrado: 5000000, tramitado: 0, saldo: 55000000, advertencia: null },
});

/**
 * La cuenta de cobro se avala o se devuelve solo en la pantalla de revisión
 * (9.4). Devolver una ya avalada corrige un aval dado y se queda en el panel.
 */
describe('PanelPagos · el aval del supervisor', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('fuera de la revisión no la avala: lleva a ella', async () => {
    vi.spyOn(contratacionService, 'pagos').mockResolvedValue(conCuenta('RADICADO') as never);
    const abrirRevision = vi.fn();
    render(
      <LugarDeDecision abrirRevision={abrirRevision}>
        <PanelPagos procesoId="p-1" />
      </LugarDeDecision>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Abrir la revisión/ }));
    expect(abrirRevision).toHaveBeenCalledWith('9.4');
    expect(screen.queryByRole('button', { name: /^Avalar$/ })).toBeNull();
  });

  it('en la revisión avala o devuelve, y lo demás sigue en solo lectura', async () => {
    vi.spyOn(contratacionService, 'pagos').mockResolvedValue(conCuenta('RADICADO') as never);
    render(
      <LugarDeDecision enLaRevision>
        <SoloLectura motivo="Estás revisando lo que se envió">
          <PanelPagos procesoId="p-1" />
        </SoloLectura>
      </LugarDeDecision>,
    );

    expect(await screen.findByRole('button', { name: /^Avalar$/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Devolver$/ })).toBeEnabled();
    // Quien revisa no radica ni anula.
    expect(screen.getByRole('button', { name: /Anular/ })).toBeDisabled();
  });

  it('devolver una cuenta ya avalada se queda en el panel', async () => {
    vi.spyOn(contratacionService, 'pagos').mockResolvedValue(conCuenta('AVALADO') as never);
    render(
      <LugarDeDecision>
        <PanelPagos procesoId="p-1" />
      </LugarDeDecision>,
    );

    expect(await screen.findByRole('button', { name: /^Devolver$/ })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Abrir la revisión/ })).toBeNull();
  });
});
