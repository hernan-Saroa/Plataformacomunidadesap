import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CronogramaPorEtapas } from './CronogramaPorEtapas';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../shared/Permitido', () => ({
  Permitido: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const etapa = (n: number, cambios: Record<string, unknown> = {}) => ({
  etapa: n,
  nombre: `Nombre ${n}`,
  fechaInicio: null,
  fechaFin: null,
  nota: null,
  actualizadoPor: null,
  actualizadoAt: null,
  estado: 'SIN_FECHA',
  diasRestantes: null,
  ...cambios,
});

const cronograma = (cambios: Record<number, Record<string, unknown>> = {}) => ({
  anticipacion: 5,
  etapas: [5, 6, 7, 8, 9, 10].map((n) => etapa(n, cambios[n])),
});

const conPredeterminadas = (etapas: number[]) =>
  vi
    .spyOn(contratacionService, 'predeterminadoDelProceso')
    .mockResolvedValue({ modalidad: 'X', modalidadNombre: 'X', etapas, numerales: [], propias: [] } as never);

/** Cronograma por etapas macro de la 5.2 (135): opcional, con alertas; desde la 144, solo lo predeterminado. */
describe('CronogramaPorEtapas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    conPredeterminadas([]);
  });

  it('se presenta como opcional y sin etapas programadas no pide nada', async () => {
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma() as never);
    render(<CronogramaPorEtapas procesoId="p-1" />);

    expect(await screen.findByText(/opcional/)).toBeInTheDocument();
    expect(screen.getByText(/Ninguna etapa tiene fechas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Programar las etapas/ })).toBeInTheDocument();
  });

  it('dice cómo va cada etapa programada', async () => {
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma({
        5: { fechaFin: '2026-10-20', estado: 'CUMPLIDA' },
        6: { fechaFin: '2026-10-27', estado: 'VENCIDO', diasRestantes: -2 },
        7: { fechaFin: '2026-11-02', estado: 'POR_VENCER', diasRestantes: 4 },
      }) as never,
    );
    render(<CronogramaPorEtapas procesoId="p-1" />);

    expect(await screen.findByText('Cumplida')).toBeInTheDocument();
    expect(screen.getByText('Vencida hace 2 días')).toBeInTheDocument();
    expect(screen.getByText('Faltan 4 días')).toBeInTheDocument();
    expect(screen.queryByText(/Nombre 9/)).not.toBeInTheDocument();
  });

  it('al editar solo salen las predeterminadas; las demás se agregan del desplegable', async () => {
    conPredeterminadas([6]);
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma() as never);
    render(<CronogramaPorEtapas procesoId="p-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Programar las etapas/ }));
    expect(screen.getByLabelText('Fin de la etapa 6')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fin de la etapa 8')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Agregar una etapa al cronograma'), '8');
    expect(screen.getByLabelText('Fin de la etapa 8')).toBeInTheDocument();
  });

  it('no deja guardar un inicio sin fin', async () => {
    conPredeterminadas([6]);
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma() as never);
    render(<CronogramaPorEtapas procesoId="p-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Programar las etapas/ }));
    await userEvent.type(screen.getByLabelText('Inicio de la etapa 6'), '2026-11-01');

    expect(screen.getByText(/Etapa 6: falta la fecha de fin/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar el cronograma/ })).toBeDisabled();
  });

  it('guarda todas las etapas, con nulo en las que no se programan o se quitan', async () => {
    conPredeterminadas([6, 7]);
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma({ 7: { fechaFin: '2026-12-15', estado: 'VIGENTE', diasRestantes: 40 } }) as never,
    );
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronograma')
      .mockResolvedValue(cronograma({ 6: { fechaFin: '2026-11-30', estado: 'VIGENTE', diasRestantes: 32 } }) as never);
    render(<CronogramaPorEtapas procesoId="p-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /Editar el cronograma/ }));
    await userEvent.type(screen.getByLabelText('Fin de la etapa 6'), '2026-11-30');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la etapa 7 del cronograma' }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar el cronograma/ }));

    const enviadas = guardar.mock.calls[0][1];
    expect(enviadas).toHaveLength(6);
    expect(enviadas.find((e) => e.etapa === 6)).toMatchObject({ fechaFin: '2026-11-30' });
    expect(enviadas.find((e) => e.etapa === 7)).toMatchObject({ fechaFin: null });
    expect(await screen.findByText('Faltan 32 días')).toBeInTheDocument();
  });
});
