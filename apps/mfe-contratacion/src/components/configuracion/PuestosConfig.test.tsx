import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contratacionService } from '../../services/contratacionService';
import { LaHaceActividad } from './LaHaceActividad';
import { PuestosConfig } from './PuestosConfig';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ABOGADO = {
  id: 'p-abogado',
  nombre: 'Abogado',
  descripcion: 'Revisa el estudio previo',
  obligatorio: true,
  orden: 1,
  activo: true,
  usos: [{ numeral: '3.6', nombreActividad: 'Causal', como: 'HACE' as const }],
};

/**
 * Los puestos del proceso en Configuración (109): los nombra la Dirección, y
 * el diagnóstico dice lo que la configuración de hoy deja sin salida.
 */
describe('PuestosConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'puestos').mockResolvedValue([ABOGADO] as never);
    vi.spyOn(contratacionService, 'diagnosticoDePuestos').mockResolvedValue([] as never);
  });

  it('enseña cada puesto con lo que hace', async () => {
    render(<PuestosConfig />);

    expect(await screen.findByText('Abogado')).toBeInTheDocument();
    expect(screen.getByText('Hace la 3.6')).toBeInTheDocument();
  });

  it('dice lo que la configuración deja sin salida', async () => {
    vi.spyOn(contratacionService, 'diagnosticoDePuestos').mockResolvedValue([
      { puestoId: 'p-abogado', numeral: null, mensaje: 'Nadie puede ocupar el puesto Abogado' },
    ] as never);
    render(<PuestosConfig />);

    expect(await screen.findByText(/Nadie puede ocupar el puesto Abogado/)).toBeInTheDocument();
  });

  it('crea un puesto con el nombre que le pone la Dirección', async () => {
    const usuario = userEvent.setup();
    const crear = vi.spyOn(contratacionService, 'crearPuesto').mockResolvedValue({} as never);
    render(<PuestosConfig />);

    await usuario.click(await screen.findByRole('button', { name: /Crear un puesto/ }));
    await usuario.type(screen.getByLabelText('Nombre del puesto'), 'Segundo abogado');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({ nombre: 'Segundo abogado', descripcion: null, obligatorio: false }),
    );
  });
});

/** Quién hace la actividad (109): un puesto, unas personas o quien tenga el permiso. */
describe('LaHaceActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'puestos').mockResolvedValue([ABOGADO] as never);
  });

  it('sin regla la hace quien tenga el permiso', async () => {
    vi.spyOn(contratacionService, 'laHaceDeActividad').mockResolvedValue({
      tipo: 'PERMISO',
      puesto: null,
      personas: [],
    } as never);
    render(<LaHaceActividad numeral="5.1" />);

    expect(await screen.findByRole('button', { name: /Quien tenga el permiso/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('elegir un puesto guarda la regla', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'laHaceDeActividad').mockResolvedValue({
      tipo: 'PERMISO',
      puesto: null,
      personas: [],
    } as never);
    const guardar = vi.spyOn(contratacionService, 'guardarLaHaceDeActividad').mockResolvedValue({
      tipo: 'PUESTO',
      puesto: { id: 'p-abogado', nombre: 'Abogado', activo: true },
      personas: [],
    } as never);
    render(<LaHaceActividad numeral="5.1" />);

    await usuario.click(await screen.findByRole('button', { name: /Quien ocupe un puesto del proceso/ }));
    await usuario.click(screen.getByRole('button', { name: 'Abogado' }));

    expect(guardar).toHaveBeenCalledWith('5.1', { puestoId: 'p-abogado' });
    expect(await screen.findByText(/Quien ocupe el puesto «Abogado»/)).toBeInTheDocument();
  });
});
