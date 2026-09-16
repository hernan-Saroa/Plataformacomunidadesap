import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AlertaCamposFaltantes } from './AlertaCamposFaltantes';

/**
 * Criterio 2 del HU: "el sistema impide avanzar y señala los campos faltantes".
 *
 * Señalar es lo que se prueba aquí: que los nombres aparezcan, que se anuncien
 * a un lector de pantalla y que lleven al campo. Un mensaje genérico de "faltan
 * datos" cumpliría el bloqueo pero no el criterio.
 */
describe('AlertaCamposFaltantes', () => {
  const faltantes = [
    { codigo: 'objeto_contratar', etiqueta: 'Objeto a contratar', grupo: 'Identificación' },
    { codigo: 'valor_estimado', etiqueta: 'Valor estimado del contrato', grupo: 'Valor y plazo' },
  ];

  it('no ocupa espacio cuando no falta nada', () => {
    // Sin esto la pantalla mostraría un recuadro de alerta vacío al abrir
    // un formulario que todavía no se ha intentado enviar.
    const { container } = render(<AlertaCamposFaltantes faltantes={[]} onIrACampo={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nombra cada campo que falta', () => {
    render(<AlertaCamposFaltantes faltantes={faltantes} onIrACampo={vi.fn()} />);

    expect(screen.getByText('Objeto a contratar')).toBeInTheDocument();
    expect(screen.getByText('Valor estimado del contrato')).toBeInTheDocument();
  });

  it('concuerda el singular con un solo campo', () => {
    render(<AlertaCamposFaltantes faltantes={[faltantes[0]]} onIrACampo={vi.fn()} />);

    expect(screen.getByText('Falta 1 campo obligatorio')).toBeInTheDocument();
  });

  it('usa el plural con varios campos', () => {
    render(<AlertaCamposFaltantes faltantes={faltantes} onIrACampo={vi.fn()} />);

    expect(screen.getByText('Faltan 2 campos obligatorios')).toBeInTheDocument();
  });

  it('se anuncia como alerta', () => {
    // El bloqueo ocurre tras pulsar Enviar, así que el aviso aparece lejos del
    // foco: sin role de alerta un lector de pantalla no lo mencionaría.
    render(<AlertaCamposFaltantes faltantes={faltantes} onIrACampo={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('lleva al campo al pulsar su nombre', async () => {
    // Con 12 campos en cuatro grupos, nombrar el faltante no basta si el
    // usuario tiene que buscarlo a mano.
    const irACampo = vi.fn();
    render(<AlertaCamposFaltantes faltantes={faltantes} onIrACampo={irACampo} />);

    await userEvent.click(screen.getByRole('button', { name: 'Objeto a contratar' }));

    expect(irACampo).toHaveBeenCalledWith('objeto_contratar');
  });

  it('indica a qué grupo pertenece cada campo', () => {
    render(<AlertaCamposFaltantes faltantes={faltantes} onIrACampo={vi.fn()} />);

    expect(screen.getByText(/Identificación/)).toBeInTheDocument();
    expect(screen.getByText(/Valor y plazo/)).toBeInTheDocument();
  });
});
