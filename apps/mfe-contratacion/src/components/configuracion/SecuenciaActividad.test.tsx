import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contratacionService } from '../../services/contratacionService';
import { SecuenciaActividad } from './SecuenciaActividad';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ANTERIORES = [
  { numeral: '5.3', nombre: 'Publicación en SECOP II' },
  { numeral: '5.7', nombre: 'Apertura del proceso' },
  { numeral: '5.11', nombre: 'Publicación de la manifestación de interés' },
];

const config = (dependeDe: string[] | null, noBloquea = false, propia = false) => ({
  secuencia: { dependeDe, noBloquea },
  general: { secuencia: { dependeDe, noBloquea } },
  propiaDeLaModalidad: { laHace: false, aprobacion: false, secuencia: propia },
  editando: 'BORRADOR' as const,
});

/** Cuándo empieza la actividad (125): de qué depende y si detiene a las siguientes. */
describe('SecuenciaActividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('por defecto empieza cuando termina la anterior, y la nombra', async () => {
    vi.spyOn(contratacionService, 'asignacionFlujo').mockResolvedValue(config(null));
    render(<SecuenciaActividad numeral="5.12" anteriores={ANTERIORES} />);

    const anterior = await screen.findByRole('button', { name: /Cuando termina la anterior/ });
    expect(anterior).toHaveAttribute('aria-pressed', 'true');
    expect(anterior).toHaveTextContent('5.11');
    expect(screen.getByRole('checkbox', { name: /no detiene el flujo/i })).not.toBeChecked();
  });

  it('elige de cuál depende de verdad', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'asignacionFlujo').mockResolvedValue(config(null));
    const guardar = vi.spyOn(contratacionService, 'guardarAsignacionFlujo').mockResolvedValue(config(['5.7']));
    render(<SecuenciaActividad numeral="5.12" modalidad="LICITACION_PUBLICA" anteriores={ANTERIORES} />);

    await usuario.click(await screen.findByRole('button', { name: /Cuando terminan otras actividades/ }));
    await usuario.selectOptions(screen.getByLabelText('Agregar una actividad de la que depende'), '5.7');

    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith('5.12', {
        modalidad: 'LICITACION_PUBLICA',
        secuencia: { dependeDe: ['5.7'], noBloquea: false },
      }),
    );
    expect(await screen.findByText('Apertura del proceso')).toBeInTheDocument();
  });

  it('marca que no detiene el flujo sin tocar de qué depende', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'asignacionFlujo').mockResolvedValue(config(['8.1']));
    const guardar = vi
      .spyOn(contratacionService, 'guardarAsignacionFlujo')
      .mockResolvedValue(config(['8.1'], true));
    render(<SecuenciaActividad numeral="8.8" anteriores={[{ numeral: '8.1', nombre: 'Contrato' }]} />);

    await usuario.click(await screen.findByRole('checkbox', { name: /no detiene el flujo/i }));

    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith('8.8', {
        modalidad: null,
        secuencia: { dependeDe: ['8.1'], noBloquea: true },
      }),
    );
  });

  it('quitar la última dependencia vuelve a «la anterior»', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'asignacionFlujo').mockResolvedValue(config(['5.7']));
    const guardar = vi.spyOn(contratacionService, 'guardarAsignacionFlujo').mockResolvedValue(config(null));
    render(<SecuenciaActividad numeral="5.12" anteriores={ANTERIORES} />);

    await usuario.click(await screen.findByRole('button', { name: 'Ya no depende de la 5.7' }));

    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith('5.12', {
        modalidad: null,
        secuencia: { dependeDe: null, noBloquea: false },
      }),
    );
  });

  it('en una modalidad con lo suyo, puede volver a lo general', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(contratacionService, 'asignacionFlujo').mockResolvedValue(config(['5.7'], false, true));
    const guardar = vi.spyOn(contratacionService, 'guardarAsignacionFlujo').mockResolvedValue(config(null));
    render(
      <SecuenciaActividad
        numeral="5.12"
        modalidad="MINIMA_CUANTIA"
        nombreModalidad="Mínima cuantía"
        anteriores={ANTERIORES}
      />,
    );

    await usuario.click(await screen.findByRole('button', { name: 'Volver a lo general' }));

    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith('5.12', { modalidad: 'MINIMA_CUANTIA', secuencia: null }),
    );
  });
});
