import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionGastoModal from './AutorizacionGastoModal';
import { SolicitudAutorizacion } from '../types/viaticos';

vi.mock('../services/api/viaticosService', () => ({
  default: {
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
  viaticosService: {
    autorizarComision: vi.fn(),
    devolverComisionAutorizacion: vi.fn(),
    descargarPdfTiqueteItinerario: vi.fn(),
    obtenerUrlArchivo: vi.fn((url: string) => url),
  },
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
    telefono: '3109876543',
  },
  documentosSoporte: [
    {
      id: 'doc-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp-aprobado.pdf',
      urlArchivo: 'https://storage/cdp.pdf',
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

  it('permite autorizar la comisión exitosamente', async () => {
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

    const autorizarBtn = screen.getByText('Autorizar Comisión (AUTORIZADA)');
    fireEvent.click(autorizarBtn);

    await waitFor(() => {
      expect(viaticosService.autorizarComision).toHaveBeenCalledWith('sol-001', '');
      expect(screen.getByText(/Comisión autorizada exitosamente/i)).toBeDefined();
    });
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
});
