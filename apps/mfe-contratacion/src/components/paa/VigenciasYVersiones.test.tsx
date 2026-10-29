import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VigenciasYVersiones } from './VigenciasYVersiones';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    paa: { documentos: vi.fn(), cargarPaa: vi.fn(), version: vi.fn() },
  },
}));

vi.mock('./DetalleVersion', () => ({
  DetalleVersion: ({ versionId }: { versionId: string }) => <p>Detalle de {versionId}</p>,
}));

const paa = (contratacionService as unknown as { paa: Record<string, ReturnType<typeof vi.fn>> }).paa;

const meta = {
  id: 'd-meta',
  codigo: 'META',
  nombre: 'Territorial Meta',
  regiones: [{ id: 'r-meta', documentoId: 'd-meta', codigo: 'META', nombre: 'Territorial Meta', prefijoLinea: 'META', unidadContratacion: 'Territorial Meta', activa: true }],
  vigencias: [],
};

describe('VigenciasYVersiones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fijarAlcance({ alcances: [{ accion: 'editar', lugar: 'PAA' }], transversales: [] });
  });

  it('sin documentos, invita a cargar el primer PAA en vez de crear regiones', async () => {
    paa.documentos.mockResolvedValue([]);
    render(<VigenciasYVersiones />);

    expect(await screen.findByText(/Todavía no se ha cargado ningún PAA/)).toBeInTheDocument();
    expect(screen.queryByText('Nuevo año')).not.toBeInTheDocument();
  });

  it('carga con solo el archivo y el año, y abre el documento que salió del archivo', async () => {
    const usuario = userEvent.setup();
    paa.documentos.mockResolvedValueOnce([]).mockResolvedValue([meta]);
    paa.cargarPaa.mockResolvedValue({
      id: 'ver-1',
      numero: 1,
      estado: 'VALIDADA',
      errores: [],
      documento: { id: 'd-meta', nombre: 'Territorial Meta' },
    });
    render(<VigenciasYVersiones />);

    await usuario.click(await screen.findByRole('button', { name: 'Cargar PAA' }));
    const cargar = screen.getByRole('button', { name: 'Cargar' });
    expect(cargar).toBeDisabled();

    const archivo = new File(['x'], 'PAA Meta.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await usuario.upload(screen.getByLabelText('Archivo del PAA (.xlsx)'), archivo);
    const anio = screen.getByLabelText('Vigencia');
    await usuario.clear(anio);
    await usuario.type(anio, '2027');
    await usuario.click(cargar);

    await waitFor(() => expect(paa.cargarPaa).toHaveBeenCalledWith(2027, archivo));
    expect(await screen.findByText('Detalle de ver-1')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Territorial Meta' })).toHaveAttribute('aria-checked', 'true');
  });
});
