import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contratacionService } from '../../services/contratacionService';
import { RolConAlcance } from '../../types';
import { PermisosPorEtapa } from './PermisosPorEtapa';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    alcanceRoles: vi.fn(),
    catalogoActividades: vi.fn(),
    guardarAlcanceRol: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  alcanceRoles: ReturnType<typeof vi.fn>;
  catalogoActividades: ReturnType<typeof vi.fn>;
  guardarAlcanceRol: ReturnType<typeof vi.fn>;
};

const actividad = (numeral: string, nombre: string) => ({
  numeral,
  etapa: Number(numeral.split('.')[0]),
  nombre,
  orden: 1,
  activa: true,
});

const CATALOGO = [
  { etapa: 3, actividades: [actividad('3.1', 'Estudios previos'), actividad('3.4', 'Revisión')] },
  { etapa: 7, actividades: [actividad('7.1', 'Audiencia'), actividad('7.2', 'Sobre económico')] },
];

/** El caso que dio origen a la 083: el área Legal ve la 3 y solo la 7.2 de la 7. */
const LEGAL: RolConAlcance = {
  id: 'r-legal',
  codigo: 'AREA_LEGAL',
  nombre: 'Área Legal',
  descripcion: null,
  acciones: ['ver'],
  transversales: [],
  alcances: [
    { accion: 'ver', lugar: 'E3', confirmado: true },
    { accion: 'ver', lugar: '7.2', confirmado: true },
  ],
};

const casilla = (nombre: string) => screen.getByRole('checkbox', { name: nombre }) as HTMLInputElement;

/**
 * La pantalla de permisos por etapa (migración 083, subtarea 6).
 *
 * El permiso de cada acción se da en el backoffice; aquí se marca dónde aplica.
 */
describe('PermisosPorEtapa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.alcanceRoles.mockResolvedValue([LEGAL]);
    servicio.catalogoActividades.mockResolvedValue(CATALOGO);
    servicio.guardarAlcanceRol.mockImplementation(async (_id: string, alcances: unknown[]) => ({
      ...LEGAL,
      alcances,
    }));
  });

  it('enseña el alcance del rol: la etapa 3 y, de la 7, solo la 7.2', async () => {
    render(<PermisosPorEtapa />);

    await waitFor(() => expect(casilla('Ver en la etapa 3').checked).toBe(true));
    expect(casilla('Ver en la etapa 7').checked).toBe(false);
    // La etapa 7 se abre sola porque tiene un punto suelto marcado.
    expect(casilla('Ver en 7.2').checked).toBe(true);
    expect(casilla('Ver en 7.1').checked).toBe(false);
  });

  it('los puntos de una etapa marcada salen cubiertos y no se pueden desmarcar sueltos', async () => {
    const usuario = userEvent.setup();
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Ver en la etapa 3').checked).toBe(true));

    await usuario.click(screen.getByRole('button', { name: /Etapa 3/ }));

    expect(casilla('Ver en 3.1').checked).toBe(true);
    expect(casilla('Ver en 3.1').disabled).toBe(true);
  });

  it('avisa cuando marca una acción que el backoffice no le dio al rol', async () => {
    const usuario = userEvent.setup();
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Editar en 7.2')).toBeTruthy());

    await usuario.click(casilla('Editar en 7.2'));

    expect(screen.getByText(/Sin efecto todavía/)).toBeInTheDocument();
    expect(screen.getByText(/«Editar»/)).toBeInTheDocument();
  });

  it('avisa cuando el mismo rol diligencia y aprueba el mismo punto', async () => {
    const usuario = userEvent.setup();
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Editar en 7.2')).toBeTruthy());

    await usuario.click(casilla('Editar en 7.2'));
    await usuario.click(casilla('Aprobar en 7.2'));

    expect(screen.getByText(/Diligencia y aprueba lo mismo/)).toBeInTheDocument();
  });

  it('guarda el alcance entero del rol, como lugares', async () => {
    const usuario = userEvent.setup();
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Ver en la etapa 7')).toBeTruthy());

    await usuario.click(casilla('Ver en la etapa 7'));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(servicio.guardarAlcanceRol).toHaveBeenCalled());
    const [rolId, alcances] = servicio.guardarAlcanceRol.mock.calls[0];
    expect(rolId).toBe('r-legal');
    expect(alcances).toEqual(
      expect.arrayContaining([
        { accion: 'ver', lugar: 'E3' },
        { accion: 'ver', lugar: '7.2' },
        { accion: 'ver', lugar: 'E7' },
      ]),
    );
    expect(await screen.findByText(/Guardado/)).toBeInTheDocument();
  });

  it('sin cambios no hay nada que guardar', async () => {
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Ver en la etapa 3').checked).toBe(true));

    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });
  it('parte de un perfil por defecto copiando el alcance del rol que lo encarna', async () => {
    // Los cinco perfiles de la Dirección (EFDS-1183): el abogado es el revisor.
    const abogado: RolConAlcance = {
      id: 'r-revisor',
      codigo: 'REVISOR_CONTRATACION',
      nombre: 'Revisor de Contratación',
      descripcion: null,
      acciones: ['ver', 'aprobar'],
      transversales: [],
      alcances: [
        { accion: 'ver', lugar: 'TODO', confirmado: true },
        { accion: 'aprobar', lugar: 'E3', confirmado: true },
      ],
    };
    servicio.alcanceRoles.mockResolvedValue([LEGAL, abogado]);
    const usuario = userEvent.setup();
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Ver en la etapa 3').checked).toBe(true));

    await usuario.click(screen.getByRole('button', { name: 'Abogado' }));

    expect(casilla('Ver en todo el módulo').checked).toBe(true);
    expect(casilla('Aprobar en la etapa 3').checked).toBe(true);
    // No lo guarda solo: queda para revisar.
    expect(servicio.guardarAlcanceRol).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('no ofrece perfiles cuyo rol no existe en esta instalación', async () => {
    render(<PermisosPorEtapa />);
    await waitFor(() => expect(casilla('Ver en la etapa 3').checked).toBe(true));

    expect(screen.queryByRole('button', { name: 'Abogado' })).toBeNull();
  });
});
