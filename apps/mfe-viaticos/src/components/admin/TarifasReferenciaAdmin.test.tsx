import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TarifasReferenciaAdmin from './TarifasReferenciaAdmin';

vi.mock('../../services/api/viaticosService', () => ({
  default: {
    obtenerTarifasReferencia: vi.fn(),
    sincronizarTarifasBatch: vi.fn(),
    crearTarifaReferencia: vi.fn(),
    actualizarTarifaReferencia: vi.fn(),
    eliminarTarifaReferencia: vi.fn(),
  },
}));

import viaticosService from '../../services/api/viaticosService';

describe('TarifasReferenciaAdmin — Vista de Config Parámetros para Rutas y Sincronización', () => {
  const tarifasMock = [
    {
      id: 1,
      origenCiudad: 'Bogotá, D.C.',
      origenIata: 'BOG',
      destinoCiudad: 'Medellín',
      destinoIata: 'MDE',
      tarifaEstimada: 380000,
      tarifaMinima: 290000,
      tarifaMaxima: 520000,
      fuente: 'API_AMADEUS',
      notas: 'Ruta de alta frecuencia',
      activo: true,
      ultimaActualizacion: new Date('2026-10-05T10:00:00Z'),
    },
    {
      id: 2,
      origenCiudad: 'Bogotá, D.C.',
      origenIata: 'BOG',
      destinoCiudad: 'Cali',
      destinoIata: 'CLO',
      tarifaEstimada: 360000,
      tarifaMinima: 270000,
      tarifaMaxima: 480000,
      fuente: 'ESTIMADOR_REFERENCIA_ESAP',
      notas: '',
      activo: false,
      ultimaActualizacion: new Date('2026-10-04T10:00:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerTarifasReferencia as any).mockResolvedValue(tarifasMock);
    (viaticosService.sincronizarTarifasBatch as any).mockResolvedValue({
      totalRutas: 2,
      actualizadas: 2,
      fuente: 'API_AMADEUS',
      mensaje: 'Sincronización completada exitosamente para 2 rutas.',
      rutasActualizadas: [],
    });
  });

  it('renderiza el título, las estadísticas y la tabla de rutas', async () => {
    render(<TarifasReferenciaAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Tarifas de Referencia de Tiquetes Aéreos')).toBeTruthy();
      expect(screen.getByText('BOG ⇄ MDE')).toBeTruthy();
      expect(screen.getByText('BOG ⇄ CLO')).toBeTruthy();
      expect(screen.getByText('API_AMADEUS')).toBeTruthy();
    });
  });

  it('permite filtrar rutas por término de búsqueda', async () => {
    render(<TarifasReferenciaAdmin />);

    await waitFor(() => {
      expect(screen.getByText('BOG ⇄ MDE')).toBeTruthy();
    });

    const inputBusqueda = screen.getByPlaceholderText(/Buscar por ciudad/i);
    fireEvent.change(inputBusqueda, { target: { value: 'Medellín' } });

    await waitFor(() => {
      expect(screen.getByText('BOG ⇄ MDE')).toBeTruthy();
      expect(screen.queryByText('BOG ⇄ CLO')).toBeNull();
    });
  });

  it('permite ejecutar la sincronización batch con la API', async () => {
    render(<TarifasReferenciaAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Sincronizar con API')).toBeTruthy();
    });

    const botonSync = screen.getByText('Sincronizar con API');
    fireEvent.click(botonSync);

    await waitFor(() => {
      expect(viaticosService.sincronizarTarifasBatch).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/Sincronización completada exitosamente/i),
      ).toBeTruthy();
    });
  });

  it('abre el modal y crea una nueva tarifa de referencia', async () => {
    (viaticosService.crearTarifaReferencia as any).mockResolvedValue({
      id: 3,
      origenCiudad: 'Bogotá, D.C.',
      origenIata: 'BOG',
      destinoCiudad: 'Cartagena',
      destinoIata: 'CTG',
      tarifaEstimada: 420000,
      activo: true,
    });

    render(<TarifasReferenciaAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Nueva Ruta / Tarifa')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Nueva Ruta / Tarifa'));

    await waitFor(() => {
      expect(screen.getByText('Nueva Ruta de Referencia')).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('Ej. Bogotá, D.C.'), {
      target: { value: 'Bogotá, D.C.' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej. Medellín'), {
      target: { value: 'Cartagena' },
    });
    fireEvent.change(screen.getByPlaceholderText('380000'), {
      target: { value: '420000' },
    });

    const botonGuardar = screen.getByText('Guardar Ruta');
    fireEvent.click(botonGuardar);

    await waitFor(() => {
      expect(viaticosService.crearTarifaReferencia).toHaveBeenCalledWith(
        expect.objectContaining({
          origenCiudad: 'Bogotá, D.C.',
          destinoCiudad: 'Cartagena',
          tarifaEstimada: 420000,
        }),
      );
    });
  });

  it('permite cambiar el estado de una ruta (activar / desactivar)', async () => {
    (viaticosService.actualizarTarifaReferencia as any).mockResolvedValue({
      ...tarifasMock[0],
      activo: false,
    });

    render(<TarifasReferenciaAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Activa')).toBeTruthy();
    });

    const botonEstado = screen.getByText('Activa');
    fireEvent.click(botonEstado);

    await waitFor(() => {
      expect(viaticosService.actualizarTarifaReferencia).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ activo: false }),
      );
    });
  });
});
