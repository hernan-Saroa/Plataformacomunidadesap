import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import VerificacionSIIFModal from './VerificacionSIIFModal';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    verificarAuditoria: vi.fn(),
    exportarSIIF: vi.fn(),
    devolverAnalista: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
}));

import viaticosService from '../services/api/viaticosService';

const solicitudMock = (overrides: any = {}) => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  comisionado: {
    id: 'comp-1',
    numeroDocumento: '123456789',
    primerNombre: 'Juan',
    primerApellido: 'Pérez',
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-09-10',
  fechaFin: '2026-09-15',
  diasComision: 5,
  objetoComision: 'Reunión técnica',
  prioridad: 'ALTA',
  rubroPresupuestal: 'RUBRO-001',
  montoViaticos: 1000000,
  montoGastosViaje: 500000,
  estadoSolicitud: 'SOLICITADO',
  ...overrides,
});

const renderModal = (props: any = {}) =>
    render(
      <VerificacionSIIFModal
        abierta={false}
        solicitud={null}
        cargando={false}
        onClosing={() => {}}
        onRefrescar={() => {}}
        {...props}
      />,
    );

describe('VerificacionSIIFModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta=false', () => {
    const { container } = renderModal({ abierta: false });
    expect(container.firstChild).toBeNull();
  });

  it('muestra los detalles del expediente', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
    });

    expect(screen.getByText('COM-2026-0001')).toBeDefined();
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('123456789').length).toBeGreaterThan(0);
    expect(screen.getByText('Bogotá, Cundinamarca')).toBeDefined();
  });

  it('los checkboxes controlan el estado del botón Registrar Verificación', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
    });

    const registrarBtn = screen.getByText('Registrar Verificación');
    expect(registrarBtn).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    for (const cb of checkboxes.slice(0, 3)) {
      fireEvent.click(cb);
    }
    await waitFor(() => expect(registrarBtn).toBeEnabled());
  });

  it('llama a verificarAuditoria al registrar', async () => {
    (viaticosService.verificarAuditoria as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'VERIFICADO' },
    });

    const onRefrescar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      onRefrescar,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    for (const cb of checkboxes.slice(0, 3)) {
      fireEvent.click(cb);
    }

    fireEvent.click(screen.getByText('Registrar Verificación'));

    await waitFor(() => {
      expect(viaticosService.verificarAuditoria).toHaveBeenCalledWith(
        'sol-001',
        expect.any(Object),
      );
    });
  });

  it('el botón copiar llama a navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
    });

    const copyButtons = screen.getAllByTitle('Copiar al portapapeles');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('123456789');
    });
  });

  it('el botón descargar llama a exportarSIIF', async () => {
    const blob = new Blob(['csv'], { type: 'text/csv' });
    (viaticosService.exportarSIIF as any).mockResolvedValue(blob);

    const onClosing = vi.fn();
    const onRefrescar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      onClosing,
      onRefrescar,
    });

    fireEvent.click(screen.getByText('Descargar Archivo Plano CSV para SIIF'));

    await waitFor(() => {
      expect(viaticosService.exportarSIIF).toHaveBeenCalledWith('sol-001');
    });
  });

  it('el textarea de devolución es obligatorio', async () => {
    const onRefrescar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      onRefrescar,
    });

    const buttons = screen.getAllByText('Devolver a Enlace');
    const btn = buttons.find((el) => el.tagName === 'BUTTON') as HTMLButtonElement;
    fireEvent.click(btn);

    const textarea = screen.getByPlaceholderText('Describa el motivo de la devolución...');

    const confirmBtn = screen.getByText('Confirmar Devolución') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Algun motivo' } });
    expect(confirmBtn).toBeEnabled();

    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(confirmBtn).toBeDisabled();

    expect(viaticosService.devolverAnalista).not.toHaveBeenCalled();
  });

  it('llama a devolverAnalista al confirmar devolución', async () => {
    (viaticosService.devolverAnalista as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'DEVUELTA', motivoDevolucion: 'Falta documento' },
    });

    const onClosing = vi.fn();
    const onRefrescar = vi.fn();
    renderModal({
      abierta: true,
      solicitud: solicitudMock(),
      onClosing,
      onRefrescar,
    });

    const buttons = screen.getAllByText('Devolver a Enlace');
    const btn = buttons.find((el) => el.tagName === 'BUTTON') as HTMLButtonElement;
    fireEvent.click(btn);

    const textarea = screen.getByPlaceholderText('Describa el motivo de la devolución...');
    fireEvent.change(textarea, { target: { value: 'Falta documento' } });

    fireEvent.click(screen.getByText('Confirmar Devolución'));

    await waitFor(() => {
      expect(viaticosService.devolverAnalista).toHaveBeenCalledWith('sol-001', 'Falta documento');
    });
  });

  it('bloquea el registro de verificación y devolución cuando está en SOLICITADA_SIIF', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({ estadoSolicitud: 'SOLICITADA_SIIF' }),
    });

    // Título en modo consulta
    expect(screen.getByText('Expediente y Consulta SIIF')).toBeDefined();

    // Banner de advertencia informativo
    expect(screen.getByText(/En Segunda Revisión · Control Viáticos/i)).toBeDefined();

    // El botón 'Registrar Verificación' NO debe existir
    expect(screen.queryByText('Registrar Verificación')).toBeNull();

    // Mensaje de verificación completada
    expect(screen.getByText(/Verificación de analista completada/i)).toBeDefined();

    // El botón 'Devolver a Enlace' NO debe existir
    expect(screen.queryByText('Devolver a Enlace')).toBeNull();

    // Los checkboxes están deshabilitados
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    checkboxes.forEach((cb) => {
      expect(cb.disabled).toBe(true);
    });
  });

  it('muestra badge de contratista facturador electrónico en el encabezado del comisionado', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        comisionado: {
          primerNombre: 'Laura',
          primerApellido: 'García',
          numeroDocumento: '987654321',
          tipoComisionado: 'CONTRATISTA',
          esFacturadorElectronico: true,
        },
      }),
    });

    expect(screen.getByText('Contratista')).toBeDefined();
    expect(screen.getByText('Facturador Electrónico')).toBeDefined();
  });

  it('bloquea la descarga de CSV SIIF cuando contratista es facturador electrónico sin factura adjunta', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        comisionado: {
          primerNombre: 'Laura',
          primerApellido: 'García',
          numeroDocumento: '987654321',
          tipoComisionado: 'CONTRATISTA',
          esFacturadorElectronico: true,
        },
        documentosSoporte: [],
      }),
    });

    // Banner de bloqueo visible
    expect(screen.getByText(/Exportación SIIF Bloqueada: Falta Factura Electrónica/i)).toBeDefined();
    expect(screen.getByText(/Cargar Factura Electrónica/i)).toBeDefined();
    expect(screen.getByText(/Devolver a Enlace para solicitar factura/i)).toBeDefined();

    // Botón CSV deshabilitado
    const downloadBtn = screen.getByText('Descargar Archivo Plano CSV para SIIF').closest('button');
    expect(downloadBtn).toBeDisabled();
  });

  it('permite la descarga de CSV SIIF cuando contratista facturador ya tiene factura cargada', async () => {
    const blob = new Blob(['csv'], { type: 'text/csv' });
    (viaticosService.exportarSIIF as any).mockResolvedValue(blob);

    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        comisionado: {
          primerNombre: 'Laura',
          primerApellido: 'García',
          numeroDocumento: '987654321',
          tipoComisionado: 'CONTRATISTA',
          esFacturadorElectronico: true,
        },
        documentosSoporte: [
          {
            id: 'doc-fac-1',
            tipoDocumento: 'FACTURA',
            nombreArchivoOriginal: 'factura_electronica_fe01.pdf',
            urlRepositorio: 'https://storage/factura.pdf',
          },
        ],
      }),
    });

    // No debe mostrar banner de bloqueo
    expect(screen.queryByText(/Exportación SIIF Bloqueada: Falta Factura Electrónica/i)).toBeNull();

    const downloadBtn = screen.getByText('Descargar Archivo Plano CSV para SIIF').closest('button');
    expect(downloadBtn).toBeEnabled();

    fireEvent.click(downloadBtn!);
    await waitFor(() => {
      expect(viaticosService.exportarSIIF).toHaveBeenCalledWith('sol-001');
    });
  });

  it('muestra banner de devolución con trazabilidad del responsable', async () => {
    renderModal({
      abierta: true,
      solicitud: solicitudMock({
        estadoSolicitud: 'EN_VERIFICACION',
        revisorControlNombre: 'Andrés López',
        observacionesSegundaRevision: 'Inconsistencia en días de pernoctación.',
      }),
    });

    expect(screen.getByText(/Devuelta por Control Viáticos/i)).toBeDefined();
    expect(screen.getByText(/Responsable: Andrés López/i)).toBeDefined();
    expect(screen.getByText(/Inconsistencia en días de pernoctación/i)).toBeDefined();
  });
});