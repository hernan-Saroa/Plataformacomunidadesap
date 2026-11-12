import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VigenciasYVersiones } from './VigenciasYVersiones';
import { contratacionService } from '../../services/contratacionService';
import { fijarAlcance } from '../../auth/alcance';
import { ArchivoPaaRechazadoError } from '../../types';

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

  it('si el archivo se rechaza entero, muestra todos sus errores agrupados y no solo un aviso', async () => {
    const usuario = userEvent.setup();
    paa.documentos.mockResolvedValue([meta]);
    const sinPrefijo = (fila: number) => ({
      fila,
      columna: 'Descripción',
      valor: `00${fila} - Prestar servicios`,
      mensaje: 'La descripción no empieza por el código de la línea.',
    });
    const mes = (fila: number) => ({ fila, columna: 'Fecha estimada de inicio de proceso de selección (mes)', valor: '1', mensaje: 'Se espera el nombre de un mes.' });
    paa.cargarPaa.mockRejectedValue(
      new ArchivoPaaRechazadoError('No se pudo saber de qué territorio es el archivo', [sinPrefijo(5), mes(5), sinPrefijo(6), mes(6)]),
    );
    render(<VigenciasYVersiones />);

    await usuario.click(await screen.findByRole('button', { name: 'Cargar PAA' }));
    await usuario.upload(
      screen.getByLabelText('Archivo del PAA (.xlsx)'),
      new File(['x'], 'PAA Meta.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    );
    await usuario.click(screen.getByRole('button', { name: 'Cargar' }));

    expect(await screen.findByText('El archivo no se cargó')).toBeInTheDocument();
    expect(screen.getByText(/4 error\(es\) en 2 fila\(s\), de 2 tipo\(s\)/)).toBeInTheDocument();
    expect(screen.getByText('La descripción no empieza por el código de la línea')).toBeInTheDocument();
    expect(screen.getByText('El mes viene en número')).toBeInTheDocument();

    // «Ver las celdas» de un tipo lleva al detalle fila por fila, filtrado a ese tipo.
    await usuario.click(screen.getAllByRole('button', { name: 'Ver las 2 celdas' })[0]);
    expect(screen.getByRole('tab', { name: /Fila por fila/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('2 celda(s)')).toBeInTheDocument();
    expect(screen.getAllByText('La descripción no empieza por el código de la línea.')).toHaveLength(2);
  });

  it('ofrece la guía del formato al cargar', async () => {
    const usuario = userEvent.setup();
    paa.documentos.mockResolvedValue([meta]);
    render(<VigenciasYVersiones />);

    await usuario.click(await screen.findByRole('button', { name: 'Cargar PAA' }));
    expect(screen.getByRole('button', { name: /Ver el formato/ })).toBeInTheDocument();
  });
});
