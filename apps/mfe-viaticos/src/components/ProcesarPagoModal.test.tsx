import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProcesarPagoModal from './ProcesarPagoModal';

const mockSolicitudObligada = {
  id: 'sol-obli-100',
  consecutivoUnico: 'COM-2026-0089',
  estado: 'OBLIGADA',
  estadoSolicitud: 'OBLIGADA',
  objetoComision: 'Auditoría en sede regional',
  destinoCiudad: 'Cali',
  fechaInicio: '2026-11-20',
  fechaFin: '2026-11-24',
  diasComision: 4,
  montoViaticos: 850000,
  montoGastosViaje: 0,
  valorComprometido: 850000,
  codigoRp: '2026-10-25_RP_48920',
  numeroRp: '48920',
  numeroObligacion: 'OBL-2026-00481',
  fechaObligacion: '2026-10-25',
  valorObligacion: 850000,
  modalidadPago: 'AVANCE',
  diasHabilesPrevios: 7,
  comisionado: {
    id: 'com-100',
    numeroDocumento: '1098765432',
    primerNombre: 'Carlos',
    primerApellido: 'Gómez',
    tipoComisionado: 'FUNCIONARIO',
  },
} as any;

const mockSolicitudPosterior = {
  ...mockSolicitudObligada,
  id: 'sol-obli-101',
  consecutivoUnico: 'COM-2026-0090',
  numeroObligacion: 'OBL-2026-00482',
  modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
  valorObligacion: 450000,
};

// Mock de FirmaDigitalViaticosModal para tests sin interacción de OTP
vi.mock('./FirmaDigitalViaticosModal', () => ({
  default: ({ isOpen, onFirmaCompleta, onCancelar }: any) =>
    isOpen ? (
      <div data-testid="firma-digital-modal">
        <button
          onClick={() =>
            onFirmaCompleta({
              hash: 'SHA256:abc123',
              timestamp: new Date().toISOString(),
              firmante: 'Test Tesoreria',
              cargo: 'Pagador',
              pin_verificado: true,
              certificado_id: 'ESAP-CERT-VIAT-TEST01',
              solicitudId: 'sol-obli-100',
              codigoOtp: '123456',
            })
          }
        >
          Confirmar Firma OTP
        </button>
        <button onClick={onCancelar}>Cancelar OTP</button>
      </div>
    ) : null,
}));

vi.mock('../services/api/authService', () => ({
  default: {
    getCurrentUserSync: vi.fn(() => ({
      userId: 'user-tes-01',
      username: 'tesoreria.test',
      fullName: 'Tesorero Prueba',
      roles: ['TESORERIA'],
      permissions: ['travel_expenses:process_payment', 'travel_expenses:sign_approval'],
      esAdmin: false,
      person: { full_name: 'Tesorero Prueba' },
    })),
    isTesoreria: vi.fn(() => true),
    canProcesarPago: vi.fn(() => true),
    canFirmarTesoreria: vi.fn(() => true),
  },
  authService: {
    getCurrentUserSync: vi.fn(() => ({
      userId: 'user-tes-01',
      username: 'tesoreria.test',
      fullName: 'Tesorero Prueba',
      roles: ['TESORERIA'],
      permissions: ['travel_expenses:process_payment', 'travel_expenses:sign_approval'],
      esAdmin: false,
      person: { full_name: 'Tesorero Prueba' },
    })),
    isTesoreria: vi.fn(() => true),
    canProcesarPago: vi.fn(() => true),
    canFirmarTesoreria: vi.fn(() => true),
  },
}));

vi.mock('../services/api/viaticosService', () => {
  const service = {
    procesarPago: vi.fn(),
    subirSoportePago: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    obtenerUrlArchivo: vi.fn((url) => (url ? `http://localhost:3010${url}` : '')),
  };
  return {
    default: service,
    viaticosService: service,
  };
});

import { viaticosService } from '../services/api/viaticosService';

describe('ProcesarPagoModal — [RF-PAG-003] Etapa 8: Procesar Desembolso y Pago de Comisión', () => {
  const mockOnCerrar = vi.fn();
  const mockOnExito = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierta es false', () => {
    const { container } = render(
      <ProcesarPagoModal
        abierta={false}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza la información de la comisión: Consecutivo, RP, Obligación y Modalidad AVANCE', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Procesar Desembolso y Pago de Comisión/i)).toBeDefined();
    expect(screen.getByText('COM-2026-0089')).toBeDefined();
    expect(screen.getByText('2026-10-25_RP_48920')).toBeDefined();
    expect(screen.getByText('OBL-2026-00481')).toBeDefined();
    expect(screen.getByText(/AVANCE \(Desembolso Previo\)/i)).toBeDefined();
    expect(screen.getByText(/Estado resultante: PAGADA/i)).toBeDefined();
  });

  it('muestra el banner de Firma Digital OTP para Tesorería', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Firma Digital con Validación OTP — Tesorería/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i })).toBeDefined();
  });

  it('deshabilita el botón confirmar si no hay fecha de pago válida', async () => {
    // Sin solicitarOtpFirma para usar fallback directo
    (viaticosService as any).solicitarOtpFirma = undefined;

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={{ ...mockSolicitudObligada, fechaPago: undefined }}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Vaciar la fecha
    const inputFecha = screen.getByLabelText(/Fecha de Desembolso \/ Pago/i);
    fireEvent.change(inputFecha, { target: { value: '' } });

    // El botón debe estar deshabilitado porque puedeEnviar = false (fechaPago = '')
    const botonEnviar = screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i });
    expect(botonEnviar).toHaveProperty('disabled', true);
    expect(viaticosService.procesarPago).not.toHaveBeenCalled();
  });

  it('inicia flujo OTP al hacer clic en confirmar cuando solicitarOtpFirma está disponible', async () => {
    (viaticosService.solicitarOtpFirma as any) = vi.fn().mockResolvedValue({
      verificationId: 'vtid-test-001',
      emailEnviadoA: 'tesoreria@esap.edu.co',
      devCode: '654321',
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const botonEnviar = screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i });
    fireEvent.click(botonEnviar);

    await waitFor(() => {
      expect(viaticosService.solicitarOtpFirma).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({
          tipoFirma: 'TESORERIA',
          etapaLabel: expect.stringContaining('RF-PAG-003'),
        }),
      );
      expect(screen.getByTestId('firma-digital-modal')).toBeDefined();
    });
  });

  it('ejecuta el pago con datos de firma OTP tras confirmación del modal', async () => {
    (viaticosService.solicitarOtpFirma as any) = vi.fn().mockResolvedValue({
      verificationId: 'vtid-test-001',
      emailEnviadoA: 'tesoreria@esap.edu.co',
      devCode: '654321',
    });
    (viaticosService.procesarPago as any).mockResolvedValue({
      data: {
        ...mockSolicitudObligada,
        estadoSolicitud: 'PAGADA',
        fechaPago: '2026-10-26',
        valorPagado: 850000,
      },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i }));

    await waitFor(() => screen.getByTestId('firma-digital-modal'));

    // Simular confirmación de firma OTP
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Firma OTP/i }));

    await waitFor(() => {
      expect(viaticosService.procesarPago).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({
          valorPagado: 850000,
          modalidadPago: 'AVANCE',
          otp: '123456',
          certificadoId: 'ESAP-CERT-VIAT-TEST01',
          hashSha256: 'SHA256:abc123',
          verificationId: 'vtid-test-001',
          nombreFirmante: expect.any(String),
          cargoFirmante: expect.any(String),
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
  });

  it('usa fallback directo sin OTP si solicitarOtpFirma no está disponible', async () => {
    (viaticosService as any).solicitarOtpFirma = undefined;
    (viaticosService.procesarPago as any).mockResolvedValue({
      data: { ...mockSolicitudObligada, estadoSolicitud: 'PAGADA' },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i }));

    await waitFor(() => {
      expect(viaticosService.procesarPago).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({ valorPagado: 850000, modalidadPago: 'AVANCE' }),
      );
      expect(mockOnExito).toHaveBeenCalled();
    });
  });

  it('calcula y muestra el total de viáticos real sin mostrar 0 cuando la solicitud tiene montos', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={{
          ...mockSolicitudObligada,
          montoViaticos: 671040,
          montoGastosViaje: 101378,
          requiereTiquetes: true,
        }}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Debe mostrar $772.418 (671040 + 101378) y no $0
    expect(screen.getByText('Total Viáticos Calculados')).toBeDefined();
    expect(screen.getAllByText(/\$772[.,]418/).length).toBeGreaterThan(0);
  });

  it('permite añadir el costo de tiquetes, sumarlo al total de viáticos y enviarlo a la BD en procesarPago', async () => {
    (viaticosService as any).solicitarOtpFirma = undefined;
    (viaticosService.procesarPago as any).mockResolvedValue({
      data: { ...mockSolicitudObligada, estadoSolicitud: 'PAGADA' },
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={{
          ...mockSolicitudObligada,
          montoViaticos: 671040,
          montoGastosViaje: 101378,
          costoEstimadoTiquete: 0,
          requiereTiquetes: true,
        }}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Ingresar costo de tiquetes: $ 450.000
    const inputTiquetes = screen.getByLabelText(/Costo de Tiquetes Aéreos \(COP\)/i);
    fireEvent.change(inputTiquetes, { target: { value: '450000' } });

    // El ajuste real debe ser 772.418 + 450.000 = 1.222.418
    expect(screen.getAllByText(/\$1[.,]222[.,]418/).length).toBeGreaterThan(0);

    // Hacer clic en "Aplicar ajuste real a Valor Pagado"
    const botonAplicar = screen.getByRole('button', { name: /Aplicar ajuste real a Valor Pagado/i });
    fireEvent.click(botonAplicar);

    // Confirmar pago
    fireEvent.click(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i }));

    await waitFor(() => {
      expect(viaticosService.procesarPago).toHaveBeenCalledWith(
        'sol-obli-100',
        expect.objectContaining({
          valorPagado: 1222418,
          costoEstimadoTiquete: 450000,
          modalidadPago: 'AVANCE',
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
    });
  });

  it('muestra error si solicitarOtpFirma falla', async () => {
    (viaticosService.solicitarOtpFirma as any) = vi.fn().mockRejectedValue({
      message: 'Error en el servicio OTP de Tesorería',
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i }));

    expect(
      await screen.findByText(/Error en el servicio OTP de Tesorería/i),
    ).toBeDefined();
    expect(viaticosService.procesarPago).not.toHaveBeenCalled();
  });

  it('respeta la modalidad RECONOCIMIENTO_POSTERIOR en solicitud posterior', () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudPosterior}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText('COM-2026-0090')).toBeDefined();
    expect(screen.getByText('OBL-2026-00482')).toBeDefined();
    expect(screen.getByText(/RECONOCIMIENTO POSTERIOR/i)).toBeDefined();
  });

  it('muestra error de formato si se adjunta un archivo no permitido', async () => {
    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputArchivo = screen.getByLabelText(/Cargar soporte de desembolso/i);
    const archivoInvalido = new File(['binario'], 'ejecutable.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(inputArchivo, { target: { files: [archivoInvalido] } });

    expect(
      await screen.findByText(/Solo se admiten documentos PDF o imágenes/i),
    ).toBeDefined();
  });

  it('cierra el modal OTP al cancelar la firma digital', async () => {
    (viaticosService.solicitarOtpFirma as any) = vi.fn().mockResolvedValue({
      verificationId: 'vtid-test-002',
      emailEnviadoA: 'tesoreria@esap.edu.co',
    });

    render(
      <ProcesarPagoModal
        abierta={true}
        solicitud={mockSolicitudObligada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Firmar y Confirmar Desembolso/i }));
    await waitFor(() => screen.getByTestId('firma-digital-modal'));

    fireEvent.click(screen.getByRole('button', { name: /Cancelar OTP/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('firma-digital-modal')).toBeNull();
    });
    expect(viaticosService.procesarPago).not.toHaveBeenCalled();
  });
});
