import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionGastoModal from './AutorizacionGastoModal';
import { SolicitudAutorizacion } from '../types/viaticos';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    exportarFormato023: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
  viaticosService: {
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    exportarFormato023: vi.fn(),
    solicitarOtpFirma: vi.fn(),
    verificarOtpFirma: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
}));

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
              certificado_id: 'ESAP-CERT-VIAT-SUBDIR-TEST',
              hash: 'SHA256:mockedhash1234567890abcdef',
              timestamp: new Date().toISOString(),
              firmante: 'Subdirección de Gestión',
              cargo: 'Subdirector(a) de Gestión Corporativa',
              pin_verificado: true,
              solicitudId: 'sol-001',
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

import viaticosService from '../services/api/viaticosService';

const mockSolicitud: SolicitudAutorizacion = {
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0099',
  estadoSolicitud: 'EN_AUTORIZACION',
  objetoComision: 'Taller de inducción y capacitación regional',
  destinoCiudad: 'Cali',
  destinoDepartamento: 'Valle del Cauca',
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-04',
  diasComision: 4,
  montoViaticos: 850000,
  montoGastosViaje: 150000,
  totalComision: 1000000,
  montoTotal: 1000000,
  requiereTiquetes: true,
  tipoTransporte: 'AEREO',
  comisionado: {
    id: 'com-001',
    numeroDocumento: '987654321',
    nombreCompleto: 'Carlos Mendoza',
    tipoComisionado: 'DOCENTE',
    email: 'carlos.mendoza@esap.edu.co',
  },
  documentosSoporte: [
    {
      id: 'doc-001',
      solicitudId: 'sol-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp-aprobado.pdf',
      nombreArchivoSeguro: 'cdp-aprobado-hash.pdf',
      urlRepositorio: 'https://storage/cdp.pdf',
      tipoMime: 'application/pdf',
    },
  ],
};

describe('AutorizacionGastoModal — RF-AUT-001 (Etapa 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza contenido cuando isOpen=false', () => {
    const { container } = render(
      <AutorizacionGastoModal
        isOpen={false}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra la información de la comisión, itinerario y desglose de gastos', () => {
    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    expect(screen.getAllByText(/COM-2026-0099/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Carlos Mendoza/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cali, Valle del Cauca/i)).toBeDefined();
    expect(screen.getByText(/Aéreo \(Requiere Tiquetes\)/i)).toBeDefined();
  });

  it('permite autorizar la comisión exitosamente con proceso de firma digital OTP', async () => {
    (viaticosService.solicitarOtpFirma as any).mockResolvedValue({
      verificationId: 'viat:sol-001:SUBDIRECCION:subdirector-001',
      emailEnviadoA: 'subdireccion@esap.edu.co',
      devCode: '654321',
    });
    (viaticosService.autorizarComision as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'AUTORIZADA' },
    });

    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const autorizarBtn = screen.getByRole('button', { name: /Autorizar Comisión \(Firma OTP\)/i });
    fireEvent.click(autorizarBtn);

    await waitFor(() => {
      expect(viaticosService.solicitarOtpFirma).toHaveBeenCalledWith('sol-001', {
        tipoFirma: 'SUBDIRECCION',
        etapaLabel: 'Autorización Corporativa de Gasto (RF-AUT-001)',
      });
      expect(screen.getByTestId('firma-digital-viaticos-modal')).toBeDefined();
    });

    const confirmarFirmaBtn = screen.getByText('Confirmar Firma OTP Test');
    fireEvent.click(confirmarFirmaBtn);

    await waitFor(() => {
      expect(viaticosService.autorizarComision).toHaveBeenCalledWith(
        'sol-001',
        expect.objectContaining({
          otp: '654321',
          certificadoId: 'ESAP-CERT-VIAT-SUBDIR-TEST',
          verificationId: 'viat:sol-001:SUBDIRECCION:subdirector-001',
        }),
      );
      expect(screen.getByText(/Comisión autorizada exitosamente con firma digital OTP/i)).toBeDefined();
    });
  });

  it('permite visualizar y abrir los soportes del expediente', () => {
    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    expect(screen.getByText(/4\. Soportes y Documentos del Expediente/i)).toBeDefined();
    expect(screen.getByText(/cdp-aprobado\.pdf/i)).toBeDefined();
    expect(screen.getByText('CDP')).toBeDefined();

    // Debe contar con botón Ver soporte y enlace para abrir
    const btnVer = screen.getByRole('button', { name: /^Ver$/i });
    expect(btnVer).toBeDefined();

    const enlaceAbrir = screen.getByTitle(/Abrir en pestaña nueva o descargar/i);
    expect(enlaceAbrir).toBeDefined();
    expect(enlaceAbrir.getAttribute('href')).toBe('https://storage/cdp.pdf');
  });

  it('muestra sección de devolución y valida observaciones obligatorias', async () => {
    (viaticosService.devolverComisionAutorizacion as any).mockResolvedValue({
      success: true,
      data: { id: 'sol-001', estadoSolicitud: 'EN_VERIFICACION' },
    });

    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const devolverToggleBtn = screen.getByText('Devolver con Reparos');
    fireEvent.click(devolverToggleBtn);

    expect(screen.getByPlaceholderText(/Escriba detalladamente los reparos/i)).toBeDefined();

    const confirmarDevolucionBtn = screen.getByRole('button', {
      name: /Confirmar Devolución/i,
    });
    expect(confirmarDevolucionBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Escriba detalladamente los reparos/i);
    fireEvent.change(textarea, {
      target: { value: 'El itinerario de fin de semana no presenta justificación técnica.' },
    });

    expect(confirmarDevolucionBtn).toBeEnabled();
    fireEvent.click(confirmarDevolucionBtn);

    await waitFor(() => {
      expect(viaticosService.devolverComisionAutorizacion).toHaveBeenCalledWith(
        'sol-001',
        'El itinerario de fin de semana no presenta justificación técnica.',
      );
      expect(screen.getByText(/Comisión devuelta al analista con observaciones/i)).toBeDefined();
    });
  });

  it('muestra el apartado de firma del subdirector con su nombre y sello APROBADO cuando la solicitud está AUTORIZADA', () => {
    const solicitudAutorizada: SolicitudAutorizacion = {
      ...mockSolicitud,
      estadoSolicitud: 'AUTORIZADA',
      autorizadorId: 'subdirector-123',
      autorizadorNombre: 'Dra. María Mercedes Rodríguez',
      fechaAutorizacion: '2026-11-02T14:30:00Z',
      observacionesAutorizacion: 'Itinerario y presupuesto institucional verificado conforme a la norma.',
    };

    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={solicitudAutorizada}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    // Debe mostrar el apartado de firma de subdirector
    expect(
      screen.getByText(/5\. Apartado de Firma y Visto Bueno del Subdirector/i),
    ).toBeDefined();

    // Debe mostrar el nombre del subdirector
    expect(screen.getByText('Dra. María Mercedes Rodríguez')).toBeDefined();

    // Debe mostrar la etiqueta y sello APROBADO
    expect(screen.getAllByText(/APROBADO/i).length).toBeGreaterThan(0);

    // Debe mostrar el cargo y la entidad
    expect(screen.getByText(/Subdirector\(a\) de Gestión Corporativa/i)).toBeDefined();
    expect(screen.getByText(/Escuela Superior de Administración Pública - ESAP/i)).toBeDefined();

    // Debe mostrar las observaciones del subdirector
    expect(
      screen.getByText(/Itinerario y presupuesto institucional verificado conforme a la norma/i),
    ).toBeDefined();
  });

  it('cuenta con z-[9999] para evitar conflictos con el header y contenedor con scroll interno min-h-0', () => {
    const { container } = render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    // Contenedor principal con z-[9999]
    const modalBackdrop = container.querySelector('.z-\\[9999\\]');
    expect(modalBackdrop).toBeDefined();
    expect(modalBackdrop?.className).toContain('fixed inset-0 z-[9999]');

    // Contenedor interno con scroll garantizado (min-h-0 y overflow-y-auto)
    const scrollContainer = container.querySelector('.min-h-0.overflow-y-auto');
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.className).toContain('flex-1 min-h-0 overflow-y-auto');
  });

  it('permite descargar el Reporte Formato 023 oficial llamando a exportarFormato023', async () => {
    const fakeBlob = new Blob(['%PDF-1.4 test 023'], { type: 'application/pdf' });
    (viaticosService.exportarFormato023 as any).mockResolvedValue(fakeBlob);

    // Mock URL.createObjectURL, revokeObjectURL y HTMLAnchorElement.click
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/023-blob');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();

    render(
      <AutorizacionGastoModal
        isOpen={true}
        solicitud={mockSolicitud}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    // Debe mostrar los botones para descargar el reporte 023
    const btnsDescargar = screen.getAllByRole('button', { name: /Descargar Reporte 023/i });
    expect(btnsDescargar.length).toBeGreaterThan(0);

    fireEvent.click(btnsDescargar[0]);

    await waitFor(() => {
      expect(viaticosService.exportarFormato023).toHaveBeenCalledWith(
        'sol-001',
        'COM-2026-0099',
      );
    });

    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    HTMLAnchorElement.prototype.click = originalClick;
  });
});
