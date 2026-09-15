import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check } from 'lucide-react';

import { AvisoSoloLectura, SoloLectura } from './SoloLectura';
import { Boton, BotonSecundario, SelectorArchivo } from './PiezasPanel';

/**
 * El bloqueo de secuencia se mudó del riel al panel (EFDS-1183).
 *
 * La actividad que la secuencia aún no alcanzó se abre y se lee; lo que no
 * ocurre es que reciba nada. Estas pruebas son sobre las piezas compartidas
 * porque es donde el bloqueo se aplica para los treinta y ocho paneles a la vez.
 */
describe('SoloLectura · las piezas que escriben se apagan solas', () => {
  it('apaga el botón que avanza la actividad', () => {
    render(
      <SoloLectura motivo="Antes hay que terminar 3.2">
        <Boton icono={<Check />}>Registrar</Boton>
      </SoloLectura>,
    );
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
  });

  it('lo deja encendido cuando la actividad sí se puede trabajar', () => {
    render(
      <SoloLectura motivo={null}>
        <Boton icono={<Check />}>Registrar</Boton>
      </SoloLectura>,
    );
    expect(screen.getByRole('button', { name: 'Registrar' })).not.toBeDisabled();
  });

  it('lo deja encendido fuera de todo bloqueo, que es el caso normal', () => {
    render(<Boton icono={<Check />}>Registrar</Boton>);
    expect(screen.getByRole('button', { name: 'Registrar' })).not.toBeDisabled();
  });

  it('apaga también el botón que corrige o devuelve', () => {
    render(
      <SoloLectura motivo="Antes hay que terminar 3.2">
        <BotonSecundario icono={<Check />}>Anular</BotonSecundario>
      </SoloLectura>,
    );
    expect(screen.getByRole('button', { name: 'Anular' })).toBeDisabled();
  });

  it('no deja elegir archivo: se subiría al registrar, y registrar no se puede', () => {
    render(
      <SoloLectura motivo="Antes hay que terminar 3.2">
        <SelectorArchivo etiqueta="Estudio previo" archivo={null} onElegir={vi.fn()} />
      </SoloLectura>,
    );
    expect(screen.getByRole('button', { name: /Elegir archivo/ })).toBeDisabled();
  });

  it('deja elegir archivo cuando no hay bloqueo', () => {
    render(<SelectorArchivo etiqueta="Estudio previo" archivo={null} onElegir={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Elegir archivo/ })).not.toBeDisabled();
  });

  it('el motivo queda en el botón, para que el candado se pueda leer', async () => {
    render(
      <SoloLectura motivo="Antes hay que terminar 3.2">
        <Boton icono={<Check />}>Registrar</Boton>
      </SoloLectura>,
    );
    expect(screen.getByTitle('Antes hay que terminar 3.2')).toBeInTheDocument();
  });

  it('un botón ya apagado por otra razón sigue apagado', async () => {
    const alPulsar = vi.fn();
    render(
      <SoloLectura motivo={null}>
        <Boton icono={<Check />} disabled onClick={alPulsar}>
          Registrar
        </Boton>
      </SoloLectura>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(alPulsar).not.toHaveBeenCalled();
  });
});

describe('AvisoSoloLectura · el candado explicado', () => {
  it('dice qué falta, para que el panel apagado no se lea como roto', () => {
    render(<AvisoSoloLectura motivo="Antes hay que terminar 3.2" />);
    expect(screen.getByText(/Antes hay que terminar 3\.2/)).toBeInTheDocument();
    expect(screen.getByText(/Puedes consultarla, pero todavía no trabajarla/)).toBeInTheDocument();
  });
});
