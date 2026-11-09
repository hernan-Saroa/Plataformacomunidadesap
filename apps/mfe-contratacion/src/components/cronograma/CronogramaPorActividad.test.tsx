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

/** El cronograma por actividad (sesión de QA del 04/11, EFDS-1152). */
describe('CronogramaPorActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'adendas').mockResolvedValue({ adendas: [] } as never);
  });

  it('muestra a quién y por dónde se avisa cada actividad programada', async () => {
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

    expect(await screen.findByText(/3 días antes · Abogado estructurador/)).toBeInTheDocument();
    expect(screen.getByText(/Campanita y correo/)).toBeInTheDocument();
  });

  it('programa una actividad con días de aviso, destinatario y canal', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([actividad()]) as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Programar actividades/ }));
    await usuario.type(screen.getByLabelText('Fin de la actividad 6.1'), '2026-12-01');
    await usuario.type(screen.getByLabelText('Días de aviso de la actividad 6.1'), '2');
    await usuario.selectOptions(screen.getByLabelText('Canal del aviso de la actividad 6.1'), 'CORREO');
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [, enviadas] = guardar.mock.calls[0];
    expect(enviadas[0]).toMatchObject({
      numeral: '6.1',
      fechaFin: '2026-12-01',
      diasAntes: 2,
      avisarA: ['QUIEN_LA_HACE'],
      canal: 'CORREO',
    });
  });

  it('agrega una actividad propia con nombre, etapa y fecha de fin (139)', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([actividad()]) as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Programar actividades/ }));
    await usuario.click(screen.getByRole('button', { name: /Agregar una actividad propia a la etapa 6/ }));

    // Sin nombre ni fecha de fin no se deja guardar.
    expect(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ })).toBeDisabled();

    await usuario.type(screen.getByLabelText('Nombre de la actividad propia'), 'Visita técnica');
    await usuario.type(screen.getByLabelText('Fin de la actividad Visita técnica'), '2026-12-03');
    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));

    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [, enviadas] = guardar.mock.calls[0];
    expect(enviadas).toHaveLength(2);
    expect(enviadas[1]).toMatchObject({ id: null, nombre: 'Visita técnica', etapa: 6, fechaFin: '2026-12-03' });
    expect(enviadas[1]).not.toHaveProperty('numeral');
  });

  it('marca cumplida a mano una actividad propia (139)', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(cronograma([propia()]) as never);
    const marcar = vi
      .spyOn(contratacionService, 'marcarCumplidaCronograma')
      .mockResolvedValue(cronograma([propia({ estado: 'CUMPLIDA', cumplidaAt: '2026-11-05T10:00:00Z' })]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    expect(await screen.findByText(/Propia · etapa 6/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Marcar cumplida/ }));

    await waitFor(() => expect(marcar).toHaveBeenCalledWith('p-1', '0b6f4c1e-8a52-4f0e-9d7b-3c1a2e5f6a70', true));
    expect(await screen.findByRole('button', { name: /Volver a vigilar/ })).toBeInTheDocument();
  });
  it('carga como propuesta el cronograma predeterminado de la modalidad (140)', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'cronograma').mockResolvedValue(
      cronograma([actividad(), actividad({ numeral: '6.6', nombre: 'Subsanaciones', fechaFin: '2026-12-20', estado: 'VIGENTE', diasRestantes: 30 })]) as never,
    );
    const propuesta = vi.spyOn(contratacionService, 'propuestaCronograma').mockResolvedValue({
      modalidad: 'LICITACION_PUBLICA',
      modalidadNombre: 'Licitación Pública',
      diaCero: '2026-12-07',
      actividades: [
        { numeral: '6.1', nombre: 'Cierre', etapa: 6, fechaInicio: null, fechaFin: '2026-12-17', diasAntes: 2, avisarA: ['ABOGADO_REVISOR'], canal: 'AMBOS', correos: [], nota: null },
        { numeral: '6.6', nombre: 'Subsanaciones', etapa: 6, fechaInicio: null, fechaFin: '2026-12-22', diasAntes: null, avisarA: [], canal: 'CAMPANA', correos: [], nota: null },
        { numeral: null, nombre: 'Visita técnica', etapa: 6, fechaInicio: '2026-12-09', fechaFin: '2026-12-10', diasAntes: null, avisarA: ['QUIEN_LA_HACE'], canal: 'CAMPANA', correos: [], nota: null },
      ],
    } as never);
    const guardar = vi
      .spyOn(contratacionService, 'guardarCronogramaActividades')
      .mockResolvedValue(cronograma([actividad()]) as never);
    render(<CronogramaPorActividad procesoId="p-1" />);

    await usuario.click(await screen.findByRole('button', { name: /Editar el cronograma por actividad/ }));
    const dia = screen.getByLabelText('Día cero del cronograma predeterminado');
    await usuario.clear(dia);
    await usuario.type(dia, '2026-12-07');
    await usuario.click(screen.getByRole('button', { name: /Cargar las fechas/ }));

    await waitFor(() => expect(propuesta).toHaveBeenCalledWith('p-1', '2026-12-07'));
    // La 6.6 ya tenía fecha: se deja, porque no se pidió reemplazar.
    expect(await screen.findByText(/Se cargaron 2 fechas .*1 ya tenía fecha y se dejó como estaba/)).toBeInTheDocument();
    expect(screen.getByLabelText('Fin de la actividad 6.1')).toHaveValue('2026-12-17');
    expect(screen.getByLabelText('Fin de la actividad 6.6')).toHaveValue('2026-12-20');

    await usuario.click(screen.getByRole('button', { name: /Guardar el cronograma por actividad/ }));
    await waitFor(() => expect(guardar).toHaveBeenCalled());
    const [, enviadas, origen] = guardar.mock.calls[0];
    expect(enviadas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ numeral: '6.1', fechaFin: '2026-12-17', diasAntes: 2, avisarA: ['ABOGADO_REVISOR'], canal: 'AMBOS' }),
        expect.objectContaining({ id: null, nombre: 'Visita técnica', etapa: 6, fechaInicio: '2026-12-09', fechaFin: '2026-12-10' }),
      ]),
    );
    expect(origen).toMatchObject({ motivo: 'Cronograma predeterminado de Licitación Pública' });
  });
});
