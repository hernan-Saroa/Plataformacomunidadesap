import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelCausal } from './PanelCausal';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CAUSALES = [
  {
    codigo: 'DIRECTA_SERVICIOS_PROFESIONALES',
    nombre: 'Prestación de servicios profesionales y de apoyo a la gestión',
    referenciaNormativa: 'Ley 1150 de 2007, art. 2, num. 4, lit. h)',
    confirmada: false,
  },
  {
    codigo: 'DIRECTA_SIN_PLURALIDAD',
    nombre: 'Inexistencia de pluralidad de oferentes en el mercado',
    referenciaNormativa: 'Ley 1150 de 2007, art. 2, num. 4, lit. g)',
    confirmada: false,
  },
];

const estado = (cambios: Record<string, unknown> = {}) => ({
  aplica: true,
  estado: 'BORRADOR',
  modalidad: 'CONTRATACION_DIRECTA',
  referenciaMatriz: 'Numeral 4 Artículo 2 de la Ley 1150 de 2007',
  causal: null,
  sustento: null,
  propuestaDelArea: null,
  causales: CAUSALES,
  puedeElegir: false,
  motivoNoElige: null,
  motivoNoDecide: null,
  abogado: { nombre: 'Andrés Rojas', usuarioNombre: 'andres.rojas@esap.edu.co' },
  ...cambios,
});

/**
 * Actividad 3.6 · Causal de contratación (3.5.1 de la matriz, RF-EST-04).
 *
 * Mientras fue el panel genérico de constancia, la causal se cumplía con una
 * fecha y una nota: el expediente sabía que alguien había escrito algo, pero no
 * qué disposición habilitaba contratar por esa vía.
 */
describe('PanelCausal · elegir la causal', () => {
  beforeEach(() => vi.restoreAllMocks());

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'causalDelProceso').mockResolvedValue(datos as never);
    render(<PanelCausal procesoId="p-1" />);
  };

  it('dice de dónde sale la lista: la norma que escribe la matriz', async () => {
    pintar(estado());

    expect(
      await screen.findByText(/Numeral 4 Artículo 2 de la Ley 1150 de 2007/),
    ).toBeInTheDocument();
  });

  it('en las nueve modalidades que no la piden no ofrece nada que hacer', async () => {
    // Y lo explica: quien entra desde el tablero no ve el riel, así que un
    // panel vacío se leería como una pantalla rota.
    pintar(estado({ aplica: false, motivoNoElige: 'NO_APLICA' }));

    expect(await screen.findByText(/Esta modalidad no pide causal/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Elegir la causal/ })).toBeNull();
  });

  it('con la modalidad sin ratificar no deja elegir, y dice por qué', async () => {
    // La lista es la de la modalidad ratificada: elegir antes dejaría en el
    // expediente una causal de una modalidad que el proceso puede dejar de
    // tener en la 3.5.
    pintar(estado({ puedeElegir: false, motivoNoElige: 'MODALIDAD_SIN_RATIFICAR' }));

    expect(await screen.findByText(/ratificar la modalidad en la 3.5/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Elegir la causal/ })).toBeNull();
  });

  it('a quien no le toca le dice de quién es', async () => {
    pintar(estado({ motivoNoDecide: 'NO_ES_TUYO' }));

    expect(await screen.findByText(/La elige Andrés Rojas/)).toBeInTheDocument();
  });

  it('el abogado elige de la lista de su modalidad y solo de esa', async () => {
    pintar(estado({ puedeElegir: true }));

    await userEvent.click(await screen.findByRole('button', { name: /Elegir la causal/ }));

    const opciones = screen.getAllByRole('option');
    // Las dos de la modalidad, más el «Elige la causal…» de arranque.
    expect(opciones).toHaveLength(3);
    expect(screen.getByRole('option', { name: /lit\. h\)/ })).toBeInTheDocument();
  });

  it('no registra nada sin causal elegida', async () => {
    pintar(estado({ puedeElegir: true }));

    await userEvent.click(await screen.findByRole('button', { name: /Elegir la causal/ }));
    expect(screen.getByRole('button', { name: /Registrar la causal/ })).toBeDisabled();
  });

  it('manda la causal y el sustento juntos', async () => {
    const elegir = vi
      .spyOn(contratacionService, 'elegirCausal')
      .mockResolvedValue(estado({ causal: CAUSALES[0], sustento: 'Apoyo jurídico especializado' }) as never);
    pintar(estado({ puedeElegir: true }));

    await userEvent.click(await screen.findByRole('button', { name: /Elegir la causal/ }));
    await userEvent.selectOptions(
      screen.getByLabelText(/Causal que habilita/),
      'DIRECTA_SERVICIOS_PROFESIONALES',
    );
    await userEvent.type(
      screen.getByLabelText(/Por qué el objeto encaja/),
      'Apoyo jurídico especializado',
    );
    await userEvent.click(screen.getByRole('button', { name: /Registrar la causal/ }));

    expect(elegir).toHaveBeenCalledWith(
      'p-1',
      'DIRECTA_SERVICIOS_PROFESIONALES',
      'Apoyo jurídico especializado',
    );
  });

  it('el sustento es opcional: sin él se manda la causal sola', async () => {
    // La matriz pide la causal; la motivación alimenta el acto de
    // justificación, pero exigirla sería inventar un requisito.
    const elegir = vi
      .spyOn(contratacionService, 'elegirCausal')
      .mockResolvedValue(estado({ causal: CAUSALES[1] }) as never);
    pintar(estado({ puedeElegir: true }));

    await userEvent.click(await screen.findByRole('button', { name: /Elegir la causal/ }));
    await userEvent.selectOptions(
      screen.getByLabelText(/Causal que habilita/),
      'DIRECTA_SIN_PLURALIDAD',
    );
    await userEvent.click(screen.getByRole('button', { name: /Registrar la causal/ }));

    expect(elegir).toHaveBeenCalledWith('p-1', 'DIRECTA_SIN_PLURALIDAD', undefined);
  });

  it('con una elegida ofrece rectificarla, no elegirla otra vez', async () => {
    // Elegir cierra la actividad, pero no cierra la corrección: un literal
    // equivocado tiene que poder arreglarse mientras la etapa siga abierta.
    pintar(
      estado({
        puedeElegir: true,
        estado: 'APROBADO',
        causal: CAUSALES[0],
        sustento: 'Apoyo jurídico especializado',
      }),
    );

    expect(await screen.findByRole('button', { name: /Rectificar la causal/ })).toBeInTheDocument();
    expect(screen.getByText(/lit\. h\)/)).toBeInTheDocument();
  });

  it('avisa de que el catálogo todavía no está ratificado', async () => {
    // Sale de la lectura del equipo sobre la Ley 1150 de 2007, no de un anexo
    // firmado, y quien elige tiene derecho a saberlo.
    pintar(estado());

    expect(await screen.findByText(/pendiente de ratificación/)).toBeInTheDocument();
  });
});
