import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelLegalizacion } from './PanelLegalizacion';
import { LugarDeDecision } from '../shared/LugarDeDecision';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('../shared/useFirma', () => ({
  useFirma: () => ({ conFirma: (hacer: () => unknown) => hacer(), modal: null }),
}));

const conPolizaCargada = () => ({
  suscrito: true,
  motivoNoSuscrito: null,
  contratista: { nombre: 'Seguridad Andina SAS', tipo: 'JURIDICA' },
  requiereArl: false,
  tiposAmparo: [],
  garantias: [
    {
      id: 'g-1',
      aseguradora: 'Seguros del Estado',
      numeroPoliza: 'PO-123',
      estado: 'CARGADA',
      cargadaPor: 'ana@esap.edu.co',
      revisadaPor: null,
      revisadaAt: null,
      motivoRechazo: null,
      amparos: [],
    },
  ],
  arl: null,
  legalizado: false,
  pendientes: [],
  puedeCargar: true,
  puedeAprobar: true,
});

/**
 * Las pólizas se aprueban solo en la pantalla de revisión (8.4).
 *
 * En el trabajo del proceso quien carga sigue cargando, pero aprobar o
 * devolver una póliza lleva a la revisión.
 */
describe('PanelLegalizacion · aprobar la póliza', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'legalizacion').mockResolvedValue(conPolizaCargada() as never);
  });

  it('fuera de la revisión no la aprueba: lleva a ella', async () => {
    const abrirRevision = vi.fn();
    render(
      <LugarDeDecision abrirRevision={abrirRevision}>
        <PanelLegalizacion procesoId="p-1" numeral="8.4" />
      </LugarDeDecision>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Abrir la revisión/ }));
    expect(abrirRevision).toHaveBeenCalledWith('8.4');
    expect(screen.queryByRole('button', { name: /Aprobar la póliza/ })).toBeNull();
  });

  it('en la revisión ofrece aprobarla o devolverla', async () => {
    render(
      <LugarDeDecision enLaRevision>
        <PanelLegalizacion procesoId="p-1" numeral="8.4" />
      </LugarDeDecision>,
    );

    expect(await screen.findByRole('button', { name: /Aprobar la póliza/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Devolver con motivo/ })).toBeEnabled();
  });
});
