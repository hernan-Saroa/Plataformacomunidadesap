import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaMiTrabajo } from './VistaMiTrabajo';
import { EstadoMiTrabajo } from '../../hooks/useMiTrabajo';
import { Situacion } from '../proceso/situacionDelProceso';

const situacion = (cambios: Partial<Situacion>): Situacion => ({
  momento: 'tramite',
  numeral: '4.1',
  titulo: 'Solicitud de CDP',
  etapa: 4,
  quien: 'Gestor de contratación',
  teToca: true,
  espera: null,
  ultimoMovimiento: '2026-09-20',
  ...cambios,
});

const proceso = (id: string, objeto: string) => ({
  id,
  radicado: `CTO-${id}`,
  objeto,
  etapa: 4,
  fechaRadicacion: '2026-09-01',
});

const estado = (): EstadoMiTrabajo => ({
  trabajo: {
    porHacer: [{ proceso: proceso('a', 'Vigilancia'), situacion: situacion({}) }],
    porAsignar: [],
    enEspera: [
      {
        proceso: proceso('b', 'Aseo'),
        situacion: situacion({ teToca: false, numeral: '4.2', titulo: 'Verificar CDP', quien: 'Marta' }),
      },
    ],
  },
  porRevisar: [],
  plazos: new Map(),
  cargando: false,
  error: null,
  pendientes: 1,
  recargar: vi.fn(),
});

describe('VistaMiTrabajo', () => {
  it('lo que me toca lleva a trabajar esa actividad', async () => {
    const onTrabajar = vi.fn();
    render(
      <VistaMiTrabajo
        estado={estado()}
        pestana="hacer"
        onPestana={vi.fn()}
        onRevisar={vi.fn()}
        onTrabajar={onTrabajar}
        onConsultar={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Vigilancia/ }));

    expect(onTrabajar).toHaveBeenCalledWith('a', '4.1');
  });

  it('lo que espera a otro dice a quién y lleva a seguir el proceso', async () => {
    const onConsultar = vi.fn();
    render(
      <VistaMiTrabajo
        estado={estado()}
        pestana="espera"
        onPestana={vi.fn()}
        onRevisar={vi.fn()}
        onTrabajar={vi.fn()}
        onConsultar={onConsultar}
      />,
    );

    expect(screen.getByText(/le toca a Marta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Aseo/ }));

    expect(onConsultar).toHaveBeenCalledWith('b');
  });
});
