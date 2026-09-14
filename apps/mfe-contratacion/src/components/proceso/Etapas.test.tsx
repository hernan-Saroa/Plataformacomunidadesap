import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AvanceEtapa, ETAPAS, LineaDeTiempoEtapas } from './Etapas';

const avance: Record<number, AvanceEtapa> = {
  3: { aplicables: 6, completas: 6 },
  4: { aplicables: 4, completas: 4 },
  5: { aplicables: 5, completas: 2 },
  6: { aplicables: 4, completas: 0 },
};

const pintar = (etapaSeleccionada = 5, onSeleccionar = vi.fn()) =>
  render(
    <LineaDeTiempoEtapas
      etapaActual={5}
      etapaSeleccionada={etapaSeleccionada}
      onSeleccionar={onSeleccionar}
      avance={avance}
    />,
  );

describe('LineaDeTiempoEtapas · recorrer las etapas', () => {
  it('dibuja las diez etapas de la matriz', () => {
    pintar();
    for (const etapa of ETAPAS) {
      expect(screen.getByTitle(new RegExp(`Etapa ${etapa.numero} · `))).toBeInTheDocument();
    }
  });

  it('lleva a la etapa que se pulsa', async () => {
    const onSeleccionar = vi.fn();
    pintar(5, onSeleccionar);

    await userEvent.click(screen.getByTitle('Etapa 8 · Perfeccionamiento y Legalización'));
    expect(onSeleccionar).toHaveBeenCalledWith(8);
  });

  it('deja ir hacia atrás, a una etapa ya cerrada', async () => {
    const onSeleccionar = vi.fn();
    pintar(5, onSeleccionar);

    await userEvent.click(screen.getByTitle('Etapa 3 · Estudios Previos'));
    expect(onSeleccionar).toHaveBeenCalledWith(3);
  });

  it('no deja entrar a las etapas fuera de la Fase 1', () => {
    pintar();
    expect(
      screen.getByTitle('Etapa 1 · Identificación y Planeación (fuera de la Fase 1)'),
    ).toBeDisabled();
    expect(
      screen.getByTitle('Etapa 2 · Plan Anual de Adquisiciones (fuera de la Fase 1)'),
    ).toBeDisabled();
  });
});

describe('LineaDeTiempoEtapas · qué se ha hecho', () => {
  it('muestra el avance de cada etapa que tenga actividades', () => {
    pintar();
    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });

  it('no inventa un contador donde no hay actividades cargadas', () => {
    // Un "0/0" en la etapa 10 se leería como atraso y no como «todavía no
    // llegamos»: las etapas sin actividades no llevan contador.
    pintar();
    expect(screen.queryByText('0/0')).toBeNull();
  });

  it('la etapa completa no muestra su número, muestra que está hecha', () => {
    // La 3 y la 4 están completas, así que su círculo lleva el visto y no el
    // número. La 6, que va en 0/4, sí lo lleva.
    pintar();
    const completa = screen.getByTitle('Etapa 3 · Estudios Previos');
    expect(completa.textContent).not.toContain('3');
    const pendiente = screen.getByTitle('Etapa 6 · Recepción y Evaluación');
    expect(pendiente.textContent).toContain('6');
  });

  it('señala dónde está el proceso aunque se esté mirando otra etapa', () => {
    pintar(9);
    const actual = screen.getByTitle('Etapa 5 · Elaboración y Publicación');
    expect(actual.textContent).toContain('Actual');
  });

  it('lo señala una sola vez', () => {
    pintar(9);
    expect(screen.getAllByText('Actual')).toHaveLength(1);
  });
});
