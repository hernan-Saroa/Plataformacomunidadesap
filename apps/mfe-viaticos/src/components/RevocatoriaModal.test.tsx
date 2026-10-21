import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RevocatoriaModal from './RevocatoriaModal';
import { SolicitudViatico } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';

const mockSolicitudOrdenador: SolicitudViatico = {
  id: 'sol-rev-001',
  codigo: 'COM-2026-0089',
  consecutivoUnico: 'COM-2026-0089',
  estado: 'EN_REVOCATORIA',
  nombreComisionado: 'Andrés López',
  cedulaComisionado: '98765432',
  ciudadDestino: 'Medellín',
  departamentoDestino: 'Antioquia',
  fechaInicio: '2026-11-20',
  fechaFin: '2026-11-23',
  diasComision: 3,
  montoTotal: 850000,
  codigoRp: '2026-11-15_RP_9001',
  numeroRp: '9001',
  valorComprometido: 850000,
  procesoRevocatoria: {
    fase: 'PENDIENTE_REGISTRO_ORDENADOR',
    solicitadoPor: {
      usuarioId: 'user-jefe-01',
      nombre: 'Jefe Dependencia',
      motivo: 'Comisión cancelada por reunión ministerial urgente',
      fecha: '2026-11-16T10:00:00Z',
    },
    tieneRp: true,
  },
} as any;

const mockSolicitudPresupuesto: SolicitudViatico = {
  id: 'sol-rev-002',
  codigo: 'COM-2026-0090',
  consecutivoUnico: 'COM-2026-0090',
  estado: 'EN_REVOCATORIA',
  nombreComisionado: 'María Gómez',
  cedulaComisionado: '52123456',
  ciudadDestino: 'Cartagena',
  departamentoDestino: 'Bolívar',
  fechaInicio: '2026-11-25',
  fechaFin: '2026-11-28',
  diasComision: 3,
  montoTotal: 1200000,
  codigoRp: '2026-11-18_RP_9002',
  numeroRp: '9002',
  valorComprometido: 1200000,
  procesoRevocatoria: {
    fase: 'PENDIENTE_REDUCCION_PRESUPUESTO',
    solicitadoPor: {
      usuarioId: 'user-jefe-02',
      nombre: 'Jefe Dependencia',
      motivo: 'Cancelación solicitada',
      fecha: '2026-11-18T08:00:00Z',
    },
    tieneRp: true,
    registroSiif: {
      numeroActo: 'ACT-REV-2026-099',
      fechaActo: '2026-11-18',
      justificacion: 'Orden ministerial de revocatoria de comisiones no esenciales',
      registradoPorId: 'user-ordenador-01',
      fechaRegistro: '2026-11-18T14:30:00Z',
      reportePdfUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      reportePdfNombre: 'Reporte_SIIF_REV_9002.pdf',
    },
  },
} as any;

vi.mock('../services/api/viaticosService', () => {
  const mockService = {
    registrarRevocatoriaSiif: vi.fn(),
    aplicarReduccionRpRevocatoria: vi.fn(),
  };
  return {
    default: mockService,
    viaticosService: mockService,
  };
});

describe('RevocatoriaModal — Proceso de Revocatoria en SIIF Nación y Reducción de RP', () => {
  const onCerrar = vi.fn();
  const onExito = vi.fn();
  const originalFileReader = global.FileReader;

  beforeEach(() => {
    vi.clearAllMocks();

    class MockFileReader {
      result: string = 'data:application/pdf;base64,dummybase64content';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      readAsDataURL() {
        this.result = 'data:application/pdf;base64,dummybase64content';
        if (this.onload) {
          this.onload();
        }
      }
    }

    (global as any).FileReader = MockFileReader;
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it('Modo ORDENADOR: renderiza campos obligatorios y registra acto con reporte PDF', async () => {
    (viaticosService.registrarRevocatoriaSiif as any).mockResolvedValue({
      success: true,
      data: { ...mockSolicitudOrdenador, estado: 'EN_REVOCATORIA' },
    });

    render(
      <RevocatoriaModal
        solicitud={mockSolicitudOrdenador}
        abierto={true}
        modo="ORDENADOR"
        onCerrar={onCerrar}
        onExito={onExito}
      />,
    );

    expect(screen.getByText(/Registro de Revocatoria en SIIF Nación/i)).toBeDefined();
    expect(screen.getByText(/Ordenador del Gasto/i)).toBeDefined();
    expect(screen.getByText(/COM-2026-0089/i)).toBeDefined();
    expect(screen.getByText(/Andrés López/i)).toBeDefined();

    // Rellenar número de acto
    const inputActo = screen.getByPlaceholderText(/Ej\. ACT-REV-2026-0034/i);
    fireEvent.change(inputActo, { target: { value: 'ACT-REV-2026-0155' } });

    // Rellenar justificación
    const inputJustificacion = screen.getByPlaceholderText(/Explique las razones administrativas/i);
    fireEvent.change(inputJustificacion, {
      target: { value: 'Revocatoria oficial por reprogramación institucional' },
    });

    // Simular carga de archivo PDF
    const file = new File(['%PDF-1.4 dummy content'], 'reporte_siif.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('reporte_siif.pdf')).toBeDefined();
    });

    // Enviar formulario
    const botonSubmit = screen.getByRole('button', { name: /Registrar Revocatoria en SIIF/i });
    expect(botonSubmit).not.toBeNull();
    fireEvent.click(botonSubmit);

    await waitFor(() => {
      expect(viaticosService.registrarRevocatoriaSiif).toHaveBeenCalledWith(
        'sol-rev-001',
        expect.objectContaining({
          numeroActoRevocatoria: 'ACT-REV-2026-0155',
          justificacion: 'Revocatoria oficial por reprogramación institucional',
          reporteRevocatoriaPdfBase64: 'data:application/pdf;base64,dummybase64content',
          nombreArchivoPdf: 'reporte_siif.pdf',
        }),
      );
      expect(onExito).toHaveBeenCalled();
      expect(onCerrar).toHaveBeenCalled();
    });
  });

  it('Modo PRESUPUESTO: muestra datos de la revocatoria y permite aplicar la reducción de RP', async () => {
    (viaticosService.aplicarReduccionRpRevocatoria as any).mockResolvedValue({
      success: true,
      data: { ...mockSolicitudPresupuesto, estado: 'REVOCADA' },
    });

    render(
      <RevocatoriaModal
        solicitud={mockSolicitudPresupuesto}
        abierto={true}
        modo="PRESUPUESTO"
        onCerrar={onCerrar}
        onExito={onExito}
      />,
    );

    expect(screen.getByText(/Reducción de RP por Revocatoria/i)).toBeDefined();
    expect(screen.getByText(/Grupo de Presupuesto/i)).toBeDefined();
    expect(screen.getByText('ACT-REV-2026-099')).toBeDefined();
    expect(screen.getByText(/Ver Reporte SIIF \(PDF\)/i)).toBeDefined();

    // Rellenar número de operación de reducción
    const inputOperacion = screen.getByPlaceholderText(/Ej\. RED-RP-2026-081/i);
    fireEvent.change(inputOperacion, { target: { value: 'RED-RP-2026-0450' } });

    // Enviar reducción
    const botonSubmit = screen.getByRole('button', { name: /Aplicar Reducción y Revocar/i });
    expect(botonSubmit).not.toBeNull();
    fireEvent.click(botonSubmit);

    await waitFor(() => {
      expect(viaticosService.aplicarReduccionRpRevocatoria).toHaveBeenCalledWith(
        'sol-rev-002',
        expect.objectContaining({
          numeroOperacionReduccion: 'RED-RP-2026-0450',
          valorReducido: 1200000,
        }),
      );
      expect(onExito).toHaveBeenCalled();
      expect(onCerrar).toHaveBeenCalled();
    });
  });
});
