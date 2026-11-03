import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { DatosDelPaa } from './DatosDelPaa';
import { contratacionService } from '../../services/contratacionService';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: { paa: { datosParaEstudioPrevio: vi.fn() } },
}));

const paa = (contratacionService as unknown as { paa: Record<string, ReturnType<typeof vi.fn>> }).paa;

describe('DatosDelPaa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las columnas que la región marcó, con la línea y su versión', async () => {
    paa.datosParaEstudioPrevio.mockResolvedValue({
      tieneOrigen: true,
      linea: { codigo: 'LINEA 12', region: 'Sede Central', anio: 2026, version: 31 },
      campos: [
        { clave: 'unspsc', etiqueta: 'Códigos UNSPSC', valor: '81101500;81111500' },
        { clave: 'valor_vigencia', etiqueta: 'Valor estimado en la vigencia', valor: 120000000 },
        { clave: 'mipyme', etiqueta: '¿Se puede limitar a MiPymes?', valor: null },
      ],
    });
    render(<DatosDelPaa procesoId="p1" />);

    expect(await screen.findByText('Datos del PAA')).toBeInTheDocument();
    expect(screen.getByText('LINEA 12')).toBeInTheDocument();
    expect(screen.getByText('81101500;81111500')).toBeInTheDocument();
    expect(screen.getByText(/120\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('no muestra nada si el proceso no nació del PAA o la región no marcó campos', async () => {
    paa.datosParaEstudioPrevio.mockResolvedValue({ tieneOrigen: true, linea: { codigo: 'LINEA 1', region: 'X', anio: 2026, version: 1 }, campos: [] });
    const { container } = render(<DatosDelPaa procesoId="p1" />);

    await waitFor(() => expect(paa.datosParaEstudioPrevio).toHaveBeenCalledWith('p1'));
    expect(container).toBeEmptyDOMElement();
  });
});
