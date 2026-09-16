import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContenidoEstudioPrevio } from './ContenidoEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

/** Lo mínimo que la pantalla necesita para dibujarse. */
const estudioPrevio = (cambios: Record<string, unknown> = {}) => ({
  proceso: {
    id: 'p-1',
    radicado: 'CTO-2026-0010',
    objeto: 'Apoyo jurídico a la Dirección',
    modalidad: 'MINIMA_CUANTIA',
    modalidadNombre: 'Mínima Cuantía',
    valorEstimado: 20000000,
    etapa: 3,
    expediente: 'EXP-2026-0010',
  },
  estado: 'EN_REVISION',
  version: 1,
  datos: {},
  definicionCampos: [],
  editable: false,
  revision: { abogado: null, puedeDecidir: false, motivo: 'SIN_ABOGADO' },
  ...cambios,
});

const abogado = { nombre: 'Andrés Rojas', usuarioNombre: 'andres.rojas@esap.edu.co', cargo: null };

/**
 * La 3.4 la resuelve el abogado asignado en la 3.3 (EFDS-1183).
 *
 * La pantalla no controla el acceso —lo hace el guard del backend— pero sí
 * decide qué ofrece, y ofrecer una decisión que la API va a rechazar es
 * decirle al usuario lo contrario de lo que ocurre. Por eso pregunta al
 * servidor quién resuelve, en vez de deducirlo de la sesión.
 */
describe('ContenidoEstudioPrevio · quién resuelve la 3.4', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'revisiones').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'obtenerExpediente').mockResolvedValue({
      documentos: [],
    } as never);
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(datos as never);
    render(<ContenidoEstudioPrevio procesoId="p-1" />);
  };

  it('al abogado asignado le ofrece las tres decisiones', async () => {
    pintar(estudioPrevio({ revision: { abogado, puedeDecidir: true, motivo: null } }));

    expect(await screen.findByRole('button', { name: /Aprobar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver/ })).toBeInTheDocument();
    // La tercera es la que faltaba: sin ella un proceso rechazado de plano se
    // devolvía, y el área se quedaba esperando saber qué corregir.
    expect(screen.getByRole('button', { name: /Negar/ })).toBeInTheDocument();
  });

  it('a otro abogado no le ofrece ninguna, y le dice de quién es', async () => {
    pintar(estudioPrevio({ revision: { abogado, puedeDecidir: false, motivo: 'NO_ES_TUYO' } }));

    expect(await screen.findByText(/Lo revisa Andrés Rojas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Negar/ })).toBeNull();
  });

  it('sin abogado repartido explica que falta la 3.3', async () => {
    // Una franja vacía donde otros ven tres botones no dice nada; el aviso
    // señala el paso que falta.
    pintar(estudioPrevio());

    expect(await screen.findByText(/se asigna abogado en la actividad 3.3/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('sin el dato del servidor no ofrece decidir', async () => {
    // Un servidor que aún no manda `revision` no debe hacer que la pantalla
    // prometa algo que va a terminar en 403.
    pintar(estudioPrevio({ revision: undefined }));

    expect(await screen.findByText(/Pendiente de revisión/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('negar exige motivo antes de dejar confirmar', async () => {
    pintar(estudioPrevio({ revision: { abogado, puedeDecidir: true, motivo: null } }));
    const negar = vi.spyOn(contratacionService, 'negar');

    await userEvent.click(await screen.findByRole('button', { name: /Negar/ }));

    expect(screen.getByRole('button', { name: /Negar el proceso/ })).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText(/Motivo de la negativa/),
      'El objeto ya está cubierto por el contrato marco vigente.',
    );
    expect(screen.getByRole('button', { name: /Negar el proceso/ })).toBeEnabled();
    expect(negar).not.toHaveBeenCalled();
  });

  it('un proceso negado enseña el motivo y no ofrece nada más', async () => {
    vi.spyOn(contratacionService, 'revisiones').mockResolvedValue([
      {
        id: 'r-1',
        decision: 'NEGADO',
        observaciones: 'El objeto ya está cubierto por el contrato marco vigente.',
        versionRevisada: 1,
        revisadoPor: 'andres.rojas@esap.edu.co',
        createdAt: '2026-09-09T10:00:00.000Z',
      },
    ] as never);
    pintar(
      estudioPrevio({
        estado: 'NEGADO',
        revision: { abogado, puedeDecidir: true, motivo: null },
      }),
    );

    expect(await screen.findByText(/Negado · el proceso terminó/)).toBeInTheDocument();
    expect(screen.getByText(/contrato marco vigente/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });
});
