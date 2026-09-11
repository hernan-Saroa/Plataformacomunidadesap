import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionInbox from './AutorizacionInbox';

const mockData = [
  {
    id: 'sol-001',
    consecutivoUnico: 'COM-2026-0001',
    estadoSolicitud: 'EN_AUTORIZACION',
    objetoComision: 'Capacitación en territorio',
    destinoCiudad: 'Cartagena',
    destinoDepartamento: 'Bolívar',
    fechaInicio: '2026-10-15',
    fechaFin: '2026-10-18',
    diasComision: 4,
    montoViaticos: 800000,
    montoGastosViaje: 200000,
    totalComision: 1000000,
    montoTotal: 1000000,
    requiereTiquetes: true,
    tipoTransporte: 'AEREO',
    comisionado: {
      id: 'com-001',
      numeroDocumento: '123456789',
      nombreCompleto: 'María Gómez',
      tipoComisionado: 'FUNCIONARIO',
    },
    documentosSoporte: [],
  },
  {
    id: 'sol-002',
    consecutivoUnico: 'COM-2026-0002',
    estadoSolicitud: 'AUTORIZADA',
    objetoComision: 'Auditoría interna',
    destinoCiudad: 'Medellín',
    destinoDepartamento: 'Antioquia',
    fechaInicio: '2026-10-20',
    fechaFin: '2026-10-22',
    diasComision: 3,
    montoViaticos: 600000,
    montoGastosViaje: 100000,
    totalComision: 700000,
    montoTotal: 700000,
    requiereTiquetes: false,
    tipoTransporte: 'TERRESTRE',
    comisionado: {
      id: 'com-002',
      numeroDocumento: '987654321',
      nombreCompleto: 'Juan Pérez',
      tipoComisionado: 'CONTRATISTA',
    },
    documentosSoporte: [],
  },
];

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerBandejaAutorizacion: vi.fn(),
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
  viaticosService: {
    obtenerBandejaAutorizacion: vi.fn(),
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('AutorizacionInbox — RF-AUT-001 (Etapa 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerBandejaAutorizacion as any).mockResolvedValue({
      data: mockData,
      total: 2,
      page: 1,
      limit: 10,
    });
  });

  it('renderiza el encabezado y carga las comisiones de la bandeja', async () => {
    render(<AutorizacionInbox />);

    expect(screen.getByText(/Bandeja de Autorizaciones/i)).toBeDefined();
    expect(screen.getByText(/Autorización Corporativa/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
      expect(screen.getByText('María Gómez')).toBeDefined();
      expect(screen.getByText('Juan Pérez')).toBeDefined();
    });
  });

  it('permite filtrar por estado', async () => {
    render(<AutorizacionInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
    });

    const soloAutorizadasTab = screen.getByRole('button', { name: /Autorizadas/i });
    fireEvent.click(soloAutorizadasTab);

    await waitFor(() => {
      expect(viaticosService.obtenerBandejaAutorizacion).toHaveBeenCalledWith(
        1,
        20,
        '',
        'AUTORIZADA',
      );
    });
  });

  it('abre el modal de autorización al hacer clic en "Revisar y Autorizar"', async () => {
    render(<AutorizacionInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
    });

    const revisarBtn = screen.getAllByText('Revisar y Autorizar')[0];
    fireEvent.click(revisarBtn);

    await waitFor(() => {
      expect(screen.getByText('Autorizar Comisión (AUTORIZADA)')).toBeDefined();
    });
  });
});

describe('AuthService — Rol y Permisos Subdirección de Gestión Corporativa (RF-AUT-001)', () => {
  let authServiceInstance: typeof import('../services/api/authService').default;

  beforeEach(async () => {
    delete (window as any).__esap_auth_cache;
    const module = await import('../services/api/authService');
    authServiceInstance = module.default;
  });

  it('detecta rol canónico SUBDIRECCION_GESTION_CORPORATIVA', () => {
    (window as any).__esap_auth_cache = {
      id_user: 'usr-sub-001',
      roles: ['SUBDIRECCION_GESTION_CORPORATIVA'],
      permissions: [],
    };
    expect(authServiceInstance.isSubdireccionGestionCorporativa()).toBe(true);
  });

  it('detecta rol objeto { code: "subdireccion-gestion-corporativa" }', () => {
    (window as any).__esap_auth_cache = {
      id_user: 'usr-sub-002',
      roles: [{ code: 'SUBDIRECCION_GESTION_CORPORATIVA', name: 'Subdirector Gestión Corporativa' }],
      permissions: [],
    };
    expect(authServiceInstance.isSubdireccionGestionCorporativa()).toBe(true);
  });

  it('detecta rol alternativo SUBDIRECTOR_GESTION_CORPORATIVA', () => {
    (window as any).__esap_auth_cache = {
      id_user: 'usr-sub-003',
      roles: ['SUBDIRECTOR_GESTION_CORPORATIVA'],
      permissions: [],
    };
    expect(authServiceInstance.isSubdireccionGestionCorporativa()).toBe(true);
  });

  it('detecta por permiso granular travel_expenses:read_authorizations', () => {
    (window as any).__esap_auth_cache = {
      id_user: 'usr-sub-004',
      roles: ['USUARIO_OPERATIVO'],
      permissions: ['travel_expenses:read_authorizations'],
    };
    expect(authServiceInstance.isSubdireccionGestionCorporativa()).toBe(true);
  });

  it('retorna false para roles no autorizados', () => {
    (window as any).__esap_auth_cache = {
      id_user: 'usr-com-001',
      roles: ['DOCENTE_OCASIONAL'],
      permissions: ['travel_expenses:view_own_requests'],
    };
    expect(authServiceInstance.isSubdireccionGestionCorporativa()).toBe(false);
  });
});

