import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegistrarRPModal from './RegistrarRPModal';

const mockSolicitudAutorizada = {
  id: 'sol-aut-42',
  codigo: 'COM-2026-0042',
  consecutivoUnico: 'COM-2026-0042',
  estado: 'AUTORIZADA',
  estadoSolicitud: 'AUTORIZADA',
  objeto: 'Supervisión en territorio',
  ciudadDestino: 'Cali',
  fechaInicio: '2026-09-16',
  fechaFin: '2026-09-18',
  diasComision: 3,
  montoTotal: 1850000,
  totalComision: 1850000,
  nombreComisionado: 'Carlos Gómez',
  cedulaComisionado: '79123456',
  dependencia: 'Subdirección de Gestión Corporativa',
  rubroRp: 'C-2101-01',
} as any;

vi.mock('../services/api/viaticosService', () => {
  const service = {
    expedirRp: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    exportarFormato023: vi.fn(),
    obtenerSolicitudCompleta: vi.fn().mockResolvedValue({
      id: 'sol-aut-42',
      consecutivoUnico: 'COM-2026-0042',
      camposAdicionales: {
        firmasAprobacion: [],
      },
    }),
    obtenerEstadoFirmas: vi.fn().mockResolvedValue({
      firmantes: [],
      completado: true,
    }),
  };
  return {
    default: service,
    viaticosService: service,
  };
});

vi.mock('./FirmaDigitalViaticosModal', () => ({
  default: ({ isOpen, onFirmaCompleta, onCancelar }: any) =>
    isOpen ? (
      <div data-testid="firma-digital-viaticos-modal">
        <span>Modal Firma OTP Presupuesto</span>
        <button
          type="button"
          onClick={() =>
            onFirmaCompleta({
              codigoOtp: '123456',
              certificado_id: 'ESAP-CERT-VIAT-PRE-99',
              hash: 'SHA256:presupuestohash1234567890abcdef',
              timestamp: new Date().toISOString(),
              firmante: 'Profesional de Presupuesto',
              cargo: 'Profesional de Presupuesto / SIIF',
              pin_verificado: true,
              solicitudId: 'sol-aut-42',
            })
          }
        >
          Confirmar Firma OTP Test
        </button>
        <button type="button" onClick={onCancelar}>
          Cancelar Firma OTP
        </button>
      </div>
    ) : null,
}));

import { viaticosService } from '../services/api/viaticosService';

describe('RegistrarRPModal — [RF-PRE-001] Etapa 7: Expedir RP en SIIF Nación', () => {
  const mockOnCerrar = vi.fn();
  const mockOnExito = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza cuando abierto es false', () => {
    const { container } = render(
      <RegistrarRPModal
        abierto={false}
        solicitud={mockSolicitudAutorizada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('Escenario: Registro individual de RP exitoso con nomenclatura válida y flujo OTP', async () => {
    (viaticosService.expedirRp as any).mockResolvedValue({
      id: 'sol-aut-42',
      estadoSolicitud: 'COMPROMETIDA',
      codigoRp: '20260916_RP_12345',
      data: {
        id: 'sol-aut-42',
        estado: 'COMPROMETIDA',
        codigoRp: '20260916_RP_12345',
      },
    });

    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'viat:sol-aut-42:PRESUPUESTO:usr-1',
      emailEnviadoA: 'presupuesto@esap.edu.co',
      devCode: '123456',
    });

    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={mockSolicitudAutorizada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Verificación de campos y títulos renderizados
    expect(screen.getByText(/Registrar Registro Presupuestal \(RP\)/i)).toBeDefined();
    expect(screen.getAllByText(/COM-2026-0042/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Apartado de Firmas Digitales y Trazabilidad \(Formato 023\)/i)).toBeDefined();
    expect(screen.getByText(/Descargar Formato 023/i)).toBeDefined();

    // Diligenciar Número de RP '12345'
    const inputNumeroRp = screen.getByPlaceholderText(/Ej. 12345/i);
    fireEvent.change(inputNumeroRp, { target: { value: '12345' } });

    // Diligenciar Fecha '2026-09-16'
    const inputFecha = screen.getByDisplayValue(/2026/);
    fireEvent.change(inputFecha, { target: { value: '2026-09-16' } });

    // Adjuntar soporte válido '20260916_RP_12345.pdf'
    const archivoValido = new File(['dummy pdf content'], '20260916_RP_12345.pdf', {
      type: 'application/pdf',
    });
    const inputArchivo = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(inputArchivo).toBeDefined();

    fireEvent.change(inputArchivo, { target: { files: [archivoValido] } });

    // Debe mostrar la validación exitosa de la nomenclatura
    expect(screen.getByText('20260916_RP_12345.pdf')).toBeDefined();
    expect(screen.getByText(/Nomenclatura oficial válida según estándar SIIF Nación/i)).toBeDefined();

    // Confirmar y comprometer -> Inicia flujo OTP
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar y Comprometer/i });
    expect(botonConfirmar).toBeDefined();
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(viaticosService.solicitarOtpFirma).toHaveBeenCalledWith(
        'sol-aut-42',
        expect.objectContaining({
          tipoFirma: 'PRESUPUESTO',
        }),
      );
    });

    // Se despliega modal de firma OTP
    expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    const botonFirmarOtp = screen.getByText('Confirmar Firma OTP Test');
    fireEvent.click(botonFirmarOtp);

    await waitFor(() => {
      expect(viaticosService.expedirRp).toHaveBeenCalledWith(
        'sol-aut-42',
        expect.objectContaining({
          numeroRp: '12345',
          fechaRp: '2026-09-16',
          soporteRpPath: '20260916_RP_12345.pdf',
          valorComprometido: 1850000,
          otp: '123456',
          certificadoId: 'ESAP-CERT-VIAT-PRE-99',
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
  });

  it('Escenario: Descarga del Formato 023 oficial desde el modal', async () => {
    const mockBlob = new Blob(['pdf-data'], { type: 'application/pdf' });
    (viaticosService.exportarFormato023 as any).mockResolvedValue(mockBlob);

    // Mock createObjectURL & revokeObjectURL
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-023.pdf');
    window.URL.revokeObjectURL = vi.fn();

    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={mockSolicitudAutorizada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const botonDescargar = screen.getByText(/Descargar Formato 023/i);
    fireEvent.click(botonDescargar);

    await waitFor(() => {
      expect(viaticosService.exportarFormato023).toHaveBeenCalledWith(
        'sol-aut-42',
        'COM-2026-0042',
      );
    });

    window.URL.createObjectURL = originalCreate;
    window.URL.revokeObjectURL = originalRevoke;
  });

  it('Escenario: Rechazo de registro de RP por nomenclatura inválida de archivo soporte', async () => {
    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={mockSolicitudAutorizada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputNumeroRp = screen.getByPlaceholderText(/Ej. 12345/i);
    fireEvent.change(inputNumeroRp, { target: { value: '12345' } });

    // Adjuntar archivo fuera de la regla 'documento_rp.pdf'
    const archivoInvalido = new File(['dummy pdf'], 'documento_rp.pdf', {
      type: 'application/pdf',
    });
    const inputArchivo = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(inputArchivo, { target: { files: [archivoInvalido] } });

    // Debe mostrar la alerta indicando la regla de nomenclatura
    expect(
      screen.getByText(/La nomenclatura del soporte es inválida\. Debe cumplir el patrón 'YYYYMMDD_RP_Numero\.pdf'/i),
    ).toBeDefined();

    // El botón de confirmación debe permanecer deshabilitado o bloquear el envío
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar y Comprometer/i });
    expect(botonConfirmar.hasAttribute('disabled')).toBe(true);
    expect(viaticosService.expedirRp).not.toHaveBeenCalled();
  });

  it('RF-PRE-003: calcula y muestra en vivo la modalidad de pago proyectada según días hábiles', () => {
    // Solicitud que inicia en 8 días hábiles
    const solicitudConAnticipacion = {
      ...mockSolicitudAutorizada,
      fechaInicio: '2026-10-15',
    };

    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={solicitudConAnticipacion}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputFecha = screen.getByDisplayValue(/2026/);
    fireEvent.change(inputFecha, { target: { value: '2026-10-01' } });

    expect(screen.getByText(/Modalidad proyectada según días hábiles \(RF-PRE-003\)/i)).toBeDefined();
    expect(screen.getByText(/AVANCE \(Pago Anticipado\)/i)).toBeDefined();
  });

  it('Modo solo lectura cuando la comisión ya está COMPROMETIDA', () => {
    const solicitudComprometida = {
      ...mockSolicitudAutorizada,
      estado: 'COMPROMETIDA',
      estadoSolicitud: 'COMPROMETIDA',
      numeroRp: '98765',
      fechaRp: '2026-09-17',
      soporteRpPath: '20260917_RP_98765.pdf',
    };

    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={solicitudComprometida}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Esta comisión ya cuenta con RP expedido en firme en SIIF Nación/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /^Cerrar$/i })).toBeDefined();
    // No debe haber botón "Confirmar y Comprometer"
    expect(screen.queryByRole('button', { name: /Confirmar y Comprometer/i })).toBeNull();
  });
});
