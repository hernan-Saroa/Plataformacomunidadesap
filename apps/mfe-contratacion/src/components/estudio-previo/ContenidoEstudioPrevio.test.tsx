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
  revision: { puedeDecidir: false, motivo: null, espera: null, ronda: null, acciones: [] },
  ...cambios,
});


/**
 * La 3.4 la resuelve el escalón que espera en la ronda de la 3.1 (EFDS-1183, 109).
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
    // La pantalla pregunta también por la lista de la 3.1 para poder avisar
    // en la pestaña de cuántos documentos faltan. Sin el doble, la llamada
    // real revienta y el efecto se corta antes de pintar el historial.
    vi.spyOn(contratacionService, 'documentosDeActividad').mockResolvedValue({
      numeral: '3.1',
      modalidad: 'MINIMA_CUANTIA',
      tipologia: null,
      documentos: [],
      adicionales: [],
      faltantes: [],
      completo: true,
      puedeCargar: false,
    } as never);
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(datos as never);
    render(<ContenidoEstudioPrevio procesoId="p-1" />);
  };

  it('a quien le toca decidir lo lleva a la revisión, sin decidir aquí', async () => {
    // La decisión solo se toma en la pantalla de revisión: aquí queda el
    // formulario de quien redactó, en solo lectura.
    const onRevisar = vi.fn();
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(
      estudioPrevio({ revision: { puedeDecidir: true, motivo: null, acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] } }) as never,
    );
    render(<ContenidoEstudioPrevio procesoId="p-1" onRevisar={onRevisar} />);

    await userEvent.click(await screen.findByRole('button', { name: /Abrir la revisión/ }));
    expect(onRevisar).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Negar/ })).toBeNull();
  });

  it('a quien no le toca no le ofrece ninguna, y le dice a quién espera', async () => {
    pintar(
      estudioPrevio({
        revision: {
          puedeDecidir: false,
          motivo: 'EN_CADENA',
          espera: 'Espera al escalón 1, Abogado: Andrés Rojas (Abogado).',
          acciones: [],
        },
      }),
    );

    expect(await screen.findByText(/Espera al escalón 1, Abogado: Andrés Rojas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Negar/ })).toBeNull();
  });

  it('con el puesto del escalón vacío dice que falta asignarlo en la 3.3', async () => {
    pintar(
      estudioPrevio({
        revision: {
          puedeDecidir: false,
          motivo: 'EN_CADENA',
          espera: 'Falta asignar en la 3.3 quién ocupa el puesto Abogado',
          acciones: [],
        },
      }),
    );

    expect(await screen.findByText(/Falta asignar en la 3.3/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });

  it('sin el dato del servidor no ofrece decidir', async () => {
    // Un servidor que aún no manda `revision` no debe hacer que la pantalla
    // prometa algo que va a terminar en 403.
    pintar(estudioPrevio({ revision: undefined }));

    expect(await screen.findByText(/Pendiente de revisión/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
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
        revision: { puedeDecidir: true, motivo: null, acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] },
      }),
    );

    expect(await screen.findByText(/Negado · el proceso terminó/)).toBeInTheDocument();
    expect(screen.getByText(/contrato marco vigente/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).toBeNull();
  });
});

/**
 * Con pantalla de revisión, el formulario no decide (reestructuración del flujo).
 *
 * El abogado aprobaba sobre el mismo formulario donde el área redactó; ahora
 * se le ofrece abrir la revisión, que es donde se lee y se decide.
 */
describe('ContenidoEstudioPrevio · la decisión se toma en la revisión', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'revisiones').mockResolvedValue([] as never);
    vi.spyOn(contratacionService, 'documentosDeActividad').mockResolvedValue({
      numeral: '3.1',
      documentos: [],
      adicionales: [],
      faltantes: [],
      completo: true,
      puedeCargar: false,
    } as never);
  });

  it('ofrece abrir la revisión en vez de las tres decisiones', async () => {
    vi.spyOn(contratacionService, 'obtenerEstudioPrevio').mockResolvedValue(
      estudioPrevio({ revision: { puedeDecidir: true, motivo: null, acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] } }) as never,
    );
    const onRevisar = vi.fn();
    render(<ContenidoEstudioPrevio procesoId="p-1" onRevisar={onRevisar} />);

    await userEvent.click(await screen.findByRole('button', { name: /Abrir la revisión/ }));

    expect(onRevisar).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
  });
});
