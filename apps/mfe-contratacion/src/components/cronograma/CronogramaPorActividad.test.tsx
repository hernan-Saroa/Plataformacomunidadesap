import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CronogramaPorActividad } from './CronogramaPorActividad';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const actividad = (cambios: Record<string, unknown> = {}) => ({
  numeral: '6.1',
  id: null,
  propia: false,
  nombre: 'Cierre del proceso y recepción de ofertas',
  etapa: 6,
  fechaInicio: null,
  fechaFin: null,
  diasAntes: null,
  avisarA: [],
  canal: 'CAMPANA',
  correos: [],
  nota: null,
  actualizadoPor: null,
  actualizadoAt: null,
  cumplidaAt: null,
  cumplidaPor: null,
  estado: 'SIN_FECHA',
  diasRestantes: null,
  ...cambios,
});

const propia = (cambios: Record<string, unknown> = {}) =>
  actividad({
    numeral: null,
    id: '0b6f4c1e-8a52-4f0e-9d7b-3c1a2e5f6a70',
    propia: true,
    nombre: 'Visita técnica al sitio',
    fechaFin: '2026-12-03',
    avisarA: ['QUIEN_LA_HACE'],
    estado: 'VIGENTE',
    diasRestantes: 10,
    ...cambios,
  });

const cronograma = (actividades: unknown[], historial: unknown[] = []) => ({
  anticipacion: 5,
  etapas: [],
  actividades,
  historial,
});

const predeterminado = (cambios: Record<string, unknown> = {}) => ({
  modalidad: 'LICITACION_PUBLICA',
  modalidadNombre: 'Licitación Pública',
  etapas: [6],
  numerales: [],
  propias: [],
  ...cambios,
});

/** El cronograma por actividad (sesión de QA del 04/11; desde la 144, solo lo predeterminado de entrada). */
describe('CronogramaPorActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'adendas').mockResolvedValue({ adendas: [] } as never);
    vi.spyOn(contratacionService, 'predeterminadoDelProceso').mockResolvedValue(predeterminado() as never);
  });

  it('agrupa lo programado por etapa en desplegables y muestra a quién y por dónde se avisa', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma([
        actividad({
          fechaFin: '2026-12-01',
          diasAntes: 3,
          avisarA: ['ABOGADO_ESTRUCTURADOR'],
          canal: 'AMBOS',
          estado: 'VIGENTE',
          diasRestantes: 20,
        }),
      ]) as never,
    );
    render(<CronogramaPorActividad procesoId="p-1" />);

    // La etapa sin nada vencido arranca cerrada.
    const etapa = await screen.findByRole('button', { name: /Etapa 6 · Recepción y evaluación de ofertas/ });
    expect(screen.queryByText(/3 días antes/)).not.toBeInTheDocument();
    await usuario.click(etapa);

    expect(screen.getByText(/3 días antes · Abogado estructurador/)).toBeInTheDocument();
    expect(screen.getByText(/Campanita y correo/)).toBeInTheDocument();
  });

  it('abre de entrada la etapa que tiene algo vencido', async () => {
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma([actividad({ fechaFin: '2026-11-01', estado: 'VENCIDO', diasRestantes: -3 })]) as never,
    );
    render(<CronogramaPorActividad procesoId="p-1" />);

    expect(await screen.findByText(/Vencida hace 3 días/)).toBeInTheDocument();
    expect(screen.getByText(/1 vencida/)).toBeInTheDocument();
  });

  it('de entrada solo trae lo predeterminado de la modalidad; lo demás se agrega del desplegable', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'predeterminadoDelProceso').mockResolvedValue(
      predeterminado({ numerales: ['6.1'] }) as never,
    );
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma([actividad(), actividad({ numeral: '6.6', nombre: 'Subsanaciones' })]) as never,
    );
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Programar actividades/ }));
    expect(screen.getByLabelText('Fin de la actividad 6.1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fin de la actividad 6.6')).not.toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Agregar una actividad del flujo al cronograma'), '6.6');
    await usuario.type(screen.getByLabelText('Fin de la actividad 6.6'), '2026-12-20');
    await usuario.type(screen.getByLabelText('Fin de la actividad 6.1'), '2026-12-01');
    await usuario.type(screen.getByLabelText('Días de aviso de la actividad 6.1'), '2');
    await usuario.selectOptions(screen.getByLabelText('Canal del aviso de la actividad 6.1'), 'CORREO');
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [, enviadas] = guardar.mock.calls[0];
    expect(enviadas).toEqual([
      expect.objectContaining({ numeral: '6.1', fechaFin: '2026-12-01', diasAntes: 2, avisarA: ['QUIEN_LA_HACE'], canal: 'CORREO' }),
      expect.objectContaining({ numeral: '6.6', fechaFin: '2026-12-20' }),
    ]);
  });

  it('quitar una actividad del formulario la saca del cronograma al guardar', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma([actividad({ fechaFin: '2026-12-01', estado: 'VIGENTE', diasRestantes: 10 })]) as never,
    );
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Editar el cronograma por actividad/ }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar la actividad 6.1' }));
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0][1]).toEqual([]);
  });

  it('agrega una actividad propia con nombre, etapa y fecha de fin (139)', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([actividad()]) as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Programar actividades/ }));
    await usuario.selectOptions(screen.getByLabelText('Agregar una actividad propia al cronograma'), '6');

    // Sin nombre no se deja guardar.
    expect(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ })).toBeDisabled();

    await usuario.type(screen.getByLabelText('Nombre de la actividad propia'), 'Visita técnica');
    await usuario.type(screen.getByLabelText('Fin de la actividad Visita técnica'), '2026-12-03');
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [, enviadas] = guardar.mock.calls[0];
    expect(enviadas).toHaveLength(1);
    expect(enviadas[0]).toMatchObject({ id: null, nombre: 'Visita técnica', etapa: 6, fechaFin: '2026-12-03' });
    expect(enviadas[0]).not.toHaveProperty('numeral');
  });

  it('las propias del predeterminado entran sin fecha y no se guardan si no se les pone', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'predeterminadoDelProceso').mockResolvedValue(
      predeterminado({ propias: [{ nombre: 'Mesa de trabajo', etapa: 6 }] }) as never,
    );
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([actividad()]) as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Programar actividades/ }));
    expect(screen.getByLabelText('Nombre de la actividad propia')).toHaveValue('Mesa de trabajo');
    expect(screen.getByText('Sin fecha de fin no se guarda.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(guardar.mock.calls[0][1]).toEqual([]);
  });

  it('marca cumplida a mano una actividad propia (139)', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([propia()]) as never);
    const marcar = vi
      .spyOn(contratacionService, 'marcarCumplidaCronograma')
      .mockResolvedValue(cronograma([propia({ estado: 'CUMPLIDA', cumplidaAt: '2026-11-05T10:00:00Z' })]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Etapa 6/ }));
    expect(screen.getByText('Propia')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Marcar cumplida/ }));

    await waitFor(() => expect(marcar).toHaveBeenCalledWith('p-1', '0b6f4c1e-8a52-4f0e-9d7b-3c1a2e5f6a70', true));
    expect(await screen.findByRole('button', { name: /Volver a vigilar/ })).toBeInTheDocument();
  });
});
