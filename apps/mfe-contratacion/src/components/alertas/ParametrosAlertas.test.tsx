import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParametrosAlertas } from './ParametrosAlertas';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PARAMETROS = [
  { clave: 'anticipacion_amparo', valor: 30, minimo: 1, maximo: 180, descripcion: 'Días antes de la póliza' },
  { clave: 'hora_aviso', valor: 7, minimo: 0, maximo: 23, descripcion: 'Hora del aviso' },
];

/** Los plazos de las alertas, en tabla, como los plazos de publicidad (EFDS-1183). */
describe('ParametrosAlertas', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'parametrosAlerta').mockResolvedValue(PARAMETROS);
  });

  it('lee cada plazo en palabras', async () => {
    render(<ParametrosAlertas puedeEditar />);

    expect(await screen.findByText('30 días antes')).toBeInTheDocument();
    expect(screen.getByText('7:00, hora de Bogotá')).toBeInTheDocument();
  });

  it('cambia un plazo desde su modal y manda solo ese', async () => {
    const guardar = vi.spyOn(contratacionService, 'guardarParametrosAlerta').mockResolvedValue(PARAMETROS);
    render(<ParametrosAlertas puedeEditar />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar Pólizas' }));
    const campo = screen.getByRole('textbox', { name: 'Pólizas' });
    await userEvent.clear(campo);
    await userEvent.type(campo, '45');
    await userEvent.click(screen.getByRole('button', { name: /Guardar plazo/ }));

    expect(guardar).toHaveBeenCalledWith({ anticipacion_amparo: 45 });
  });

  it('no deja guardar un valor fuera de su rango', async () => {
    render(<ParametrosAlertas puedeEditar />);

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar Aviso diario' }));
    const campo = screen.getByRole('textbox', { name: 'Aviso diario' });
    await userEvent.clear(campo);
    await userEvent.type(campo, '25');

    expect(screen.getByRole('button', { name: /Guardar plazo/ })).toBeDisabled();
  });

  it('a quien no configura no le ofrece cambiar', async () => {
    render(<ParametrosAlertas puedeEditar={false} />);

    await screen.findByText('30 días antes');
    expect(screen.queryByRole('button', { name: /Cambiar/ })).toBeNull();
  });
});
