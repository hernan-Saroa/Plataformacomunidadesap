import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ControlViaticosModal from './ControlViaticosModal';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    verificarSegundoNivel: vi.fn(),
    devolverAAnalista: vi.fn(),
    obtenerDependencias: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
    obtenerSolicitudControlViaticos: vi.fn(),
  },
}));

vi.mock('./TicketBudgetWidget', () => ({
  default: () => <div data-testid="ticket-budget-widget" />,
}));

vi.mock('../utils/viaticosUtils', () => ({
  esPdfMime: (mime: string) => mime === 'application/pdf',
  formatearMoneda: (v: number) => `$${v}`,
  formatearNombreComisionado: (c: any) =>
    [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido]
      .filter(Boolean)
      .join(' '),
}));

import viaticosService from '../services/api/viaticosService';

const solicitudMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'SOLICITADA_SIIF',
  comisionado: {
    id: 'comp-001',
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
    origenDatos: 'ESAP',
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-10-03T00:00:00Z',
  fechaFin: '2026-10-07T00:00:00Z',
  diasComision: 5,
  objetoComision: 'Comisión de gestión institucional',
  prioridad: 'ALTA',
  rubroPresupuestal: 'Rubro 01',
  requiereTiquetes: false,
  montoViaticos: 560000,
  montoGastosViaje: 120000,
  salarioBasico: 5000000,
  costoEstimadoTiquete: 0,
  analistaAsignadoId: 'analista-001',
  analistaVerificadorNombre: 'María López',
  fechaVerificacionPrimerNivel: '2026-09-08T10:00:00.000Z',
  usuarioExportadorId: 'exp-001',
  documentosSoporte: [
    {
      id: 'doc-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp.pdf',
      nombreArchivoSeguro: 'cdp_seguro.pdf',
      urlRepositorio: '/uploads/sol-001/cdp_seguro.pdf',
      tipoMime: 'application/pdf',
    },
  ],
  resumenPresupuestal: {
    totalGastado: 1000000,
    cantidadSolicitudes: 2,
    limitePresupuesto: 10000000,
    porcentajeUso: 10,
    semaforo: 'VERDE',
  },
  ...overrides,
});

const renderModal = (props: any = {}) =>
  render(
    <ControlViaticosModal
      abierta={false}
      solicitud={null}
      cargando={false}
      onCerrar={() => {}}
      onRefrescar={() => {}}
      {...props}
    />,
  );

describe('ControlViaticosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta=false', () => {
    const { container } = renderModal({ abierta: false });
    expect(container.firstChild).toBeNull();
  });

  it('muestra el detalle del expediente cuando solicitud está cargada', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('COM-2026-0001')).toBeDefined();
    expect(screen.getAllByText('Juan Pablo Pérez Gómez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1234567890').length).toBeGreaterThan(0);
    expect(screen.getByText('Bogotá, Cundinamarca')).toBeDefined();
  });

  it('muestra "Cargando expediente..." cuando cargando=true', () => {
    renderModal({
      abierta: true,
      solicitud: null,
      cargando: true,
    });

    expect(screen.getByText('Cargando expediente...')).toBeDefined();
  });

  it('muestra el semáforo presupuestal VERDE', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('Presupuesto OK')).toBeDefined();
  });

  it('muestra el semáforo presupuestal ROJO', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        resumenPresupuestal: {
          totalGastado: 9000000,
          cantidadSolicitudes: 10,
          limitePresupuesto: 10000000,
          porcentajeUso: 90,
          semaforo: 'ROJO',
        },
      }),
      cargando: false,
    });

    expect(screen.getByText('Presupuesto crítico')).toBeDefined();
  });

  it('muestra el nombre del analista verificador de 1er nivel', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('María López')).toBeDefined();
  });

  it('muestra los documentos de soporte en PDF', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByText('cdp.pdf')).toBeDefined();
  });

  it('muestra "No hay documentos PDF cargados" cuando no hay documentos', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({ documentosSoporte: [] }),
      cargando: false,
    });

    expect(screen.getByText('No hay documentos PDF cargados.')).toBeDefined();
  });

  it('muestra el botón "Aprobar y Verificar (2do Nivel)"', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    expect(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' })).toBeDefined();
  });

  it('debe llamar a verificarSegundoNivel con observaciones vacías al aprobar', async () => {
    (viaticosService.verificarSegundoNivel as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'VERIFICADA' },
    });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
      onRefrescar: vi.fn(),
      onCerrar: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(viaticosService.verificarSegundoNivel).toHaveBeenCalledWith('sol-001', {
        observaciones: '',
      });
    });
  });

  it('muestra "Verificación de 2do nivel registrada" después de aprobar exitosamente', async () => {
    (viaticosService.verificarSegundoNivel as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'VERIFICADA' },
    });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByText('Verificación de 2do nivel registrada')).toBeDefined();
    });
  });

  it('muestra error de verificación cuando verificarSegundoNivel falla', async () => {
    (viaticosService.verificarSegundoNivel as any).mockRejectedValue(
      new Error('Violación de Segregación de Funciones'),
    );

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' }));

    await waitFor(() => {
      expect(screen.getByText('Violación de Segregación de Funciones')).toBeDefined();
    });
  });

  it('muestra el formulario de devolución al hacer clic en "Devolver a Analista"', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    expect(
      screen.getByText('Ingrese el motivo obligatorio de la devolución.', { exact: false }),
    ).toBeDefined();
    expect(screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...')).toBeDefined();
  });

  it('el botón "Confirmar Devolución" está deshabilitado cuando el textarea está vacío', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();
  });

  it('el botón "Confirmar Devolución" está deshabilitado con menos de 3 caracteres', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'ab' } });

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();
  });

  it('el botón "Confirmar Devolución" está habilitado con 3+ caracteres', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento de soporte' } });

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeEnabled();
  });

  it('debe llamar a devolverAAnalista con observaciones al confirmar', async () => {
    (viaticosService.devolverAAnalista as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'EN_VERIFICACION' },
    });

    const onRefrescar = vi.fn();
    const onCerrar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
      onRefrescar,
      onCerrar,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento de soporte' } });

    fireEvent.click(screen.getByText('Confirmar Devolución'));

    await waitFor(() => {
      expect(viaticosService.devolverAAnalista).toHaveBeenCalledWith(
        'sol-001',
        'Falta documento de soporte',
      );
    });
  });

  it('cancelar devolución cierra el formulario sin llamar al servicio', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    fireEvent.click(screen.getByText('Cancelar'));

    expect(viaticosService.devolverAAnalista).not.toHaveBeenCalled();
  });

  it('muestra error de devolución cuando devolverAAnalista falla', async () => {
    (viaticosService.devolverAAnalista as any).mockRejectedValue(
      new Error('No autorizado para devolver'),
    );

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      cargando: false,
    });

    fireEvent.click(screen.getByText('Devolver a Analista'));

    const textarea = screen.getByPlaceholderText('Describa detalladamente el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento' } });

    fireEvent.click(screen.getByText('Confirmar Devolución'));

    await waitFor(() => {
      expect(screen.getByText('No autorizado para devolver')).toBeDefined();
    });
  });

  it('no muestra los botones de aprobar ni de devolver cuando la solicitud está en estado VERIFICADA', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({ estadoSolicitud: 'VERIFICADA' }),
      cargando: false,
    });

    expect(screen.queryByRole('button', { name: 'Aprobar y Verificar (2do Nivel)' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver a Analista' })).toBeNull();
  });

  it('muestra el banner de expediente verificado cuando la solicitud está en estado VERIFICADA', () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        estadoSolicitud: 'VERIFICADA',
        fechaSegundaRevision: '2026-09-11T12:00:00Z',
      }),
      cargando: false,
    });

    expect(screen.getByText('Expediente Verificado en Segundo Nivel')).toBeDefined();
    expect(screen.getAllByText('VERIFICADA').length).toBeGreaterThan(0);
  });
});

