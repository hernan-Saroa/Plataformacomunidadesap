import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CadenasDeAprobacion } from './CadenasDeAprobacion';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cadena = {
  id: 'c-1',
  nombre: 'Técnico y director',
  descripcion: null,
  permiteMismoAprobador: false,
  escalones: [
    {
      nombre: 'Técnico',
      roles: ['REVISOR_CONTRATACION'],
      personas: [],
      papeles: [],
      reglaDecision: 'UNO',
      acciones: ['APROBAR', 'DEVOLVER'],
      nombresRoles: ['Revisor de Contratación'],
      nombresPersonas: [],
      nombresPapeles: [],
    },
    {
      nombre: 'Director',
      roles: ['DIRECTOR_CONTRATACION'],
      personas: [],
      papeles: [],
      reglaDecision: 'UNO',
      acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'],
      nombresRoles: ['Director de Contratación'],
      nombresPersonas: [],
      nombresPapeles: [],
    },
  ],
  usadaEn: [{ numeral: '5.2', nombre: 'Proyecto de pliego' }],
  updatedAt: '2026-10-14T10:00:00Z',
  updatedBy: 'admin',
};

/**
 * Las cadenas de aprobación en Configuraciones (migración 101).
 */
describe('CadenasDeAprobacion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fijarAlcance({ alcances: [], transversales: ['contratacion.config.manage'] });
  });

  it('muestra cada escalón en orden, con quién decide, qué puede hacer y dónde se usa', async () => {
    vi.spyOn(contratacionService, 'cadenasDeAprobacion').mockResolvedValue([cadena] as never);
    render(<CadenasDeAprobacion />);

    expect(await screen.findByText('Técnico y director')).toBeInTheDocument();
    expect(screen.getByText('Revisor de Contratación')).toBeInTheDocument();
    expect(screen.getByText('Aprobar · Devolver · Negar')).toBeInTheDocument();
    expect(screen.getByText(/La usan: 5.2 Proyecto de pliego/)).toBeInTheDocument();
    // En uso no se archiva: dejaría la actividad sin aprobación sin decidirlo.
    expect(screen.getByRole('button', { name: /Archivar/ })).toBeDisabled();
  });

  it('al guardar muestra todo lo que el servidor dice que falta', async () => {
    vi.spyOn(contratacionService, 'cadenasDeAprobacion').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'guardarCadenaDeAprobacion').mockRejectedValue(
      new Error('La cadena necesita un nombre. El escalón 1 no tiene quién decida'),
    );
    render(<CadenasDeAprobacion />);

    await userEvent.click(await screen.findByRole('button', { name: /Nueva cadena/ }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar la cadena/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El escalón 1 no tiene quién decida');
  });

  it('aprobar no se puede apagar en ningún escalón', async () => {
    vi.spyOn(contratacionService, 'cadenasDeAprobacion').mockResolvedValue([] as never);
    render(<CadenasDeAprobacion />);

    await userEvent.click(await screen.findByRole('button', { name: /Nueva cadena/ }));

    expect(screen.getByRole('checkbox', { name: 'Aprobar' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Negar' })).not.toBeChecked();
  });
});
