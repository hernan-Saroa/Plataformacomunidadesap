import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import BandejaFirmasAprobacion from './BandejaFirmasAprobacion';
import viaticosService from '../services/api/viaticosService';
import authService from '../services/api/authService';

const { mockViaticosService, mockAuthService } = vi.hoisted(() => {
  const mvs = {
    obtenerBandejaFirmas: vi.fn(),
    exportarFormato023: vi.fn(),
    obtenerEstadoFirmas: vi.fn(),
    firmarSolicitud: vi.fn(),
    devolverFirma: vi.fn(),
  };
  const mas = {
    getCurrentUser: vi.fn(),
    getCurrentUserSync: vi.fn(),
    isSuperAdmin: vi.fn(),
    isJefeDependencia: vi.fn(),
    isGerenteProyecto: vi.fn(),
    isSubdireccionGestionCorporativa: vi.fn(),
    isDireccionNacional: vi.fn(),
    canFirmarAprobacion: vi.fn(),
    hasPermission: vi.fn(),
  };
  return { mockViaticosService: mvs, mockAuthService: mas };
});

vi.mock('../services/api/viaticosService', () => ({
  default: mockViaticosService,
  viaticosService: mockViaticosService,
}));

vi.mock('../services/api/authService', () => ({
  default: mockAuthService,
  authService: mockAuthService,
}));

describe('BandejaFirmasAprobacion — Formato 023 (Previo a Radicación)', () => {
  const mockSolicitudes = [
    {
      id: 'sol-001',
      codigoSolicitud: 'SOL-2026-00001',
      estadoSolicitud: 'PENDIENTE_FIRMAS',
      objetoComision: 'Reunión territorial Medellín',
      ciudadDestino: 'Medellín',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-05',
      montoTotalEstimado: 1250000,
      comisionado: {
        nombre: 'Carlos Comisionado',
        numeroDocumento: '10203040',
        cargo: 'Profesional Especializado',
        dependencia: 'Subdirección de Gestión Corporativa',
      },
      camposAdicionales: {
        reglaDesplazamiento: 'SUBDIRECTOR_NACIONAL',
        descripcionReglaDesplazamiento: 'Regla 1: Desplazamiento Subdirector Nacional -> Firma Director Nacional',
        firmasAprobacion: [
          {
            tipo: 'JEFE_DEPENDENCIA',
            nombreFirmante: 'Director General',
            cargoFirmante: 'Director Nacional',
            fechaFirma: '2026-09-28T10:00:00.000Z',
          },
        ],
      },
    },
    {
      id: 'sol-002',
      codigoSolicitud: 'SOL-2026-00002',
      estadoSolicitud: 'PENDIENTE_FIRMAS',
      objetoComision: 'Auditoría en Cali',
      ciudadDestino: 'Cali',
      fechaInicio: '2026-10-10',
      fechaFin: '2026-10-14',
      montoTotalEstimado: 950000,
      comisionado: {
        nombre: 'Ana Auditora',
        numeroDocumento: '98765432',
        cargo: 'Auditor',
        dependencia: 'Dirección Territorial Valle',
      },
      camposAdicionales: {
        reglaDesplazamiento: 'REGULAR',
        firmasAprobacion: [],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.getCurrentUser.mockReturnValue({
      primerNombre: 'Jefe',
      primerApellido: 'Dependencia',
    });
    mockAuthService.getCurrentUserSync.mockReturnValue({
      userId: 'user-jefe-1',
      username: 'Jefe Dependencia',
      roles: ['JEFE_DEPENDENCIA'],
      permissions: ['travel_expenses.general.es_jefe_dependencia'],
      esAdmin: false,
    });
    mockAuthService.isSuperAdmin.mockReturnValue(false);
    mockAuthService.isJefeDependencia.mockReturnValue(true);
    mockAuthService.isGerenteProyecto.mockReturnValue(false);
    mockAuthService.isSubdireccionGestionCorporativa.mockReturnValue(false);
    mockAuthService.isDireccionNacional.mockReturnValue(false);
    mockAuthService.canFirmarAprobacion.mockReturnValue(true);

    mockViaticosService.obtenerBandejaFirmas.mockResolvedValue({
      data: mockSolicitudes,
      total: 2,
      page: 1,
      limit: 20,
    });
    mockViaticosService.obtenerEstadoFirmas.mockResolvedValue({
      solicitudId: 'sol-001',
      requiereFirmaJefe: true,
      requiereFirmaGerente: false,
      reglaDesplazamiento: 'SUBDIRECTOR_NACIONAL',
      descripcionRegla: 'Regla 1: Desplazamiento Subdirector Nacional -> Firma Director Nacional',
      firmantes: [
        {
          tipo: 'JEFE_DEPENDENCIA',
          etiqueta: 'Director Nacional',
          cargo: 'Director General',
          requerido: true,
          firmado: false,
        },
      ],
      firmas: [],
      firmasCompletadas: false,
    });
  });

  it('renderiza el banner institucional, métricas y lista de comisiones', async () => {
    render(<BandejaFirmasAprobacion />);

    expect(screen.getByText(/Bandeja de Firmas de Aprobación — Formato 023/i)).toBeDefined();
    expect(screen.getAllByText(/Previo a Radicación/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('SOL-2026-00001')).toBeDefined();
      expect(screen.getByText('SOL-2026-00002')).toBeDefined();
      expect(screen.getByText('Carlos Comisionado')).toBeDefined();
      expect(screen.getByText('Ana Auditora')).toBeDefined();
    });
  });

  it('muestra las insignias de regla de desplazamiento y regla regular', async () => {
    render(<BandejaFirmasAprobacion />);

    await waitFor(() => {
      expect(screen.getByText(/Regla: Firma Director Nac\. \(Subdirector se desplaza\)/i)).toBeDefined();
      expect(screen.getByText(/Regla Regular: Jefe de Dependencia \+ Gerente/i)).toBeDefined();
    });
  });

  it('permite filtrar solicitudes por regla de desplazamiento', async () => {
    render(<BandejaFirmasAprobacion />);

    await waitFor(() => {
      expect(screen.getByText('SOL-2026-00001')).toBeDefined();
      expect(screen.getByText('SOL-2026-00002')).toBeDefined();
    });

    const botonReglaEspecial = screen.getByRole('button', { name: /Reglas Desplazamiento/i });
    fireEvent.click(botonReglaEspecial);

    expect(screen.getByText('SOL-2026-00001')).toBeDefined();
    expect(screen.queryByText('SOL-2026-00002')).toBeNull();
  });

  it('permite abrir el modal de firmas de aprobación al presionar "Revisar y Firmar"', async () => {
    render(<BandejaFirmasAprobacion />);

    await waitFor(() => {
      expect(screen.getByText('SOL-2026-00001')).toBeDefined();
    });

    const botonesFirmar = screen.getAllByRole('button', { name: /Revisar y Firmar Formato 023/i });
    expect(botonesFirmar.length).toBeGreaterThan(0);

    fireEvent.click(botonesFirmar[0]);

    await waitFor(() => {
      expect(mockViaticosService.obtenerEstadoFirmas).toHaveBeenCalledWith('sol-001');
    });
  });

  it('permite descargar el Formato 023 en PDF', async () => {
    const fakeBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    mockViaticosService.exportarFormato023.mockResolvedValue(fakeBlob);
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-pdf');
    window.URL.revokeObjectURL = vi.fn();

    render(<BandejaFirmasAprobacion />);

    await waitFor(() => {
      expect(screen.getByText('SOL-2026-00001')).toBeDefined();
    });

    const botonesPdf = screen.getAllByRole('button', { name: /PDF 023/i });
    fireEvent.click(botonesPdf[0]);

    await waitFor(() => {
      expect(mockViaticosService.exportarFormato023).toHaveBeenCalledWith('sol-001', 'SOL-2026-00001');
    });
  });
});
