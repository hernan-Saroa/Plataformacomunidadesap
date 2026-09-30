import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaPorRevisar } from './VistaPorRevisar';
import { ElementoPorRevisar } from '../../types';

const elemento = (cambios: Partial<ElementoPorRevisar>): ElementoPorRevisar => ({
  tipo: 'ACTIVIDAD',
  detalle: null,
  procesoId: 'p-1',
  radicado: 'CTO-2026-0001',
  objeto: 'Servicio de vigilancia',
  modalidad: 'Mínima Cuantía',
  numeral: '4.1',
  actividad: 'Solicitud de CDP',
  etapa: 4,
  version: 1,
  enviadoPor: 'ana@esap.edu.co',
  desde: '2026-09-20T00:00:00.000Z',
  diasEsperando: 1,
  ...cambios,
});

/**
 * La bandeja «Por revisar» (reestructuración del flujo).
 *
 * Quien revisa ve de una vez todo lo que espera su decisión y entra a revisar
 * cada cosa sin pasar por el proceso.
 */
describe('VistaPorRevisar', () => {
  const pintar = (elementos: ElementoPorRevisar[], onRevisar = vi.fn()) => {
    render(
      <VistaPorRevisar
        elementos={elementos}
        cargando={false}
        error={null}
        onRecargar={vi.fn()}
        onRevisar={onRevisar}
      />,
    );
    return onRevisar;
  };

  it('cuenta lo pendiente, los estudios previos y lo demorado', () => {
    pintar([
      elemento({ tipo: 'ESTUDIO_PREVIO', numeral: '3.1', diasEsperando: 5 }),
      elemento({ numeral: '4.1', diasEsperando: 0 }),
    ]);

    // La etiqueta del contador, no el botón del filtro que se llama igual.
    const valor = (etiqueta: RegExp) =>
      screen
        .getAllByText(etiqueta)
        .find((e) => e.tagName === 'DT')
        ?.nextElementSibling?.textContent;
    expect(valor(/^Pendientes$/)).toBe('2');
    expect(valor(/^Estudios previos$/)).toBe('1');
    expect(valor(/^Más de 3 días$/)).toBe('1');
  });

  it('cada fila lleva a revisar ese elemento', async () => {
    const onRevisar = pintar([elemento({ numeral: '4.1' })]);

    await userEvent.click(screen.getByRole('button', { name: /Revisar/ }));

    expect(onRevisar).toHaveBeenCalledWith(expect.objectContaining({ procesoId: 'p-1', numeral: '4.1' }));
  });

  it('filtra por estudios previos', async () => {
    pintar([
      elemento({ tipo: 'ESTUDIO_PREVIO', numeral: '3.1', objeto: 'Aseo de sedes' }),
      elemento({ numeral: '4.1', objeto: 'Vigilancia' }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Estudios previos' }));

    expect(screen.getByText('Aseo de sedes')).toBeInTheDocument();
    expect(screen.queryByText('Vigilancia')).toBeNull();
  });

  it('sin nada pendiente lo dice en vez de enseñar una lista vacía', () => {
    pintar([]);

    expect(screen.getByText('No tienes nada por revisar')).toBeInTheDocument();
  });

  it('cada póliza o cuenta de cobro es su propia fila, con su detalle', async () => {
    const onRevisar = vi.fn();
    pintar(
      [
        elemento({ tipo: 'GARANTIA', numeral: '8.4', actividad: 'Garantías', detalle: 'Póliza PO-1 · Seguros A' }),
        elemento({ tipo: 'GARANTIA', numeral: '8.4', actividad: 'Garantías', detalle: 'Póliza PO-2 · Seguros B' }),
      ],
      onRevisar,
    );

    expect(screen.getByText(/Póliza PO-1 · Seguros A/)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Póliza PO-2 · Seguros B/));
    expect(onRevisar).toHaveBeenCalledWith(expect.objectContaining({ numeral: '8.4', detalle: 'Póliza PO-2 · Seguros B' }));
  });

  it('«Actividades» junta todo lo que no es estudio previo', async () => {
    pintar([
      elemento({ tipo: 'ESTUDIO_PREVIO', numeral: '3.1', objeto: 'Aseo de sedes' }),
      elemento({ tipo: 'PAGO', numeral: '9.4', objeto: 'Vigilancia', detalle: 'Cuenta de cobro N.º 3' }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Actividades' }));

    expect(screen.getByText('Vigilancia')).toBeInTheDocument();
    expect(screen.queryByText('Aseo de sedes')).toBeNull();
  });
});
