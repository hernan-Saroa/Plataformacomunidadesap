import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VistaEstadisticas } from './VistaEstadisticas';
import { contratacionService } from '../../services/contratacionService';
import { EstadisticasGestion } from '../../types';

vi.mock('../../services/contratacionService', () => ({
  contratacionService: {
    estadisticas: vi.fn(),
    urlEstadisticasCsv: vi.fn(),
    modalidades: vi.fn(),
  },
}));

const servicio = contratacionService as unknown as {
  estadisticas: ReturnType<typeof vi.fn>;
  urlEstadisticasCsv: ReturnType<typeof vi.fn>;
  modalidades: ReturnType<typeof vi.fn>;
};

const REPORTE: EstadisticasGestion = {
  generadoEn: '2026-09-02T15:30:00.000Z',
  filtros: { vigencia: null, modalidad: null },
  contratos: {
    total: 9,
    valorTotal: 900_000_000,
    porEstado: [
      { clave: 'SUSCRITO', etiqueta: 'Suscritos', cuantos: 2, valor: 100_000_000 },
      { clave: 'EJECUCION', etiqueta: 'En ejecución', cuantos: 4, valor: 500_000_000 },
      { clave: 'TERMINADO', etiqueta: 'Terminados', cuantos: 1, valor: 100_000_000 },
      { clave: 'LIQUIDADO', etiqueta: 'Liquidados', cuantos: 1, valor: 100_000_000 },
      { clave: 'CERRADO', etiqueta: 'Cerrados', cuantos: 1, valor: 100_000_000 },
    ],
    porModalidad: [
      { clave: 'MC', etiqueta: 'Mínima cuantía', cuantos: 6, valor: 600_000_000 },
      { clave: 'SA', etiqueta: 'Selección abreviada', cuantos: 3, valor: 300_000_000 },
    ],
    porTipologia: [
      { clave: 'PS', etiqueta: 'Prestación de servicios', cuantos: 9, valor: 900_000_000 },
    ],
  },
  procesos: {
    total: 12,
    porDesenlace: [
      { clave: 'ADJUDICADO', etiqueta: 'Adjudicados', cuantos: 9, valor: 900_000_000 },
      { clave: 'DESIERTO', etiqueta: 'Declarados desiertos', cuantos: 3, valor: 30_000_000 },
    ],
  },
  presupuesto: {
    contratado: 900_000_000,
    pagado: 225_000_000,
    porPagar: 675_000_000,
    porcentajeEjecutado: 25,
  },
  vigenciasDisponibles: [2026, 2025],
};

describe('VistaEstadisticas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicio.estadisticas.mockResolvedValue(REPORTE);
    servicio.urlEstadisticasCsv.mockReturnValue('/hiring/api/v1/estadisticas/csv');
    servicio.modalidades.mockResolvedValue([
      { codigo: 'MC', nombre: 'Mínima cuantía' },
      { codigo: 'SA', nombre: 'Selección abreviada' },
    ]);
  });

  /** El criterio de aceptación: estadísticas por los cinco estados. */
  it('muestra una tarjeta por cada estado del ciclo', async () => {
    render(<VistaEstadisticas />);

    for (const etiqueta of [
      'Suscritos',
      'En ejecución',
      'Terminados',
      'Liquidados',
      'Cerrados',
    ]) {
      expect(await screen.findByText(etiqueta)).toBeInTheDocument();
    }
  });

  it('informa la ejecución presupuestal', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Ejecución presupuestal')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '25');
  });

  it('desglosa por modalidad y por tipología', async () => {
    render(<VistaEstadisticas />);

    expect(await screen.findByText('Por modalidad de selección')).toBeInTheDocument();
    expect(screen.getByText('Por tipología de contrato')).toBeInTheDocument();
    expect(screen.getByText('Prestación de servicios')).toBeInTheDocument();

    // «Selección abreviada» sale dos veces —en la barra y en el selector—, así
    // que se busca la barra por su cifra, que el selector no tiene.
    expect(screen.getByText(/3 · \$ 300 M/)).toBeInTheDocument();
  });

  it('cuenta los procesos desiertos, que también son gestión', async () => {
    render(<VistaEstadisticas />);
    expect(await screen.findByText('Declarados desiertos')).toBeInTheDocument();
  });

  it('vuelve a consultar al cambiar la vigencia', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    await userEvent.selectOptions(screen.getByLabelText('Vigencia'), '2025');

    await waitFor(() =>
      expect(servicio.estadisticas).toHaveBeenCalledWith({ vigencia: 2025, modalidad: null }),
    );
  });

  it('solo ofrece las vigencias en que hay contratos', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    const opciones = Array.from(
      (screen.getByLabelText('Vigencia') as HTMLSelectElement).options,
    ).map((o) => o.textContent);

    expect(opciones).toEqual(['Todas', '2026', '2025']);
  });

  it('la descarga es un enlace, para que el navegador nombre el archivo', async () => {
    render(<VistaEstadisticas />);

    const enlace = await screen.findByRole('link', { name: /Descargar CSV/ });
    expect(enlace).toHaveAttribute('href', '/hiring/api/v1/estadisticas/csv');
  });

  it('la descarga arrastra los filtros de la pantalla', async () => {
    render(<VistaEstadisticas />);
    await screen.findByText('Suscritos');

    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'SA');

    await waitFor(() =>
      expect(servicio.urlEstadisticasCsv).toHaveBeenCalledWith({
        vigencia: null,
        modalidad: 'SA',
      }),
    );
  });

  it('sin contratos lo dice, en vez de enseñar ceros', async () => {
    servicio.estadisticas.mockResolvedValue({
      ...REPORTE,
      contratos: { ...REPORTE.contratos, total: 0, valorTotal: 0, porEstado: [] },
    });

    render(<VistaEstadisticas />);
    expect(await screen.findByText('Sin contratos que informar')).toBeInTheDocument();
  });

  it('si la consulta falla lo muestra y no se queda cargando', async () => {
    servicio.estadisticas.mockRejectedValue(new Error('No se pudo generar el reporte'));

    render(<VistaEstadisticas />);
    expect(await screen.findByText('No se pudo generar el reporte')).toBeInTheDocument();
  });

  it('si el catálogo de modalidades falla, el reporte se ve igual', async () => {
    // Es un selector, no un requisito: sin él se consultan todas.
    servicio.modalidades.mockRejectedValue(new Error('catálogo caído'));

    render(<VistaEstadisticas />);
    expect(await screen.findByText('Suscritos')).toBeInTheDocument();
  });
});
