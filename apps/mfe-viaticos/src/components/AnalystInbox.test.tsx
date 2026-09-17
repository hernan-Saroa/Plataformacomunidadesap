import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalystInbox from './AnalystInbox';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerSolicitudesAsignadasAnalista: vi.fn(),
    obtenerDependencias: vi.fn(),
    obtenerSolicitudCompleta: vi.fn(),
    enviarPaquetePresupuesto: vi.fn(),
  },
}));

vi.mock('../services/api/authService', () => {
  const auth = {
    canCancelarComision: vi.fn(() => true),
    canEnviarPresupuesto: vi.fn(() => true),
    canCrearObligacion: vi.fn(() => true),
    isAnalista: vi.fn(() => true),
    getCurrentUserSync: vi.fn(() => ({
      userId: '1',
      username: 'analista_test',
      roles: ['ANALISTA'],
      permissions: [],
      esAdmin: false,
    })),
  };
  return {
    default: auth,
    authService: auth,
  };
});

import viaticosService from '../services/api/viaticosService';

const solMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'SOLICITADO',
  comisionado: {
    primerNombre: 'Juan',
    primerApellido: 'Pérez',
    numeroDocumento: '123456789',
    tipoComisionado: 'FUNCIONARIO',
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-09-10',
  fechaFin: '2026-09-15',
  prioridad: 'ALTA',
  ...overrides,
});

describe('AnalystInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerDependencias as any).mockResolvedValue([]);
  });

  it('muestra el estado de carga inicialmente', () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([]);

    render(<AnalystInbox />);

    expect(screen.getByText(/Cargando solicitudes/i)).toBeDefined();
  });

  it('renderiza las solicitudes después de fetch', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock(),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText('Juan Pérez')).toBeDefined();
    });
  });

  it('muestra mensaje cuando no hay solicitudes asignadas', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText(/No tienes solicitudes asignadas/i)).toBeDefined();
    });
  });

  it('filtra por búsqueda', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({ consecutivoUnico: 'COM-2026-0001', comisionado: { primerNombre: 'Juan', primerApellido: 'Pérez', numeroDocumento: '123456789' } }),
      solMock({ id: 'sol-002', consecutivoUnico: 'COM-2026-0002', comisionado: { primerNombre: 'Ana', primerApellido: 'Gómez', numeroDocumento: '987654321' } }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-0001')).toBeDefined());

    const input = screen.getByPlaceholderText(/Buscar por consecutivo/i);
    fireEvent.change(input, { target: { value: 'Ana' } });

    await waitFor(() => {
      expect(screen.queryByText('COM-2026-0001')).toBeNull();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
    });
  });

  it('muestra badge de facturador electrónico para contratistas marcados', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        consecutivoUnico: 'COM-2026-0003',
        comisionado: {
          primerNombre: 'Carlos',
          primerApellido: 'Mora',
          numeroDocumento: '778899',
          tipoComisionado: 'CONTRATISTA',
          esFacturadorElectronico: true,
        },
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0003')).toBeDefined();
      expect(screen.getByText('Facturador Electrónico')).toBeDefined();
    });
  });

  it('filtra y muestra solicitudes en la Bandeja de Devoluciones', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-dev-1',
        consecutivoUnico: 'COM-2026-DEV1',
        estadoSolicitud: 'DEVUELTA',
        motivoDevolucion: 'Falta RUT actualizado y soporte de transporte',
        comisionado: {
          primerNombre: 'Diana',
          primerApellido: 'Ríos',
          numeroDocumento: '556677',
          tipoComisionado: 'CONTRATISTA',
          esFacturadorElectronico: true,
        },
        revisorControlNombre: 'Pedro Control',
      }),
      solMock({
        id: 'sol-ok-2',
        consecutivoUnico: 'COM-2026-OK2',
        estadoSolicitud: 'EN_VERIFICACION',
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-DEV1')).toBeDefined());

    // Switch to tab Devoluciones
    const tabDevoluciones = screen.getByRole('button', { name: /Bandeja de Devoluciones/i });
    fireEvent.click(tabDevoluciones);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-DEV1')).toBeDefined();
      expect(screen.getByText(/Falta RUT actualizado y soporte de transporte/i)).toBeDefined();
      expect(screen.getByText('Consultar Devolución')).toBeDefined();
      expect(screen.queryByText('COM-2026-OK2')).toBeNull();
    });
  });

  it('muestra badge de Extemporánea coexistiendo con el estado ordinario y pestaña Extemporáneas', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-ext-1',
        consecutivoUnico: 'COM-2026-EXT1',
        estadoSolicitud: 'VERIFICADA',
        extemporanea: true,
      }),
      solMock({
        id: 'sol-norm-2',
        consecutivoUnico: 'COM-2026-NORM2',
        estadoSolicitud: 'SOLICITADO',
        extemporanea: false,
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-EXT1')).toBeDefined();
      // Extemporánea badge coexists with VERIFICADA state
      expect(screen.getAllByText('Extemporánea').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Verificada')).toBeDefined();
    });

    // Switch to Extemporáneas tab
    const tabExtemporaneas = screen.getByRole('button', { name: /Extemporáneas/i });
    fireEvent.click(tabExtemporaneas);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-EXT1')).toBeDefined();
      expect(screen.queryByText('COM-2026-NORM2')).toBeNull();
    });
  });

  it('muestra botón "Ver Devolución" y no "Auditoría" cuando la solicitud está en estado DEVUELTA', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-dev-1',
        consecutivoUnico: 'COM-2026-DEV99',
        estadoSolicitud: 'DEVUELTA',
        motivoDevolucion: 'Documentos ilegibles',
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-DEV99')).toBeDefined();
      expect(screen.getByText('Ver Devolución')).toBeDefined();
      expect(screen.queryByText('Auditoría')).toBeNull();
    });
  });

  it('abre el modal al hacer clic en Iniciar Auditoría', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([solMock()]);
    (viaticosService.obtenerSolicitudCompleta as any).mockResolvedValue({
      id: 'sol-001',
      consecutivoUnico: 'COM-2026-0001',
      comisionado: { primerNombre: 'Juan', primerApellido: 'Pérez', numeroDocumento: '123456789' },
      destinoCiudad: 'Bogotá',
      destinoDepartamento: 'Cundinamarca',
      fechaInicio: '2026-09-10',
      fechaFin: '2026-09-15',
      objetoComision: 'Reunión técnica',
      prioridad: 'ALTA',
      rubroPresupuestal: 'RUBRO-001',
      montoViaticos: 1000000,
      montoGastosViaje: 500000,
      diasComision: 5,
      estadoSolicitud: 'SOLICITADO',
    });

    render(<AnalystInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-0001')).toBeDefined());

    fireEvent.click(screen.getByText('Auditoría'));

    await waitFor(() => {
      expect(screen.getByText('Auditoría de Soportes y Exportación SIIF')).toBeDefined();
    });
  });

  it('muestra comisiones en estado AUTORIZADA con acción "A Presupuesto" (Etapa 7)', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-aut-1',
        consecutivoUnico: 'COM-2026-AUT1',
        estadoSolicitud: 'AUTORIZADA',
      }),
      solMock({
        id: 'sol-valid-1',
        consecutivoUnico: 'COM-2026-SOL1',
        estadoSolicitud: 'SOLICITADO',
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-SOL1')).toBeDefined();
      expect(screen.getByText('COM-2026-AUT1')).toBeDefined();
      expect(screen.getByText('A Presupuesto')).toBeDefined();
    });
  });

  it('separa solicitudes Verificadas de Pendientes y muestra botón "Verificada · Consultar"', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-pend-1',
        consecutivoUnico: 'COM-2026-PEND1',
        estadoSolicitud: 'SOLICITADO',
      }),
      solMock({
        id: 'sol-verif-1',
        consecutivoUnico: 'COM-2026-VERIF1',
        estadoSolicitud: 'VERIFICADA',
        motivoDevolucion: 'Observación antigua ya corregida',
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-PEND1')).toBeDefined();
      expect(screen.getByText('COM-2026-VERIF1')).toBeDefined();
    });

    // Validar que en la pestaña "Pendientes de Verificación", solo aparece COM-2026-PEND1
    const tabPendientes = screen.getByRole('button', { name: /Pendientes de Verificación/i });
    fireEvent.click(tabPendientes);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-PEND1')).toBeDefined();
      expect(screen.queryByText('COM-2026-VERIF1')).toBeNull();
    });

    // Validar que en la pestaña "Verificadas", solo aparece COM-2026-VERIF1
    const tabVerificadas = screen.getByRole('button', { name: /Verificadas/i });
    fireEvent.click(tabVerificadas);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-VERIF1')).toBeDefined();
      expect(screen.queryByText('COM-2026-PEND1')).toBeNull();
      // Debe mostrar el botón verde "Verificada · Consultar"
      expect(screen.getByText('Verificada · Consultar')).toBeDefined();
      // No debe mostrar la observación de devolución previa porque ya está verificada
      expect(screen.queryByText(/Observación antigua ya corregida/i)).toBeNull();
    });
  });

  it('RF-PAG-001: muestra la pestaña Comprometidas y permite abrir el modal Crear Obligación SIIF', async () => {
    (viaticosService.obtenerSolicitudesAsignadasAnalista as any).mockResolvedValue([
      solMock({
        id: 'sol-comp-01',
        consecutivoUnico: 'COM-2026-0099',
        estadoSolicitud: 'COMPROMETIDA',
        codigoRp: '2026-10-25_RP_48920',
        modalidadPago: 'AVANCE',
        valorComprometido: 850000,
      }),
    ]);

    render(<AnalystInbox />);

    await waitFor(() => {
      expect(screen.getByText(/Comprometidas \(Obligación SIIF\)/i)).toBeDefined();
    });

    const tabComprometidas = screen.getByRole('button', { name: /Comprometidas \(Obligación SIIF\)/i });
    fireEvent.click(tabComprometidas);

    expect(screen.getByText('COM-2026-0099')).toBeDefined();
    expect(screen.getByText(/Crear Obligación SIIF/i)).toBeDefined();

    const botonCrearObligacion = screen.getByRole('button', { name: /Crear Obligación SIIF/i });
    fireEvent.click(botonCrearObligacion);

    await waitFor(() => {
      expect(screen.getByText(/Crear Obligación en SIIF Nación/i)).toBeDefined();
    });
  });
});