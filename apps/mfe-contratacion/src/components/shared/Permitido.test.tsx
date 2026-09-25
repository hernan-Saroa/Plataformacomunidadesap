import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fijarAlcance, olvidarAlcance } from '../../auth/alcance';
import { Permitido } from './Permitido';

// El alcance se fija a mano en cada caso: que el hook no salga a pedirlo.
vi.mock('../../services/contratacionService', () => ({
  contratacionService: { alcanceMio: vi.fn(() => new Promise(() => undefined)) },
}));

/**
 * Qué ve quien no puede ejecutar la acción (EFDS-1183, migración 083).
 *
 * Esconder no es la protección —el guard del servicio ya niega lo que
 * corresponda— sino no pintar puertas falsas: un botón que responde 403 lleva
 * al usuario a concluir que la plataforma está rota.
 */
describe('Permitido', () => {
  const conAlcance = (...lugares: [string, string][]) =>
    act(() =>
      fijarAlcance({
        alcances: lugares.map(([accion, lugar]) => ({ accion: accion as never, lugar })),
        transversales: [],
      }),
    );

  afterEach(() => olvidarAlcance());

  it('muestra la acción a quien la tiene en ese punto', () => {
    conAlcance(['editar', '5.6']);
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('y a quien la tiene en toda la etapa', () => {
    conAlcance(['editar', 'E5']);
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('la esconde a quien la tiene en otro punto', () => {
    conAlcance(['editar', '5.5']);
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('ver el punto no es editarlo', () => {
    conAlcance(['ver', 'E5']);
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('con `quien`, explica en vez de dejar un hueco', () => {
    conAlcance(['ver', 'TODO']);
    render(
      <Permitido accion="editar" punto="5.6" quien="el gestor de contratación">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByText(/lo realiza el gestor de contratación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('sin `quien`, no deja rastro', () => {
    // Donde la pantalla ya dice quién actúa, un aviso más sería ruido.
    conAlcance(['ver', 'TODO']);
    const { container } = render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('mientras el alcance no llega no esconde nada', () => {
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('y cuando llega se esconde sin recargar', () => {
    render(
      <Permitido accion="editar" punto="5.6">
        <button>Registrar</button>
      </Permitido>,
    );
    conAlcance(['ver', 'TODO']);

    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });
});
