import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RielActividades } from './RielActividades';
import { ActividadEtapa } from './ListaActividades';

const actividades: ActividadEtapa[] = [
  { numeral: '5.1', nombre: 'Documentos del proceso', etapa: 5, estado: 'aprobada', disponible: true },
  { numeral: '5.2', nombre: 'Publicación del proyecto de pliego', etapa: 5, estado: 'en_curso', disponible: true },
  { numeral: '5.5', nombre: 'Audiencia de riesgos', etapa: 5, estado: 'no_aplica', disponible: false },
  { numeral: '5.6', nombre: 'Adendas', etapa: 5, estado: 'no_aplica', disponible: false },
  { numeral: '6.1', nombre: 'Cierre y lista de oferentes', etapa: 6, estado: 'pendiente', disponible: true },
  { numeral: '9.1', nombre: 'Reunión de inicio', etapa: 9, estado: 'pendiente', disponible: false },
];

const pintar = (etapa = 5, onSeleccionar = vi.fn()) =>
  render(
    <RielActividades
      etapa={etapa}
      etapaActual={5}
      actividades={actividades}
      seleccionada={null}
      onSeleccionar={onSeleccionar}
    />,
  );

describe('RielActividades · solo la etapa que la línea del tiempo tenga elegida', () => {
  it('muestra las actividades de la etapa en vista', () => {
    pintar(5);
    expect(screen.getByText('Documentos del proceso')).toBeInTheDocument();
    expect(screen.getByText('Publicación del proyecto de pliego')).toBeInTheDocument();
  });

  it('no muestra las de las demás etapas', () => {
    pintar(5);
    expect(screen.queryByText('Cierre y lista de oferentes')).toBeNull();
    expect(screen.queryByText('Reunión de inicio')).toBeNull();
  });

  it('cambia de contenido al cambiar de etapa', () => {
    const { unmount } = pintar(5);
    unmount();
    pintar(6);
    expect(screen.getByText('Cierre y lista de oferentes')).toBeInTheDocument();
    expect(screen.queryByText('Documentos del proceso')).toBeNull();
  });

  it('marca la etapa del proceso como la actual', () => {
    pintar(5);
    expect(screen.getByText('Actual')).toBeInTheDocument();
  });

  it('no marca como actual una etapa que solo se está mirando', () => {
    pintar(6);
    expect(screen.queryByText('Actual')).toBeNull();
  });
});

describe('RielActividades · las actividades no llevan su numeral a la vista', () => {
  it('el nombre se muestra solo', () => {
    pintar(5);
    // Si el numeral siguiera en la etiqueta, el texto sería «5.1 Documentos…»
    // y esta consulta exacta no encontraría nada.
    expect(screen.getByText('Documentos del proceso')).toBeInTheDocument();
    expect(screen.queryByText(/5\.1/)).toBeNull();
  });

  it('el numeral sigue disponible al señalar, que es para lo que sirve', () => {
    pintar(5);
    expect(
      screen.getByTitle('5.1 · Documentos del proceso'),
    ).toBeInTheDocument();
  });
});

describe('RielActividades · las que la modalidad excluye', () => {
  it('no se listan entre las actividades', () => {
    pintar(5);
    expect(screen.queryByText('Audiencia de riesgos')).toBeNull();
    expect(screen.queryByText('Adendas')).toBeNull();
  });

  it('no cuentan en el avance de la etapa', () => {
    // Cinco actividades de la etapa 5, dos excluidas, una aprobada: 1/2.
    pintar(5);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('se cuentan al pie para no perder el rastro', () => {
    pintar(5);
    expect(screen.getByText('2 no aplican a esta modalidad')).toBeInTheDocument();
  });

  it('se pueden desplegar', async () => {
    pintar(5);
    await userEvent.click(screen.getByText('2 no aplican a esta modalidad'));
    expect(screen.getByText('Audiencia de riesgos')).toBeInTheDocument();
    expect(screen.getByText('Adendas')).toBeInTheDocument();
  });

  it('concuerda el singular cuando es una sola', () => {
    render(
      <RielActividades
        etapa={5}
        etapaActual={5}
        actividades={[
          actividades[0],
          { numeral: '5.6', nombre: 'Adendas', etapa: 5, estado: 'no_aplica', disponible: false },
        ]}
        seleccionada={null}
        onSeleccionar={vi.fn()}
      />,
    );
    expect(screen.getByText('1 no aplica a esta modalidad')).toBeInTheDocument();
  });

  it('lo dice cuando la modalidad excluye la etapa entera', () => {
    render(
      <RielActividades
        etapa={5}
        etapaActual={5}
        actividades={[actividades[2], actividades[3]]}
        seleccionada={null}
        onSeleccionar={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ninguna actividad de esta etapa aplica/)).toBeInTheDocument();
  });
});

describe('RielActividades · qué se puede pulsar', () => {
  it('avisa al seleccionar una actividad disponible', async () => {
    const onSeleccionar = vi.fn();
    pintar(5, onSeleccionar);

    await userEvent.click(screen.getByText('Publicación del proyecto de pliego'));
    expect(onSeleccionar).toHaveBeenCalledWith('5.2');
  });

  it('no deja pulsar la que todavía no está habilitada', () => {
    render(
      <RielActividades
        etapa={9}
        etapaActual={5}
        actividades={actividades}
        seleccionada={null}
        onSeleccionar={vi.fn()}
      />,
    );
    expect(screen.getByText('Reunión de inicio').closest('button')).toBeDisabled();
  });
});
