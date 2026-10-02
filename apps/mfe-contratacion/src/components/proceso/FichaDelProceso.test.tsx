import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FichaDelProceso } from './FichaDelProceso';
import { FranjaSituacion } from './FranjaSituacion';
import { PasoConDatos, Situacion } from './situacionDelProceso';

vi.mock('../participacion/PanelRadicacion', () => ({
  PanelRadicacion: () => <div>panel de radicación</div>,
}));
vi.mock('../supervision/PanelSupervision', () => ({
  PanelSupervision: () => <div>panel de supervisión</div>,
}));

const paso = (numeral: string, estado: string | null, cambios: Partial<PasoConDatos> = {}): PasoConDatos => ({
  numeral,
  nombre: `Actividad ${numeral}`,
  etapa: Number.parseInt(numeral, 10),
  estado,
  aplica: true,
  construida: true,
  ...cambios,
});

const situacion: Situacion = {
  momento: 'tramite',
  numeral: '3.5',
  titulo: 'Definir modalidad',
  etapa: 3,
  quien: 'Laura Pineda',
  teToca: false,
  espera: null,
  ultimoMovimiento: '2026-09-20T10:00:00Z',
};

const participacion = (cambios: Record<string, unknown> = {}) =>
  ({
    puedeTomar: false,
    puedeRepartir: true,
    contratacion: { nombre: 'Laura Pineda', esMio: true },
    abogado: null,
    financiera: null,
    puedeTomarFinanciera: false,
    sinAbogado: true,
    historial: [],
    ...cambios,
  }) as any;

const pintar = (cambios: { participacion?: any } = {}) => {
  const onAbrir = vi.fn();
  render(
    <FichaDelProceso
      procesoId="p-1"
      actividades={[
        { numeral: '3.1', nombre: 'Estudio previo', etapa: 3, estado: 'aprobada', disponible: true },
        { numeral: '3.5', nombre: 'Definir modalidad', etapa: 3, estado: 'en_curso', disponible: true },
        { numeral: '5.9', nombre: 'Manifestación', etapa: 5, estado: 'no_aplica', disponible: false },
        {
          numeral: '4.1',
          nombre: 'Solicitud de CDP',
          etapa: 4,
          estado: 'pendiente',
          disponible: false,
          detalle: 'Antes hay que terminar 3.5',
        },
      ]}
      entrada={{
        pasos: [
          paso('3.1', 'APROBADO', { actualizadoEn: '2026-09-18T10:00:00Z' }),
          paso('3.5', 'BORRADOR'),
          paso('4.1', null),
        ],
      }}
      situacion={situacion}
      etapaActual={3}
      participacion={cambios.participacion ?? participacion()}
      plazos={[]}
      onAbrir={onAbrir}
      onCambio={vi.fn()}
      motivoDe={() => null}
    />,
  );
  return onAbrir;
};

/**
 * La ficha del proceso (reestructuración del flujo): cómo va, quién hizo qué
 * y quién sigue, sin recorrer el riel numeral por numeral.
 */
describe('FichaDelProceso', () => {
  it('cuenta lo hecho en cada etapa y abre la actual', () => {
    pintar();

    expect(screen.getByText('Etapa 3 · Estudios Previos')).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 hechas · aquí va el proceso/)).toBeInTheDocument();
    // Abierta: se ven sus actividades con quién sigue.
    expect(screen.getByText('Le toca a Laura Pineda')).toBeInTheDocument();
    expect(screen.getByText(/^Hecha · /)).toBeInTheDocument();
  });

  it('lo que la modalidad excluye no cuenta como pendiente', () => {
    pintar();

    expect(screen.getByText('Etapa 5 · Elaboración y Publicación')).toBeInTheDocument();
    expect(screen.getByText('Nada aplica a esta modalidad')).toBeInTheDocument();
  });

  it('una etapa cerrada se despliega y dice por qué espera cada actividad', async () => {
    pintar();

    await userEvent.click(screen.getByText('Etapa 4 · CDP'));

    expect(screen.getByText('Antes hay que terminar 3.5')).toBeInTheDocument();
  });

  it('pulsar una actividad lleva a trabajarla', async () => {
    const onAbrir = pintar();

    await userEvent.click(screen.getByRole('button', { name: /3\.5 Definir modalidad/ }));

    expect(onAbrir).toHaveBeenCalledWith('3.5');
  });

  it('el equipo dice quién lleva el proceso y deja asignar a quien puede', async () => {
    pintar();

    expect(screen.getByText('Laura Pineda (tú)')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }));

    expect(screen.getByText('panel de radicación')).toBeInTheDocument();
  });

  it('a quien no puede asignar no le ofrece hacerlo', () => {
    pintar({ participacion: participacion({ puedeRepartir: false }) });

    expect(screen.queryByRole('button', { name: 'Asignar' })).toBeNull();
    expect(screen.getByText(/Las asignaciones las hace la Dirección de Contratación/)).toBeInTheDocument();
  });
});

describe('FranjaSituacion · revisar', () => {
  it('si lo que toca es decidir, lleva a la revisión y no al formulario', async () => {
    const onRevisar = vi.fn();
    const onIr = vi.fn();
    render(
      <FranjaSituacion
        situacion={{ ...situacion, momento: 'revision', numeral: '3.1', teToca: true }}
        onIr={onIr}
        onRevisar={onRevisar}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Revisar/ }));

    expect(onRevisar).toHaveBeenCalledWith('3.1');
    expect(onIr).not.toHaveBeenCalled();
  });
});
