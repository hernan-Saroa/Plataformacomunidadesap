import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionDireccionModal from './AutorizacionDireccionModal';
import { SolicitudAutorizacion } from '../types/viaticos';

const mockSolicitud = {
  id: 'sol-ext-001',
  consecutivoUnico: 'COM-2026-EXT-0001',
  estadoSolicitud: 'AUTORIZACION_DIRECCION',
  extemporanea: true,
  objetoComision: 'Atención urgente en territorio',
  destinoCiudad: 'Leticia',
  destinoDepartamento: 'Amazonas',
  fechaInicio: '2026-10-02',
  fechaFin: '2026-10-05',
  diasComision: 4,
  montoViaticos: 950000,
  montoGastosViaje: 250000,
  totalComision: 1200000,
  montoTotal: 1200000,
  requiereTiquetes: true,
  tipoTransporte: 'AEREO',
  comisionado: {
    id: 'usr-com-01',
    numeroDocumento: '1098765432',
    nombreCompleto: 'Carlos Rodríguez',
    tipoComisionado: 'FUNCIONARIO',
  },
  documentosSoporte: [],
};

vi.mock('./FirmaDigitalViaticosModal', () => ({
  default: ({ isOpen, onFirmaCompleta, onCancelar }: any) =>
    isOpen ? (
      <div data-testid="firma-digital-viaticos-modal">
        <span>Modal Firma OTP Abierta</span>
        <button
          type="button"
          onClick={async () => {
            await onFirmaCompleta({
              codigoOtp: '654321',
              certificado_id: 'ESAP-CERT-VIAT-2026-TEST',
              hash: 'SHA256:mockedhash1234567890abcdef',
              timestamp: new Date().toISOString(),
              firmante: 'Director Nacional ESAP',
              cargo: 'Director(a) Nacional',
              pin_verificado: true,
              solicitudId: 'sol-ext-001',
            });
          }}
        >
          Confirmar Firma OTP Test
        </button>
        <button type="button" onClick={onCancelar}>
          Cancelar Firma OTP
        </button>
      </div>
    ) : null,
}));

vi.mock('../services/api/viaticosService', () => ({
  default: {
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    exportarFormato023: vi.fn(),
  },
  viaticosService: {
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    exportarFormato023: vi.fn(),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    getCurrentUserSync: vi.fn(() => ({
      userId: 'usr-dir-01',
      username: 'direccion.nacional',
      person: { full_name: 'Director Nacional ESAP' },
    })),
    isSuperAdmin: vi.fn(() => false),
  },
}));

import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';

describe('AutorizacionDireccionModal — RF-AUT-002', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (authService.getCurrentUserSync as any).mockReturnValue({
      userId: 'usr-dir-01',
      username: 'direccion.nacional',
      person: { full_name: 'Director Nacional ESAP' },
    });
    (authService.isSuperAdmin as any).mockReturnValue(false);
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'v-dir-123',
      emailEnviadoA: 'direccion@esap.edu.co',
      devCode: '654321',
    });
    (viaticosService.exportarFormato023 as any).mockResolvedValue(
      new Blob(['fake-pdf'], { type: 'application/pdf' }),
    );
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-blob');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake-blob');
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockReturnValue(undefined as any);
    }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }) as any;
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockedcanvasdata');
  });

  it('renderiza la información de la comisión extemporánea y el campo de decisión', () => {
    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getAllByText(/COM-2026-EXT-0001/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Carlos Rodríguez/i)).toBeDefined();
    expect(screen.getByText(/Leticia/i)).toBeDefined();
    expect(screen.getByText(/Amazonas/i)).toBeDefined();
    expect(screen.getByText(/Atención urgente en territorio/i)).toBeDefined();
    expect(screen.getByText(/Actúo formalmente en calidad de Delegado/i)).toBeDefined();
  });

  it('permite autorizar con proceso de firma digital y validación OTP', async () => {
    (viaticosService.autorizarComisionExtemporanea as any).mockResolvedValue({
      id: 'sol-ext-001',
      estadoSolicitud: 'EN_AUTORIZACION',
    });

    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    // Escribir justificación
    const textarea = screen.getByPlaceholderText(/Describa la justificación institucional/i);
    fireEvent.change(textarea, { target: { value: 'Comisión urgente requerida por calamidad' } });

    // Marcar checkbox de delegado
    const checkDelegado = screen.getByRole('checkbox');
    fireEvent.click(checkDelegado);

    // Click autorizar (inicia firma OTP)
    const btnAutorizar = screen.getByRole('button', { name: /Autorizar Comisión Extemporánea/i });
    fireEvent.click(btnAutorizar);

    await waitFor(() => {
      expect(viaticosService.solicitarOtpFirma).toHaveBeenCalledWith('sol-ext-001', {
        tipoFirma: 'DIRECCION_NACIONAL',
        etapaLabel: 'Autorización Dirección Nacional — Comisión Extemporánea (RF-AUT-002)',
      });
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    // Confirmar firma OTP desde el modal
    const btnConfirmarOtp = screen.getByRole('button', { name: /Confirmar Firma OTP Test/i });
    fireEvent.click(btnConfirmarOtp);

    await waitFor(() => {
      expect(viaticosService.autorizarComisionExtemporanea).toHaveBeenCalledWith(
        'sol-ext-001',
        'Comisión urgente requerida por calamidad',
        true,
        expect.objectContaining({
          otp: '654321',
          certificadoId: 'ESAP-CERT-VIAT-2026-TEST',
          verificationId: 'v-dir-123',
        }),
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('permite previsualizar el Formato 023 en el visor flotante', async () => {
    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const btnVer023 = screen.getAllByRole('button', { name: /Ver Formato 023|Previsualizar Formato 023/i })[0];
    fireEvent.click(btnVer023);

    await waitFor(() => {
      expect(viaticosService.exportarFormato023).toHaveBeenCalledWith(
        'sol-ext-001',
        'COM-2026-EXT-0001',
      );
    });
  });

  it('permite exportar / descargar el Formato 023 en PDF', async () => {
    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const btnExportar023 = screen.getAllByRole('button', { name: /Exportar 023|Exportar PDF/i })[0];
    fireEvent.click(btnExportar023);

    await waitFor(() => {
      expect(viaticosService.exportarFormato023).toHaveBeenCalledWith(
        'sol-ext-001',
        'COM-2026-EXT-0001',
      );
    });
  });

  it('permite rechazar la comisión extemporánea previa confirmación', async () => {
    (viaticosService.rechazarComisionExtemporanea as any).mockResolvedValue({
      id: 'sol-ext-001',
      estadoSolicitud: 'RECHAZADO',
    });

    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    // Escribir justificación válida
    const textarea = screen.getByPlaceholderText(/Describa la justificación institucional/i);
    fireEvent.change(textarea, { target: { value: 'No se justifica la extemporaneidad de la solicitud' } });

    // Click en Negar / Rechazar para abrir la confirmación
    const btnNegar = screen.getByRole('button', { name: /Negar \/ Rechazar/i });
    fireEvent.click(btnNegar);

    expect(screen.getByText(/¿Está seguro de negar y rechazar esta comisión\?/i)).toBeDefined();

    // Confirmar rechazo
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar Rechazo/i });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(viaticosService.rechazarComisionExtemporanea).toHaveBeenCalledWith(
        'sol-ext-001',
        'No se justifica la extemporaneidad de la solicitud',
        false,
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('aplica segregación de funciones (SoD) si el usuario es el mismo comisionado', () => {
    (authService.getCurrentUserSync as any).mockReturnValue({
      userId: 'usr-com-01', // Mismo ID que el comisionado
      username: 'carlos.rodriguez',
    });

    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText(/Restricción de Segregación de Funciones \(SoD\)/i)).toBeDefined();
    const btnAutorizar = screen.getByRole('button', { name: /Autorizar Comisión Extemporánea/i });
    expect(btnAutorizar.hasAttribute('disabled')).toBe(true);
  });

  it('no renderiza contenido si isOpen es false o solicitud es null', () => {
    const { container: c1 } = render(
      <AutorizacionDireccionModal
        isOpen={false}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={null}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(c2.firstChild).toBeNull();
  });

  it('cancela la confirmación de rechazo al presionar Cancelar sin invocar el servicio', () => {
    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const btnNegar = screen.getByRole('button', { name: /Negar \/ Rechazar/i });
    fireEvent.click(btnNegar);

    expect(screen.getByText(/¿Está seguro de negar y rechazar esta comisión\?/i)).toBeDefined();

    const btnCancelar = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(btnCancelar);

    expect(screen.queryByText(/¿Está seguro de negar y rechazar esta comisión\?/i)).toBeNull();
    expect(viaticosService.rechazarComisionExtemporanea).not.toHaveBeenCalled();
  });

  it('actualiza el contador de caracteres de la justificación reactivamente', () => {
    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByPlaceholderText(/Describa la justificación institucional/i);
    fireEvent.change(textarea, { target: { value: 'Prueba conteo' } });

    expect(screen.getByText(/13\/2000 caracteres/i)).toBeDefined();
  });

  it('muestra mensaje de error si solicitarOtpFirma falla', async () => {
    (viaticosService.solicitarOtpFirma as any).mockRejectedValue(
      new Error('No fue posible enviar el código OTP al correo institucional'),
    );

    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const btnAutorizar = screen.getByRole('button', { name: /Autorizar Comisión Extemporánea/i });
    fireEvent.click(btnAutorizar);

    await waitFor(() => {
      expect(
        screen.getByText(/No fue posible enviar el código OTP al correo institucional/i),
      ).toBeDefined();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('muestra mensaje de error si la autorización falla en el backend tras validar OTP', async () => {
    (viaticosService.autorizarComisionExtemporanea as any).mockRejectedValue(
      new Error('Fallo de conexión con el servicio de viáticos'),
    );

    render(
      <AutorizacionDireccionModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const btnAutorizar = screen.getByRole('button', { name: /Autorizar Comisión Extemporánea/i });
    fireEvent.click(btnAutorizar);

    await waitFor(() => {
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    const btnConfirmarOtp = screen.getByRole('button', { name: /Confirmar Firma OTP Test/i });
    fireEvent.click(btnConfirmarOtp);

    await waitFor(() => {
      expect(screen.getByText(/Fallo de conexión con el servicio de viáticos/i)).toBeDefined();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
