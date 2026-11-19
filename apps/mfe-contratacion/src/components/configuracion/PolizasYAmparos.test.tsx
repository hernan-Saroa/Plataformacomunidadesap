import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PolizasYAmparos } from './PolizasYAmparos';
import { contratacionService } from '../../services/contratacionService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const POLIZAS = [
  { codigo: 'CUMPLIMIENTO_ENTIDADES_ESTATALES', nombre: 'Póliza de cumplimiento', descripcion: null, activo: true, orden: 10 },
  { codigo: 'RESPONSABILIDAD_CIVIL', nombre: 'Póliza de responsabilidad civil', descripcion: null, activo: true, orden: 20 },
];

const AMPAROS = [
  {
    codigo: 'ESTABILIDAD_OBRA',
    nombre: 'Estabilidad y calidad de la obra',
    descripcion: null,
    activo: true,
    orden: 60,
    tiposPoliza: ['CUMPLIMIENTO_ENTIDADES_ESTATALES'],
    amparaTrasElContrato: true,
  },
];

/** Tipos de póliza y amparos se crean desde Configuración (145). */
describe('PolizasYAmparos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(contratacionService, 'tiposPoliza').mockResolvedValue(POLIZAS);
    vi.spyOn(contratacionService, 'tiposAmparo').mockResolvedValue(AMPAROS);
  });

  it('muestra los dos catálogos con en qué pólizas va cada amparo', async () => {
    render(<PolizasYAmparos />);

    expect(await screen.findByText('Tipos de póliza')).toBeInTheDocument();
    expect(screen.getByText('Estabilidad y calidad de la obra')).toBeInTheDocument();
    expect(screen.getByText('Ampara tras el contrato')).toBeInTheDocument();
    // El nombre de la póliza aparece en su fila y como etiqueta del amparo.
    expect(screen.getAllByText('Póliza de cumplimiento')).toHaveLength(2);
  });

  it('crea un tipo de póliza nuevo', async () => {
    const guardar = vi
      .spyOn(contratacionService, 'guardarTipoPoliza')
      .mockResolvedValue({ ...POLIZAS[0], codigo: 'SEGURO_DE_CAUCION', nombre: 'Seguro de caución' });
    render(<PolizasYAmparos />);

    await userEvent.click(await screen.findByRole('button', { name: /Agregar tipo de póliza/ }));
    await userEvent.type(screen.getByLabelText(/Código/), 'SEGURO_DE_CAUCION');
    await userEvent.type(screen.getByLabelText(/Nombre/), 'Seguro de caución');
    await userEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'SEGURO_DE_CAUCION', nombre: 'Seguro de caución' }),
    );
  });

  it('crea un amparo diciendo en qué pólizas se ofrece y si ampara tras el contrato', async () => {
    const guardar = vi
      .spyOn(contratacionService, 'guardarTipoAmparo')
      .mockResolvedValue(AMPAROS[0]);
    render(<PolizasYAmparos />);

    await userEvent.click(await screen.findByRole('button', { name: /Agregar amparo/ }));
    await userEvent.type(screen.getByLabelText(/Código/), 'GARANTIA_SOFTWARE');
    await userEvent.type(screen.getByLabelText(/Nombre/), 'Garantía del software');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Póliza de cumplimiento' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Sigue amparando/ }));
    await userEvent.click(screen.getByRole('button', { name: /Guardar/ }));

    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'GARANTIA_SOFTWARE',
        tiposPoliza: ['CUMPLIMIENTO_ENTIDADES_ESTATALES'],
        amparaTrasElContrato: true,
      }),
    );
  });
});
