import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ComisionadoInbox from './ComisionadoInbox';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerSolicitudesComisionado: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
    obtenerEstadoFirmas: vi.fn(),
    exportarFormato023: vi.fn(),
  },
  viaticosService: {
    obtenerSolicitudesComisionado: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
    obtenerEstadoFirmas: vi.fn(),
    exportarFormato023: vi.fn(),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    getCurrentUserSync: vi.fn(() => ({
      userId: 'usr-comisionado-1',
      username: '10203040',
      fullName: 'Carlos Comisionado',
      roles: ['COMISIONADO'],
      permissions: ['travel_expenses.general.es_comisionado', 'travel_expenses:read_own_requests'],
      esAdmin: false,
    })),
    isComisionado: vi.fn(() => true),
    hasPermission: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
  },
}));

import viaticosService from '../services/api/viaticosService';

const mockSolicitudes = [
  {
    id: 'sol-001',
    codigo: 'CS-2026-0001',
    cedulaComisionado: '10203040',
    nombreComisionado: 'Carlos Comisionado',
    cargoComisionado: 'Profesional Universitario',
    dependencia: 'Subdirección de Gestión Corporativa',
    sedeOrigen: 'Sede Central',
    ciudadOrigen: 'Bogotá D.C.',
    ciudadDestino: 'Medellín',
    departamentoDestino: 'Antioquia',
    fechaInicio: '2026-10-10T00:00:00Z',
    fechaFin: '2026-10-12T00:00:00Z',
    diasComision: 3,
    tipoComision: 'SERVICIOS_INSTITUCIONALES',
    medioTransporte: 'AEREO',
    justificacion: 'Acompañamiento institucional territorial',
    montoSolicitadoViaticos: 800000,
    montoSolicitadoGastosViaje: 200000,
    montoTotalEstimado: 1000000,
    montoViaticos: 800000,
    montoGastosViaje: 200000,
    estado: 'PAGADA',
    extemporanea: false,
    radicadoFueraJornada: false,
    requiereTiqueteAereo: true,
    numeroRp: 'RP-2026-123',
    numeroObligacion: 'OBL-2026-456',
    modalidadPago: 'AVANCE',
    creadoEn: '2026-10-01T08:00:00Z',
    actualizadoEn: '2026-10-05T08:00:00Z',
  },
  {
    id: 'sol-002',
    codigo: 'CS-2026-0002',
    cedulaComisionado: '10203040',
    nombreComisionado: 'Carlos Comisionado',
    cargoComisionado: 'Profesional Universitario',
    dependencia: 'Subdirección de Gestión Corporativa',
    sedeOrigen: 'Sede Central',
    ciudadOrigen: 'Bogotá D.C.',
    ciudadDestino: 'Cali',
    departamentoDestino: 'Valle del Cauca',
    fechaInicio: '2026-10-15T00:00:00Z',
    fechaFin: '2026-10-18T00:00:00Z',
    diasComision: 4,
    tipoComision: 'SERVICIOS_INSTITUCIONALES',
    medioTransporte: 'AEREO',
    justificacion: 'Capacitación presencial regional',
    montoSolicitadoViaticos: 1200000,
    montoSolicitadoGastosViaje: 300000,
    montoTotalEstimado: 1500000,
    montoViaticos: 1200000,
    montoGastosViaje: 300000,
    estado: 'PENDIENTE_LEGALIZACION',
    extemporanea: false,
    radicadoFueraJornada: false,
    requiereTiqueteAereo: true,
    numeroRp: 'RP-2026-789',
    creadoEn: '2026-10-02T08:00:00Z',
    actualizadoEn: '2026-10-06T08:00:00Z',
  },
];

describe('ComisionadoInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerSolicitudesComisionado as any).mockResolvedValue({
      solicitudes: mockSolicitudes,
      esSuperAdmin: false,
    });
    (viaticosService.obtenerSolicitudCompleta as any).mockResolvedValue({
      ...mockSolicitudes[0],
      documentosSoporte: [
        {
          id: 'doc-1',
          tipoDocumento: 'CERTIFICACION_BANCARIA',
          nombreArchivoOriginal: 'cert_banco.pdf',
          urlRepositorio: '/uploads/cert.pdf',
        },
      ],
    });
    (viaticosService.obtenerEstadoFirmas as any).mockResolvedValue({
      jefeFirmado: true,
      jefeNombre: 'Dra. María Directora',
      subdirectorFirmado: true,
      subdirectorNombre: 'Dr. Pedro Subdirector',
    });
  });

  it('debe renderizar el encabezado y KPIs de la vista del comisionado', async () => {
    render(<ComisionadoInbox />);

    expect(screen.getByText(/Mis Comisiones de Servicios/i)).toBeInTheDocument();
    expect(screen.getByText(/Rol Comisionado Activo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('CS-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('CS-2026-0002')).toBeInTheDocument();
    });

    expect(screen.getByText('Medellín')).toBeInTheDocument();
    expect(screen.getByText('Cali')).toBeInTheDocument();
  });

  it('debe mostrar la alerta y botón para legalizar cuando hay solicitudes pendientes de legalización', async () => {
    const mockLegalizar = vi.fn();
    render(<ComisionadoInbox onIrALegalizacion={mockLegalizar} />);

    await waitFor(() => {
      expect(screen.getByText(/Tiene 1 comisión\(es\) pendiente\(s\) de legalización/i)).toBeInTheDocument();
    });

    const botonLegalizar = screen.getAllByRole('button', { name: /Legalizar/i })[0];
    expect(botonLegalizar).toBeInTheDocument();
    fireEvent.click(botonLegalizar);
    expect(mockLegalizar).toHaveBeenCalled();
  });

  it('debe filtrar las solicitudes por término de búsqueda', async () => {
    render(<ComisionadoInbox />);

    await waitFor(() => {
      expect(screen.getByText('CS-2026-0001')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Buscar por código, destino.../i);
    fireEvent.change(input, { target: { value: 'Medellín' } });

    expect(screen.getByText('CS-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('CS-2026-0002')).not.toBeInTheDocument();
  });

  it('debe permitir abrir el modal de detalle de la comisión', async () => {
    render(<ComisionadoInbox />);

    await waitFor(() => {
      expect(screen.getByText('CS-2026-0001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('CS-2026-0001'));

    await waitFor(() => {
      expect(screen.getByText(/Flujo Institucional del Trámite/i)).toBeInTheDocument();
      expect(screen.getByText(/Objeto Oficial de la Comisión/i)).toBeInTheDocument();
    });
  });

  it('debe permitir descargar el Formato 023 en PDF', async () => {
    const mockBlob = new Blob(['pdf-data'], { type: 'application/pdf' });
    (viaticosService.exportarFormato023 as any).mockResolvedValue(mockBlob);

    // Mock window.URL
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
    window.open = vi.fn();

    render(<ComisionadoInbox />);

    await waitFor(() => {
      expect(screen.getByText('CS-2026-0001')).toBeInTheDocument();
    });

    const btnsDescargar = screen.getAllByTitle(/Descargar Formato 023 \(PDF\)/i);
    fireEvent.click(btnsDescargar[0]);

    await waitFor(() => {
      expect(viaticosService.exportarFormato023).toHaveBeenCalledWith('sol-001', 'CS-2026-0001');
      expect(window.open).toHaveBeenCalledWith('blob:url', '_blank', 'noopener,noreferrer');
    });
  });
});
