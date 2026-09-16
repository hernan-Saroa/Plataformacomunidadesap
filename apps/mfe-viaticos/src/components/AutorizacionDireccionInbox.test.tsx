import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionDireccionInbox from './AutorizacionDireccionInbox';

const mockExtemporaneas = [
  {
    id: 'sol-ext-001',
    consecutivoUnico: 'COM-2026-EXT-0001',
    estadoSolicitud: 'AUTORIZACION_DIRECCION',
    extemporanea: true,
    objetoComision: 'Atención urgente de emergencia regional',
    destinoCiudad: 'Leticia',
    destinoDepartamento: 'Amazonas',
    fechaInicio: '2026-10-02',
    fechaFin: '2026-10-05',
    diasComision: 4,
    montoViaticos: 950000,
    montoGastosViaje: 250000,
    totalComision: 1200000,
    montoTotal: 1200000,
    requiereTiquetes: true,
    tipoTransporte: 'AEREO',
    comisionado: {
      id: 'usr-com-01',
      numeroDocumento: '1098765432',
      nombreCompleto: 'Carlos Rodríguez',
      tipoComisionado: 'FUNCIONARIO',
    },
    documentosSoporte: [],
  },
  {
    id: 'sol-ext-002',
    consecutivoUnico: 'COM-2026-EXT-0002',
    estadoSolicitud: 'EN_AUTORIZACION',
    extemporanea: true,
    objetoComision: 'Mesa de concertación territorial',
    destinoCiudad: 'Quibdó',
    destinoDepartamento: 'Chocó',
    fechaInicio: '2026-10-08',
    fechaFin: '2026-10-10',
    diasComision: 3,
    montoViaticos: 700000,
    montoGastosViaje: 150000,
    totalComision: 850000,
    montoTotal: 850000,
    requiereTiquetes: true,
    tipoTransporte: 'AEREO',
    decisionDireccion: 'AUTORIZADA',
    fechaAutorizacionDireccion: '2026-10-01T10:00:00Z',
    comisionado: {
      id: 'usr-com-02',
      numeroDocumento: '52345678',
      nombreCompleto: 'Ana Martínez',
      tipoComisionado: 'CONTRATISTA',
    },
    documentosSoporte: [],
  },
];

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerBandejaDireccionNacional: vi.fn(),
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
  viaticosService: {
    obtenerBandejaDireccionNacional: vi.fn(),
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('AutorizacionDireccionInbox — RF-AUT-002 (Etapa 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerBandejaDireccionNacional as any).mockResolvedValue({
      data: mockExtemporaneas,
      total: 2,
      page: 1,
      limit: 10,
    });
  });

  it('renderiza la bandeja de Dirección Nacional y sus KPI cards', async () => {
    render(<AutorizacionDireccionInbox />);

    expect(screen.getByText(/Bandeja de Comisiones Extemporáneas/i)).toBeDefined();
    expect(screen.getByText(/ETAPA 6 · RF-AUT-002 · DIRECCIÓN NACIONAL/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/COM-2026-EXT-0001/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/COM-2026-EXT-0002/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Carlos Rodríguez/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Ana Martínez/i).length).toBeGreaterThan(0);
    });
  });

  it('permite filtrar solicitudes por estado', async () => {
    render(<AutorizacionDireccionInbox />);

    await waitFor(() => {
      expect(screen.getAllByText(/COM-2026-EXT-0001/i).length).toBeGreaterThan(0);
    });

    const selectFiltro = screen.getByRole('combobox');
    fireEvent.change(selectFiltro, { target: { value: 'AUTORIZACION_DIRECCION' } });

    await waitFor(() => {
      expect(viaticosService.obtenerBandejaDireccionNacional).toHaveBeenCalledWith(
        1,
        20,
        '',
        'AUTORIZACION_DIRECCION',
      );
    });
  });

  it('abre el modal de decisión al hacer click en una solicitud pendiente', async () => {
    render(<AutorizacionDireccionInbox />);

    await waitFor(() => {
      expect(screen.getAllByText(/COM-2026-EXT-0001/i).length).toBeGreaterThan(0);
    });

    const botonEvaluar = screen.getAllByRole('button', { name: /Revisar y Decidir|Revisar/i })[0];
    fireEvent.click(botonEvaluar);

    await waitFor(() => {
      expect(screen.getByText(/Autorización de Comisión Extemporánea/i)).toBeDefined();
      expect(screen.getAllByText(/COM-2026-EXT-0001/i).length).toBeGreaterThan(0);
    });
  });
});
