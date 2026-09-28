import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpedirRpModal from './ExpedirRpModal';

const mockSolicitud = {
  id: 'sol-123',
  codigo: 'COM-2026-0042',
  consecutivoUnico: 'COM-2026-0042',
  estado: 'EN_PRESUPUESTO',
  estadoSolicitud: 'EN_PRESUPUESTO',
  objeto: 'Supervisión en territorio',
  ciudadDestino: 'Pasto',
  fechaInicio: '2026-11-15',
  fechaFin: '2026-11-18',
  diasComision: 4,
  montoTotal: 900000,
  totalComision: 900000,
  nombreComisionado: 'Ana Beltrán',
  cedulaComisionado: '1085249000',
  dependencia: 'Subdirección de Gestión Corporativa',
  comisionado: {
    id: 'com-42',
    numeroDocumento: '1085249000',
    primerNombre: 'Ana',
    primerApellido: 'Beltrán',
    tipoComisionado: 'FUNCIONARIO',
  },
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

describe('ExpedirRpModal — [Etapa 7] Nomenclatura Fecha_RP_Número', () => {
  const mockOnCerrar = vi.fn();
  const mockOnExito = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando abierto es false', () => {
    const { container } = render(
      <ExpedirRpModal
        abierto={false}
        solicitud={mockSolicitud}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza campos y calcula dinámicamente la nomenclatura Fecha_RP_Número', () => {
    render(
      <ExpedirRpModal
        abierto={true}
        solicitud={mockSolicitud}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    expect(screen.getByText(/Expedir Registro Presupuestal \(RP\)/i)).toBeDefined();
    expect(screen.getByText(/COM-2026-0042/i)).toBeDefined();

    // Inputs
    const inputNumeroRp = screen.getByPlaceholderText(/Ej: 24567/i);
    const inputRubro = screen.getByPlaceholderText(/Ej: C-2101-0100-0-2101010-02/i);

    fireEvent.change(inputNumeroRp, { target: { value: '98765' } });
    fireEvent.change(inputRubro, { target: { value: 'C-02-01-Viaticos-Nacionales' } });

    // The generated nomenclature should contain _RP_98765
    expect(screen.getByText(/_RP_98765/i)).toBeDefined();
  });

  it('valida campos obligatorios y envía expedirRp al confirmar', async () => {
    (viaticosService.expedirRp as any).mockResolvedValue({
      id: 'sol-123',
      estadoSolicitud: 'COMPROMETIDA',
      codigoRp: '2026-11-15_RP_98765',
    });

    render(
      <ExpedirRpModal
        abierto={true}
        solicitud={mockSolicitud}
        onCerrar={mockOnCerrar}
        onExito={mockOnExito}
      />,
    );

    const inputNumeroRp = screen.getByPlaceholderText(/Ej: 24567/i);
    const inputRubro = screen.getByPlaceholderText(/Ej: C-2101-0100-0-2101010-02/i);
    const inputValor = screen.getByPlaceholderText('0');

    fireEvent.change(inputNumeroRp, { target: { value: '98765' } });
    fireEvent.change(inputRubro, { target: { value: 'C-02-01-Viaticos' } });
    fireEvent.change(inputValor, { target: { value: '900000' } });

    const botonConfirmar = screen.getByRole('button', { name: /Expedir RP \(COMPROMETIDA\)/i });
    expect(botonConfirmar).toBeDefined();
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(viaticosService.expedirRp).toHaveBeenCalledWith(
        'sol-123',
        expect.objectContaining({
          numeroRp: '98765',
          rubro: 'C-02-01-Viaticos',
          valorComprometido: 900000,
        }),
      );
      expect(mockOnExito).toHaveBeenCalled();
      expect(mockOnCerrar).toHaveBeenCalled();
    });
  });
});
