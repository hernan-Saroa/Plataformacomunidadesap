import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelRadicacion } from './PanelRadicacion';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ABOGADOS = [
  {
    usuarioId: 'u-andres',
    usuarioNombre: 'andres.rojas@esap.edu.co',
    personaId: null,
    nombre: 'Andrés Rojas',
    cargo: null,
    email: null,
  },
  {
    usuarioId: 'u-otro',
    usuarioNombre: 'otro.abogado@esap.edu.co',
    personaId: null,
    nombre: 'Otro Abogado',
    cargo: null,
    email: null,
  },
];

const participante = (nombre: string, cambios: Record<string, unknown> = {}) => ({
  id: 'x-1',
  usuarioId: 'u-andres',
  usuarioNombre: 'andres.rojas@esap.edu.co',
  nombre,
  cargo: null,
  email: null,
  asignadoPor: 'laura.pineda@esap.edu.co',
  asignadoAt: '2026-09-09T14:00:00.000Z',
  esMio: false,
  ...cambios,
});

const estado = (cambios: Record<string, unknown> = {}) => ({
  puedeTomar: false,
  puedeRepartir: false,
  contratacion: null,
  abogado: null,
  sinAbogado: false,
  historial: [],
  ...cambios,
});

/**
 * Actividad 3.3 · Radicación en la Dirección (EFDS-1183).
 *
 * Hasta ahora esta actividad era el panel genérico de constancia y no hacía
 * nada de lo que su nombre dice. Radicar es recibir el proceso y ponerle
 * responsable, y son dos actos con reglas distintas: tomar no lo autoriza
 * nadie —la bandeja es compartida—, repartir el abogado lo hace quien tomó.
 */
describe('PanelRadicacion · recibir y repartir', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'abogados').mockResolvedValue(ABOGADOS as never);
  });

  const pintar = (datos: Record<string, unknown>) => {
    vi.spyOn(contratacionService, 'participacion').mockResolvedValue(datos as never);
    render(<PanelRadicacion procesoId="p-1" />);
  };

  it('en la bandeja, quien puede recibirlo ve el botón de tomar', async () => {
    pintar(estado({ puedeTomar: true }));

    expect(await screen.findByText(/En la bandeja, sin recibir/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomar el proceso/ })).toBeInTheDocument();
  });

  it('quien no es de la Dirección lo ve, pero no puede recibirlo', async () => {
    // El área que radicó tiene derecho a saber que su proceso sigue esperando;
    // lo que no tiene es forma de sacarlo de la bandeja.
    pintar(estado());

    expect(await screen.findByText(/Lo recibe alguien del equipo de Contratación/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tomar el proceso/ })).toBeNull();
  });

  it('tomado y sin repartir, avisa de que la 3.4 no la puede resolver nadie', async () => {
    pintar(
      estado({
        contratacion: participante('Laura Pineda', { esMio: true }),
        puedeRepartir: true,
      }),
    );

    expect(await screen.findByText(/Laura Pineda · lo tomaste tú/)).toBeInTheDocument();
    expect(screen.getByText(/Falta repartirlo para que alguien lo revise/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Repartir a un abogado/ })).toBeInTheDocument();
  });

  it('quien no lo tomó no reparte: eso lo decide quien lo recibió', async () => {
    pintar(estado({ contratacion: participante('Laura Pineda') }));

    expect(await screen.findByText(/Laura Pineda/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Repartir/ })).toBeNull();
  });

  it('cambiar de abogado exige motivo; repartir por primera vez no', async () => {
    pintar(
      estado({
        contratacion: participante('Laura Pineda', { esMio: true }),
        abogado: participante('Andrés Rojas'),
        puedeRepartir: true,
      }),
    );

    await userEvent.click(await screen.findByRole('button', { name: /Cambiar de abogado/ }));
    await userEvent.selectOptions(await screen.findByLabelText(/Nuevo abogado/), 'u-otro');

    // Un proceso que cambia de manos sin decir por qué deja al expediente con
    // dos abogados y ninguna explicación de cuál respondía en cada tramo.
    expect(screen.getByRole('button', { name: /Reasignar/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Por qué cambia de manos/), 'sale a vacaciones');
    expect(screen.getByRole('button', { name: /Reasignar/ })).toBeEnabled();
  });

  it('no ofrece como nuevo abogado al que ya lo lleva', async () => {
    pintar(
      estado({
        contratacion: participante('Laura Pineda', { esMio: true }),
        abogado: participante('Andrés Rojas'),
        puedeRepartir: true,
      }),
    );

    await userEvent.click(await screen.findByRole('button', { name: /Cambiar de abogado/ }));

    expect(await screen.findByRole('option', { name: /Otro Abogado/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Andrés Rojas/ })).toBeNull();
  });

  it('quitado el abogado, dice que el proceso quedó parado', async () => {
    // «No debería, pero puede pasar»: lo que no puede es pasar en silencio.
    pintar(
      estado({
        contratacion: participante('Laura Pineda', { esMio: true }),
        sinAbogado: true,
        puedeRepartir: true,
      }),
    );

    expect(
      await screen.findByText(/Nadie puede resolver la 3.4 mientras tanto/),
    ).toBeInTheDocument();
  });
});
