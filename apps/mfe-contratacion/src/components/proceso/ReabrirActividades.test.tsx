import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ReabrirActividades } from './ReabrirActividades';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const lista = [
  { numeral: '3.1', nombre: 'Estudio previo', etapa: 3, estado: 'APROBADO', reapertura: null },
  { numeral: '3.3', nombre: 'Radicación', etapa: 3, estado: 'APROBADO', reapertura: null },
  { numeral: '4.2', nombre: 'CDP', etapa: 4, estado: 'APROBADO', reapertura: null },
  {
    numeral: '5.2',
    nombre: 'Cronograma',
    etapa: 5,
    estado: 'DEVUELTO',
    reapertura: { motivo: 'Fecha mal puesta', por: 'directora', porId: null, at: '' },
  },
];

/** Reabrir actividades ya cerradas (153). */
describe('ReabrirActividades', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reabre las elegidas de una etapa con el motivo', async () => {
    vi.spyOn(contratacionService, 'reaperturas').mockResolvedValue(lista);
    const reabrir = vi
      .spyOn(contratacionService, 'reabrirActividades')
      .mockResolvedValue({ reabiertas: ['3.1', '3.3'] });
    const onCambio = vi.fn();
    render(<ReabrirActividades procesoId="p-1" radicado="CTO-1" onCambio={onCambio} />);

    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    await userEvent.click(await screen.findByLabelText('Etapa 3'));
    await userEvent.type(screen.getByLabelText(/Qué hay que corregir/), 'El NIT quedó mal digitado');
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir 2 actividades' }));

    expect(reabrir).toHaveBeenCalledWith('p-1', ['3.1', '3.3'], 'El NIT quedó mal digitado');
    expect(onCambio).toHaveBeenCalled();
  });

  it('sin motivo no deja reabrir', async () => {
    vi.spyOn(contratacionService, 'reaperturas').mockResolvedValue(lista);
    render(<ReabrirActividades procesoId="p-1" radicado="CTO-1" onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    await userEvent.click(await screen.findByLabelText(/4\.2/));

    const botones = screen.getAllByRole('button', { name: 'Reabrir' });
    expect(botones[botones.length - 1]).toBeDisabled();
  });

  it('deshace una reapertura que sigue esperando corrección', async () => {
    vi.spyOn(contratacionService, 'reaperturas').mockResolvedValue(lista);
    const deshacer = vi
      .spyOn(contratacionService, 'deshacerReapertura')
      .mockResolvedValue({ numeral: '5.2', estado: 'APROBADO' });
    render(<ReabrirActividades procesoId="p-1" radicado="CTO-1" onCambio={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Reabrir/ }));
    expect(await screen.findByText(/Fecha mal puesta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Deshacer/ }));

    expect(deshacer).toHaveBeenCalledWith('p-1', '5.2');
  });
});
