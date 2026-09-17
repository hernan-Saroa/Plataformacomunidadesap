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
  };
  return {
    default: service,
    viaticosService: service,
  };
});

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

  it('Escenario: Registro individual de RP exitoso con nomenclatura válida', async () => {
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

    render(
      <RegistrarRPModal
        abierto={true}
        solicitud={mockSolicitudAutorizada}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    // Verificación de campos renderizados
    expect(screen.getByText(/Registrar Registro Presupuestal \(RP\)/i)).toBeDefined();
    expect(screen.getByText(/COM-2026-0042/i)).toBeDefined();

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

    // Confirmar registro del RP
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar y Comprometer/i });
    expect(botonConfirmar).toBeDefined();
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(viaticosService.expedirRp).toHaveBeenCalledWith(
        'sol-aut-42',
        expect.objectContaining({
          numeroRp: '12345',
          fechaRp: '2026-09-16',
          soporteRpPath: '20260916_RP_12345.pdf',
          valorComprometido: 1850000,
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
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
});
