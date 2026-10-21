import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampoDinamico } from './CampoDinamico';
import { contratacionService } from '../../services/contratacionService';
import { CampoFormulario } from '../../types';

const jefe = {
  codigo: 'responsable_area',
  etiqueta: 'Jefe del área',
  tipo: 'texto',
  orden: 1,
} as CampoFormulario;

const cargos = [
  { id: '2', nombre: 'Subdirector General' },
  { id: '8', nombre: 'Profesional Especializado' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * El jefe del área se acota por área y por cargo antes de elegirlo: en un área
 * grande el nombre solo no basta para dar con él.
 */
describe('Jefe del área por cargo', () => {
  it('ofrece los cargos del área elegida', async () => {
    const pedirCargos = vi.spyOn(contratacionService, 'cargos').mockResolvedValue(cargos);

    render(
      <CampoDinamico campo={jefe} valor="" dependencia="Subdirección Académica" onChange={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Subdirector General' })).toBeInTheDocument(),
    );
    expect(pedirCargos).toHaveBeenCalledWith('Subdirección Académica');
  });

  it('busca a la persona solo entre quienes tienen el cargo elegido', async () => {
    vi.spyOn(contratacionService, 'cargos').mockResolvedValue(cargos);
    const pedirPersonas = vi.spyOn(contratacionService, 'personas').mockResolvedValue([
      { id: 'p1', nombre: 'Ana Torres', cargo: 'Subdirector General' },
    ]);

    render(
      <CampoDinamico campo={jefe} valor="" dependencia="Subdirección Académica" onChange={vi.fn()} />,
    );
    await waitFor(() => screen.getByRole('option', { name: 'Subdirector General' }));

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Cargo' }), '2');
    await userEvent.click(screen.getByRole('button', { name: /jefe del área/i }));

    await waitFor(() =>
      expect(pedirPersonas).toHaveBeenCalledWith('', 'Subdirección Académica', '2'),
    );
    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
  });

  it('sin área no deja elegir cargo ni persona', async () => {
    vi.spyOn(contratacionService, 'cargos').mockResolvedValue(cargos);

    render(<CampoDinamico campo={jefe} valor="" dependencia="" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Cargo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /jefe del área/i })).toBeDisabled();
    expect(screen.getByText('Primero elige el área solicitante')).toBeInTheDocument();
  });
});
