import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelRadicacion } from './PanelRadicacion';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const participante = (nombre: string, cambios: Record<string, unknown> = {}) => ({
  id: 'x-1',
  usuarioId: 'u-laura',
  usuarioNombre: 'laura.pineda@esap.edu.co',
  nombre,
  cargo: null,
  email: null,
  asignadoPor: null,
  asignadoAt: '2026-09-09T14:00:00.000Z',
  esMio: false,
  ...cambios,
});

const estado = (cambios: Record<string, unknown> = {}) => ({
  puedeTomar: false,
  puedeRepartir: false,
  contratacion: null,
  financiera: null,
  historial: [],
  ...cambios,
});

const ABOGADO = {
  id: 'p-abogado',
  nombre: 'Abogado',
  descripcion: null,
  obligatorio: true,
  usos: [
    { numeral: '3.6', nombreActividad: 'Causal', como: 'HACE' as const },
    { numeral: '3.1', nombreActividad: 'Estudio previo', como: 'APRUEBA' as const },
  ],
  ocupante: null,
  problema: null,
};

const puestos = (cambios: Record<string, unknown> = {}, lista = [ABOGADO]) => ({
  puedeAsignar: false,
  puestos: lista,
  historial: [],
  ...cambios,
});

/**
 * Actividad 3.3 · Radicación en la Dirección (EFDS-1183, 109).
 *
 * Radicar es recibir el proceso y poner a una persona en cada puesto. Los
 * puestos no están escritos en la pantalla: los configura la Dirección, y la
 * 3.3 solo los ocupa. Ya no hay un paso fijo para el abogado.
 */
describe('PanelRadicacion · recibir y asignar los puestos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const pintar = (datos: Record<string, unknown>, datosPuestos: unknown = puestos()) => {
    vi.spyOn(contratacionService, 'participacion').mockResolvedValue(datos as never);
    vi.spyOn(contratacionService, 'puestosDelProceso').mockResolvedValue(datosPuestos as never);
    render(<PanelRadicacion procesoId="p-1" />);
  };

  it('en la bandeja, quien puede recibirlo ve el botón de tomar y los puestos esperan', async () => {
    pintar(estado({ puedeTomar: true }));

    expect(await screen.findByRole('button', { name: /Hacerme cargo/ })).toBeInTheDocument();
    expect(screen.getByText('Te toca')).toBeInTheDocument();
    expect(await screen.findByText('Asignar los puestos del proceso')).toBeInTheDocument();
    expect(screen.getByText('En espera')).toBeInTheDocument();
  });

  it('no hay un paso fijo de abogado: los pasos salen de los puestos configurados', async () => {
    pintar(estado({ contratacion: participante('Laura Pineda') }), puestos({}, []));

    expect(await screen.findByText('Hacerse cargo del proceso')).toBeInTheDocument();
    expect(screen.queryByText(/abogado/i)).toBeNull();
    expect(screen.queryByText('Asignar los puestos del proceso')).toBeNull();
  });

  it('dice cuántos puestos faltan y qué hace cada uno', async () => {
    pintar(estado({ contratacion: participante('Laura Pineda') }), puestos({ puedeAsignar: true }));

    expect(await screen.findByText(/Falta 1 puesto por asignar/)).toBeInTheDocument();
    expect(screen.getByText('Hace la 3.6; aprueba la 3.1.')).toBeInTheDocument();
    expect(screen.getByText(/Sin asignar/)).toBeInTheDocument();
  });

  it('asigna eligiendo entre los candidatos, los menos cargados primero', async () => {
    const usuario = userEvent.setup();
    pintar(estado({ contratacion: participante('Laura Pineda', { esMio: true }) }), puestos({ puedeAsignar: true }));
    vi.spyOn(contratacionService, 'candidatosAPuesto').mockResolvedValue([
      { usuarioId: 'u-1', usuarioNombre: 'a', personaId: null, nombre: 'Andrés Rojas', email: null, procesosEnElPuesto: 4 },
      { usuarioId: 'u-2', usuarioNombre: 'b', personaId: null, nombre: 'Beatriz Gil', email: null, procesosEnElPuesto: 1 },
    ] as never);
    const asignar = vi
      .spyOn(contratacionService, 'asignarPuesto')
      .mockResolvedValue(puestos({ puedeAsignar: true }, [{ ...ABOGADO, ocupante: null }]) as never);

    await usuario.click(await screen.findByRole('button', { name: 'Asignar' }));
    const selector = await screen.findByRole('combobox', { name: /Quién ocupa el puesto Abogado/ });
    await waitFor(() => expect(selector).not.toBeDisabled());
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones[1]).toMatch(/^Beatriz Gil/);

    await usuario.selectOptions(selector, 'u-2');
    await usuario.click(screen.getAllByRole('button', { name: 'Asignar' })[0]);

    expect(asignar).toHaveBeenCalledWith('p-1', 'p-abogado', 'u-2', undefined);
  });

  it('cambiar a quien ocupa el puesto exige motivo', async () => {
    const usuario = userEvent.setup();
    const ocupado = {
      ...ABOGADO,
      ocupante: {
        usuarioId: 'u-1',
        usuarioNombre: 'a',
        nombre: 'Andrés Rojas',
        asignadoAt: '2026-10-01T00:00:00Z',
        asignadoPor: null,
        esMio: false,
      },
    };
    pintar(estado({ contratacion: participante('Laura Pineda') }), puestos({ puedeAsignar: true }, [ocupado]));
    vi.spyOn(contratacionService, 'candidatosAPuesto').mockResolvedValue([
      { usuarioId: 'u-2', usuarioNombre: 'b', personaId: null, nombre: 'Beatriz Gil', email: null, procesosEnElPuesto: 0 },
    ] as never);

    await usuario.click(await screen.findByRole('button', { name: 'Cambiar' }));
    const selector = await screen.findByRole('combobox');
    await waitFor(() => expect(selector).not.toBeDisabled());
    await usuario.selectOptions(selector, 'u-2');

    const confirmar = screen.getAllByRole('button', { name: 'Cambiar' })[0];
    expect(confirmar).toBeDisabled();
    await usuario.type(screen.getByLabelText('Motivo del cambio'), 'Se fue de vacaciones dos meses');
    expect(confirmar).toBeEnabled();
  });

  it('dice qué le impide actuar a quien ocupa el puesto', async () => {
    const conProblema = {
      ...ABOGADO,
      ocupante: {
        usuarioId: 'u-1',
        usuarioNombre: 'a',
        nombre: 'Andrés Rojas',
        asignadoAt: '2026-10-01T00:00:00Z',
        asignadoPor: null,
        esMio: false,
      },
      problema: 'Andrés Rojas ya no puede aprobar la 3.6: reasígnalo o devuélvele el permiso en Permisos por etapa',
    };
    pintar(estado({ contratacion: participante('Laura Pineda') }), puestos({}, [conProblema]));

    expect(await screen.findByText(/ya no puede aprobar la 3\.6/)).toBeInTheDocument();
    expect(screen.getByText(/1 puesto necesita atención/)).toBeInTheDocument();
  });
});
