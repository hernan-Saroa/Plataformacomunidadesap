import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ViaticosModulePremium from './ViaticosModulePremium';
import viaticosService from '../services/api/viaticosService';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerSolicitudes: vi.fn(),
    obtenerResumenEstadistico: vi.fn(),
    obtenerComisionados: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
    obtenerLogsSst: vi.fn(),
    reenviarNotificacionSst: vi.fn(),
    exportarFormato023: vi.fn(),
    obtenerBandejaSecretario: vi.fn().mockResolvedValue({ data: [] }),
    mapearSolicitudLista: vi.fn().mockImplementation((x) => x),
    obtenerUrlArchivo: vi.fn().mockReturnValue('http://mock/archivo.pdf'),
  },
  viaticosService: {
    obtenerSolicitudes: vi.fn(),
    obtenerResumenEstadistico: vi.fn(),
    obtenerComisionados: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
    obtenerLogsSst: vi.fn(),
    reenviarNotificacionSst: vi.fn(),
    exportarFormato023: vi.fn(),
    obtenerBandejaSecretario: vi.fn().mockResolvedValue({ data: [] }),
    mapearSolicitudLista: vi.fn().mockImplementation((x) => x),
    obtenerUrlArchivo: vi.fn().mockReturnValue('http://mock/archivo.pdf'),
  },
}));

vi.mock('../services/api/authService', () => {
  const mockUser = {
    userId: 'usr-1',
    username: 'admin',
    roles: ['SUPER_ADMIN'],
    permissions: ['*'],
    esAdmin: true,
  };
  const mockAuthService = {
    getCurrentUser: vi.fn().mockResolvedValue(mockUser),
    getCurrentUserSync: vi.fn().mockReturnValue(mockUser),
    determinarRolAsync: vi.fn().mockResolvedValue('SUPER_ADMIN'),
    isSuperAdmin: vi.fn().mockReturnValue(true),
    isSecretario: vi.fn().mockReturnValue(false),
    isAnalista: vi.fn().mockReturnValue(false),
    isControlViaticos: vi.fn().mockReturnValue(false),
    isSubdireccionGestionCorporativa: vi.fn().mockReturnValue(false),
    isDireccionNacional: vi.fn().mockReturnValue(false),
    isPresupuesto: vi.fn().mockReturnValue(true),
    canCancelarComision: vi.fn().mockReturnValue(true),
    canEnviarPresupuesto: vi.fn().mockReturnValue(true),
    canExpedirRp: vi.fn().mockReturnValue(true),
    canCrearObligacion: vi.fn().mockReturnValue(true),
    hasRole: vi.fn().mockReturnValue(true),
    hasPermission: vi.fn().mockReturnValue(true),
    hasAnyPermission: vi.fn().mockReturnValue(true),
    hasAllPermissions: vi.fn().mockReturnValue(true),
  };
  return {
    __esModule: true,
    authService: mockAuthService,
    default: mockAuthService,
  };
});

describe('RF-PAG-002 — Integración Frontend: Hito de Trazabilidad SST', () => {
  const mockSolicitudComprometida = {
    id: 'sol-sst-100',
    codigo: 'COM-2026-0999',
    cedulaComisionado: '52998877',
    nombreComisionado: 'Beatriz Helena Pinzón',
    cargoComisionado: 'Asesora de Planeación',
    dependencia: 'Dirección General',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Cartagena de Indias',
    departamentoDestino: 'Bolívar',
    fechaInicio: '2026-11-20',
    fechaFin: '2026-11-23',
    diasComision: 3,
    tipoComision: 'NACIONAL',
    medioTransporte: 'AEREO',
    justificacion: 'Acompañamiento en mesas técnicas de fortalecimiento institucional territorial',
    montoSolicitadoViaticos: 1200000,
    montoSolicitadoGastosViaje: 200000,
    montoTotalEstimado: 1400000,
    estado: 'COMPROMETIDA',
    extemporanea: false,
    radicadoFueraJornada: false,
    requiereTiqueteAereo: true,
    creadoEn: '2026-11-01T10:00:00Z',
    actualizadoEn: '2026-11-05T15:00:00Z',
    notificadoSst: true,
    codigoRp: '2026-11-05_RP_78901',
    numeroRp: '78901',
    fechaRp: '2026-11-05',
    valorComprometido: 1400000,
    rubroRp: 'VIATICOS_TERRITORIAL',
  };

  const mockLogSst = {
    id: 'log-sst-001',
    solicitudId: 'sol-sst-100',
    comisionadoId: 'com-100',
    fechaEnvio: '2026-11-05T15:30:00Z',
    canalEnvio: 'EMAIL',
    estadoEnvio: 'ENVIADO',
    destinatario: 'sst@esap.edu.co',
    payloadNotificado: {
      nombre_completo_comisionado: 'Beatriz Helena Pinzón',
      documento_identidad: '52998877',
      ciudad_destino: 'Cartagena de Indias (Bolívar)',
      fecha_inicio_viaje: '2026-11-20',
      fecha_fin_viaje: '2026-11-23',
      objeto_comision: 'Acompañamiento en mesas técnicas de fortalecimiento institucional territorial',
      consecutivo_comision: 'COM-2026-0999',
    },
    errorMensaje: null,
    creadoEn: '2026-11-05T15:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerSolicitudes as any).mockResolvedValue({
      solicitudes: [mockSolicitudComprometida],
      total: 1,
    });
    (viaticosService.obtenerBandejaSecretario as any).mockResolvedValue({ data: [] });
    (viaticosService.obtenerResumenEstadistico as any).mockResolvedValue({
      totalSolicitudes: 1,
      enProcesoAprobacion: 0,
      enComisionActivas: 0,
      pendientesLegalizar: 0,
      borradores: 0,
      montoTotalEjecutado: 1400000,
    });
    (viaticosService.obtenerComisionados as any).mockResolvedValue([]);
    (viaticosService.obtenerSolicitudCompleta as any).mockResolvedValue({
      ...mockSolicitudComprometida,
      documentosSoporte: [],
    });
    (viaticosService.obtenerLogsSst as any).mockResolvedValue([mockLogSst]);
    (viaticosService.reenviarNotificacionSst as any).mockResolvedValue({
      success: true,
      message: 'Notificación despachada exitosamente al área de SST (sst@esap.edu.co).',
      data: mockLogSst,
    });
  });

  it('renderiza el hito gráfico de SST con ícono y texto formal en el modal de detalle', async () => {
    render(<ViaticosModulePremium />);

    // Esperar a que la tabla liste la comisión
    await waitFor(() => {
      expect(screen.getByText('COM-2026-0999')).toBeInTheDocument();
    });

    // Abrir modal de detalle
    const btnVerDetalle = screen.getByTitle('Ver Detalle');
    fireEvent.click(btnVerDetalle);

    // Debe mostrarse el hito verde de SST
    await waitFor(() => {
      expect(
        screen.getByText(/Notificación automática enviada a SST \(Seguridad y Salud en el Trabajo\)/i),
      ).toBeInTheDocument();
    });

    // Se verifica que consultó los logs de SST para la solicitud
    expect(viaticosService.obtenerLogsSst).toHaveBeenCalledWith('sol-sst-100');
  });

  it('permite expandir y previsualizar los datos notificados (comisionado, destino, fechas, objeto)', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0999')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Ver Detalle'));

    await waitFor(() => {
      expect(
        screen.getByText(/Notificación automática enviada a SST/i),
      ).toBeInTheDocument();
    });

    // El botón de expansión
    const btnExpandir = screen.getByTitle(/Previsualizar datos notificados a SST/i);
    fireEvent.click(btnExpandir);

    // Debe mostrar los datos notificados
    await waitFor(() => {
      expect(screen.getByText(/Expediente de Desplazamiento Formalizado ante SST/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Cartagena de Indias \(Bolívar\)/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/52998877/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Acompañamiento en mesas técnicas/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('permite invocar el reenvío manual a SST y muestra mensaje de confirmación', async () => {
    render(<ViaticosModulePremium />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0999')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Ver Detalle'));

    await waitFor(() => {
      expect(screen.getByText(/Reenviar/i)).toBeInTheDocument();
    });

    // Clic en botón Reenviar
    const btnReenviar = screen.getByTitle(/Forzar reenvío formal a SST/i);
    fireEvent.click(btnReenviar);

    await waitFor(() => {
      expect(viaticosService.reenviarNotificacionSst).toHaveBeenCalledWith('sol-sst-100');
      expect(
        screen.getByText(/Notificación despachada exitosamente al área de SST/i),
      ).toBeInTheDocument();
    });
  });
});
