import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ControlViaticosInbox from './ControlViaticosInbox';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    obtenerBandejaControlViaticos: vi.fn(),
    obtenerDependencias: vi.fn(),
    obtenerSolicitudControlViaticos: vi.fn(),
  },
}));

vi.mock('./ControlViaticosModal', () => ({
  default: ({ abierta }: { abierta: boolean }) =>
    abierta ? <div data-testid="mock-modal">Modal Abierto</div> : null,
}));

import viaticosService from '../services/api/viaticosService';

const solMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  comisionadoId: 'com-001',
  comisionado: {
    id: 'com-001',
    numeroDocumento: '1234567890',
    primerNombre: 'Juan',
    segundoNombre: 'Pablo',
    primerApellido: 'Pérez',
    segundoApellido: 'Gómez',
    tipoComisionado: 'FUNCIONARIO',
    email: 'juan.perez@esap.edu.co',
    telefonoContacto: '3001234567',
    autorizacionHabeasData: true,
    idDependencia: 42 as any,
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-10-03T00:00:00Z',
  fechaFin: '2026-10-07T00:00:00Z',
  objetoComision: 'Comisión de gestión',
  prioridad: 'ALTA',
  rubroPresupuestal: 'Rubro 01',
  requiereTiquetes: false,
  montoViaticos: 560000,
  montoGastosViaje: 120000,
  diasComision: 5,
  estadoSolicitud: 'SOLICITADA_SIIF',
  radicadoFueraJornada: false,
  extemporanea: false,
  creadoEn: '2026-09-03T10:00:00Z',
  actualizadoEn: '2026-09-03T10:00:00Z',
  creadoPorUsuarioId: 'user-creador',
  analistaAsignadoId: 'analista-001',
  analistaVerificadorId: 'analista-001',
  analistaVerificadorNombre: 'María López',
  usuarioExportadorId: 'exp-001',
  fechaVerificacionPrimerNivel: '2026-09-08T10:00:00.000Z',
  ...overrides,
});

describe('ControlViaticosInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerDependencias as any).mockResolvedValue([]);
  });

  it('debe mostrar el estado de carga inicialmente', () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    expect(screen.getByText('Cargando solicitudes...')).toBeDefined();
  });

  it('debe renderizar las solicitudes después de fetch', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock()],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText(/Juan.*Pérez/)).toBeDefined();
    });
  });

  it('debe mostrar el nombre del analista verificador de 1er nivel', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock()],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeDefined();
    });
  });

  it('debe mostrar "Sin asignar" cuando no hay analistaVerificadorNombre', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock({ analistaVerificadorNombre: null })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('Sin asignar')).toBeDefined();
    });
  });

  it('debe mostrar mensaje cuando no hay solicitudes', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay solicitudes en estado SOLICITADA_SIIF pendientes de control cruzado.'),
      ).toBeDefined();
    });
  });

  it('debe mostrar error cuando falla la carga', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockRejectedValue(new Error('Network error'));

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar las solicitudes de Control Viáticos.')).toBeDefined();
    });
  });

  it('debe filtrar por búsqueda', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [
        solMock({ id: 'sol-001', consecutivoUnico: 'COM-2026-0001' }),
        solMock({ id: 'sol-002', consecutivoUnico: 'COM-2026-0002' }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => expect(screen.getByText('COM-2026-0001')).toBeDefined());

    const input = screen.getByPlaceholderText(
      'Buscar por consecutivo, comisionado, documento, ciudad, analista 1er nivel o estado...',
    );
    fireEvent.change(input, { target: { value: 'COM-2026-0002' } });

    await waitFor(() => {
      expect(screen.queryAllByText('COM-2026-0002')).toHaveLength(1);
      expect(screen.queryAllByText('COM-2026-0001')).toHaveLength(0);
    });
  });

  it('debe abrir el modal al hacer clic en "Control Cruzado"', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock()],
      total: 1,
      page: 1,
      limit: 20,
    });
    (viaticosService.obtenerSolicitudControlViaticos as any).mockResolvedValue(solMock());

    render(<ControlViaticosInbox />);

    await waitFor(() => expect(screen.getByText('Control Cruzado')).toBeDefined());

    fireEvent.click(screen.getByText('Control Cruzado'));

    await waitFor(() => {
      expect(viaticosService.obtenerSolicitudControlViaticos).toHaveBeenCalledWith('sol-001');
    });
  });

  it('debe renderizar paginación cuando hay más de una página', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock()],
      total: 45,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 3')).toBeDefined();
    });
  });

  it('debe mostrar botón "Verificado" cuando la solicitud está en estado VERIFICADA', async () => {
    (viaticosService.obtenerBandejaControlViaticos as any).mockResolvedValue({
      data: [solMock({ estadoSolicitud: 'VERIFICADA' })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<ControlViaticosInbox />);

    await waitFor(() => {
      expect(screen.getByText('Verificado')).toBeDefined();
      expect(screen.queryByText('Control Cruzado')).toBeNull();
    });
  });
});

