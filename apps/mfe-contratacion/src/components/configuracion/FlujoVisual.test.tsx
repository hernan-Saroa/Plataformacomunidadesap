import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contratacionService } from '../../services/contratacionService';
import { DiagramaFlujo, NodoFlujo } from '../../types';
import { FlujoVisual } from './FlujoVisual';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const nodo = (numeral: string, nombre: string, cambios: Partial<NodoFlujo> = {}): NodoFlujo => ({
  numeral,
  nombre,
  etapa: Number.parseInt(numeral, 10),
  aplica: true,
  enLaPlataforma: true,
  asigna: null,
  dependeDe: null,
  hace: { modo: 'ROL', accion: 'editar', propia: false, quien: 'Gestor de Contratación' },
  aprueba: { tipo: 'NINGUNA', propia: false, cadena: null, escalones: [] },
  estado: 'OK',
  problemas: [],
  ...cambios,
});

const DIAGRAMA: DiagramaFlujo = {
  version: { id: 'v-2', numero: 2, estado: 'BORRADOR' },
  modalidad: null,
  modalidades: [{ codigo: 'MINIMA_CUANTIA', nombre: 'Mínima Cuantía' }],
  etapas: [
    {
      etapa: 3,
      actividades: [
        nodo('3.1', 'Estudio previo', {
          aprueba: {
            tipo: 'CADENA',
            propia: false,
            cadena: 'Revisión del estudio previo',
            escalones: [
              { nombre: 'Abogado revisor', quienes: [{ tipo: 'PUESTO', nombre: 'Abogado revisor' }] },
              { nombre: 'Jefe', quienes: [{ tipo: 'ROL', nombre: 'Director de Contratación' }] },
            ],
          },
        }),
        nodo('3.3', 'Radicación', { asigna: 'Se escoge a la persona de cada puesto del proceso' }),
        nodo('3.4', 'Revisión y reparto', { noBloquea: true }),
        nodo('3.6', 'Causal', {
          hace: { modo: 'AL_EJECUTAR', accion: 'aprobar', propia: false, quien: 'Abogado del caso' },
          estado: 'ERROR',
          problemas: [{ parte: 'HACE', gravedad: 'ERROR', mensaje: 'Nadie puede ocupar el puesto Abogado del caso' }],
        }),
        nodo('3.5', 'Definir modalidad', { aplica: false }),
      ],
    },
  ],
  problemas: [],
};

/**
 * El flujo visual de Configuración (111): quién hace y quién revisa cada
 * actividad, de principio a fin, y lo que impide activar el borrador.
 */
describe('FlujoVisual', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'versionesFlujo').mockResolvedValue([
      { id: 'v-2', numero: 2, estado: 'BORRADOR', procesosEnCurso: 0 },
      { id: 'v-1', numero: 1, estado: 'ACTIVA', procesosEnCurso: 3 },
    ] as never);
    vi.spyOn(contratacionService, 'diagramaFlujo').mockResolvedValue(DIAGRAMA as never);
    vi.spyOn(contratacionService, 'diagnosticoDePuestos').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'validacionFlujo').mockResolvedValue([
      {
        numeral: '3.6',
        nombre: 'Causal',
        etapa: 3,
        modalidad: 'MINIMA_CUANTIA',
        parte: 'HACE',
        gravedad: 'ERROR',
        mensaje: 'Nadie puede ocupar el puesto Abogado del caso',
        modalidades: ['Mínima Cuantía'],
      },
    ] as never);
  });

  it('dibuja cada etapa con sus actividades, quién las hace y quién las revisa', async () => {
    render(<FlujoVisual />);

    expect(await screen.findByText('Estudios previos')).toBeInTheDocument();
    const estudio = screen.getByRole('button', { name: /3\.1.*Estudio previo/ });
    expect(estudio).toHaveTextContent('Por rol');
    expect(estudio).toHaveTextContent('Revisión del estudio previo (2 pasos)');
    expect(screen.getByRole('button', { name: /3\.6.*Causal/ })).toHaveTextContent('Por puesto: Abogado del caso');
  });

  it('destaca donde se asigna gente y apaga lo que la modalidad salta', async () => {
    render(<FlujoVisual />);

    const radicacion = await screen.findByRole('button', { name: /3\.3.*Radicación/ });
    expect(radicacion.className).toContain('flujo-nodo--asigna');
    // Lo que se salta no se ve hasta pedirlo.
    expect(screen.queryByRole('button', { name: /3\.5/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Mostrar lo que se salta/ }));
    expect(screen.getByRole('button', { name: /3\.5/ }).className).toContain('flujo-nodo--salta');
  });

  it('marca como opcional la que no detiene el flujo, y lo explica en la leyenda', async () => {
    render(<FlujoVisual />);

    const reparto = await screen.findByRole('button', { name: /3\.4.*Revisión y reparto/ });
    expect(within(reparto).getByText('Opcional')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /3\.3.*Radicación/ })).queryByText('Opcional')).toBeNull();
    expect(screen.getByText('No detiene el flujo')).toBeInTheDocument();
  });

  it('con algo por corregir no deja activar, y dice exactamente qué', async () => {
    render(<FlujoVisual />);

    expect(await screen.findByRole('button', { name: /Activar versión 2/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /1 cosa por corregir/ }));
    expect(screen.getByRole('button', { name: /3\.6 · Causal — Nadie puede ocupar/ })).toHaveTextContent('Mínima Cuantía');
  });

  it('los puestos del proceso se ven y se crean desde el flujo', async () => {
    vi.spyOn(contratacionService, 'puestos').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'diagnosticoDePuestos').mockResolvedValue([] as never);
    render(<FlujoVisual />);

    await userEvent.click(await screen.findByRole('button', { name: /Puestos del proceso/ }));

    const seccion = screen.getByRole('region', { name: 'Puestos del proceso' });
    expect(await within(seccion).findByRole('button', { name: /Crear un puesto/ })).toBeInTheDocument();
  });

  it('el botón de puestos cuenta lo que hay por revisar', async () => {
    vi.spyOn(contratacionService, 'diagnosticoDePuestos').mockResolvedValue([
      { puestoId: 'p-1', numeral: null, mensaje: 'El puesto Jefe es obligatorio pero no hace ni aprueba ninguna actividad' },
    ] as never);
    render(<FlujoVisual />);

    expect(await screen.findByRole('button', { name: /Puestos del proceso.*1 puesto por revisar/ })).toBeInTheDocument();
  });

  it('al elegir una actividad abre su panel sin perder el diagrama', async () => {
    vi.spyOn(contratacionService, 'laHaceDeActividad').mockResolvedValue({ tipo: 'PERMISO', puesto: null, personas: [] } as never);
    vi.spyOn(contratacionService, 'puestos').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'aprobacionDeActividad').mockResolvedValue({
      requiereAprobacion: false,
      aprobadores: [],
      cadena: null,
    } as never);
    render(<FlujoVisual />);

    await userEvent.click(await screen.findByRole('button', { name: /3\.6.*Causal/ }));

    const panel = screen.getByRole('complementary', { name: /Configurar la 3\.6/ });
    expect(within(panel).getByText('Nadie puede ocupar el puesto Abogado del caso')).toBeInTheDocument();
    expect(within(panel).getByText('Quién la hace')).toBeInTheDocument();
    expect(within(panel).getByText('Quién la revisa')).toBeInTheDocument();
    // El diagrama sigue a la vista.
    expect(screen.getByRole('button', { name: /3\.1.*Estudio previo/ })).toBeInTheDocument();
  });
});
