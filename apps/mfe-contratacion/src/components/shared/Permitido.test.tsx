import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Permitido } from './Permitido';

/**
 * Qué ve quien no puede ejecutar la acción (EFDS-1183).
 *
 * Esconder no es la protección —el guard del servicio ya niega lo que
 * corresponda— sino no pintar puertas falsas: un botón que responde 403 lleva
 * al usuario a concluir que la plataforma está rota.
 */
describe('Permitido', () => {
  const sesionCon = (...permisos: string[]) =>
    localStorage.setItem('user', JSON.stringify({ roles: [], permissions: permisos }));

  afterEach(() => localStorage.clear());

  it('muestra la acción a quien la tiene', () => {
    sesionCon('contratacion.actividad.edit');
    render(
      <Permitido permiso="contratacion.actividad.edit">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });

  it('la esconde a quien no', () => {
    sesionCon('contratacion.expediente.auditar');
    render(
      <Permitido permiso="contratacion.actividad.edit">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('con `quien`, explica en vez de dejar un hueco', () => {
    sesionCon('contratacion.expediente.auditar');
    render(
      <Permitido permiso="contratacion.actividad.edit" quien="el gestor de contratación">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByText(/lo realiza el gestor de contratación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar' })).toBeNull();
  });

  it('sin `quien`, no deja rastro', () => {
    // Donde la pantalla ya dice quién actúa, un aviso más sería ruido.
    sesionCon('contratacion.expediente.auditar');
    const { container } = render(
      <Permitido permiso="contratacion.actividad.edit">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('sin sesión no esconde nada', () => {
    render(
      <Permitido permiso="contratacion.actividad.edit">
        <button>Registrar</button>
      </Permitido>,
    );

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeInTheDocument();
  });
});
