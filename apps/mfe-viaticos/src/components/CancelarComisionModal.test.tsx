import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CancelarComisionModal from './CancelarComisionModal';

const mockSolicitudCurso = {
  id: 'sol-curso-001',
  consecutivoUnico: 'COM-2026-0099',
  codigo: 'COM-2026-0099',
  estado: 'EN_VERIFICACION',
  estadoSolicitud: 'EN_VERIFICACION',
  destinoCiudad: 'Medellín',
  destinoDepartamento: 'Antioquia',
  fechaInicio: '2026-10-15',
  fechaFin: '2026-10-18',
  diasComision: 4,
  montoTotalEstimado: 850000,
  siifExportado: false,
  comisionado: {
    id: 'usr-com-01',
    numeroDocumento: '1098765432',
    primerNombre: 'Ana',
    primerApellido: 'Gómez',
  },
};

const mockSolicitudConRecursos = {
  id: 'sol-comprometida-002',
  consecutivoUnico: 'COM-2026-0100',
  codigo: 'COM-2026-0100',
  estado: 'AUTORIZADA',
  estadoSolicitud: 'AUTORIZADA',
  destinoCiudad: 'Cali',
  destinoDepartamento: 'Valle del Cauca',
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-04',
  diasComision: 3,
  montoTotalEstimado: 1200000,
  siifExportado: true,
  comisionado: {
    id: 'usr-com-02',
    numeroDocumento: '12345678',
    primerNombre: 'Carlos',
    primerApellido: 'Pérez',
  },
};

const mockSolicitudLegalizada = {
  id: 'sol-leg-003',
  consecutivoUnico: 'COM-2026-0101',
  codigo: 'COM-2026-0101',
  estado: 'LEGALIZADO',
  estadoSolicitud: 'LEGALIZADO',
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: '2026-08-01',
  fechaFin: '2026-08-03',
  montoTotalEstimado: 500000,
  comisionado: {
    id: 'usr-com-03',
    numeroDocumento: '87654321',
    primerNombre: 'María',
    primerApellido: 'López',
  },
};

vi.mock('../services/api/viaticosService', () => ({
  default: {
    cancelarComision: vi.fn(),
  },
  viaticosService: {
    cancelarComision: vi.fn(),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    getCurrentUserSync: vi.fn(() => ({
      userId: 'usr-analista-01',
      username: 'analista.viaticos',
      firstName: 'Diana',
      lastName: 'Pérez',
      role: 'ANALISTA_VIATICOS',
    })),
    isSuperAdmin: vi.fn(() => false),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('CancelarComisionModal — RF-AUT-003 (Etapa 6)', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si isOpen es false o solicitud es null', () => {
    const { container } = render(
      <CancelarComisionModal
        solicitud={null}
        isOpen={false}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza información de la comisión y campos para registrar motivo y responsable', () => {
    render(
      <CancelarComisionModal
        solicitud={mockSolicitudCurso}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('COM-2026-0099')).toBeInTheDocument();
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText(/Medellín/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo detallado de la cancelación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Responsable \/ Dependencia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar Cancelación/i })).toBeInTheDocument();
  });

  it('detecta automáticamente si hay recursos comprometidos (Etapa 8)', () => {
    render(
      <CancelarComisionModal
        solicitud={mockSolicitudConRecursos}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText(/Pendiente Reintegro · Etapa 8/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reintegro de viáticos o liberación del RP/i),
    ).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('valida motivo obligatorio de mínimo 5 caracteres al enviar', async () => {
    render(
      <CancelarComisionModal
        solicitud={mockSolicitudCurso}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByLabelText(/Motivo detallado de la cancelación/i);
    fireEvent.change(textarea, { target: { value: 'abc' } });

    const submitBtn = screen.getByRole('button', { name: /Confirmar Cancelación/i });
    expect(submitBtn).toBeDisabled();
  });

  it('ejecuta la cancelación exitosamente llamando a viaticosService', async () => {
    vi.mocked(viaticosService.cancelarComision).mockResolvedValue({
      success: true,
      data: {},
      message: 'Cancelada',
      timestamp: new Date().toISOString(),
    });

    render(
      <CancelarComisionModal
        solicitud={mockSolicitudConRecursos}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByLabelText(/Motivo detallado de la cancelación/i);
    fireEvent.change(textarea, {
      target: { value: 'Evento cancelado por orden del Ministerio de Hacienda' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirmar Cancelación/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(viaticosService.cancelarComision).toHaveBeenCalledWith(
        'sol-comprometida-002',
        expect.objectContaining({
          motivoCancelacion: 'Evento cancelado por orden del Ministerio de Hacienda',
          recursosComprometidos: true,
        }),
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('no permite cancelar comisiones que ya han sido legalizadas en Etapa 8', () => {
    render(
      <CancelarComisionModal
        solicitud={mockSolicitudLegalizada}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(
      screen.getByText(/Esta comisión ya ha sido legalizada en Etapa 8/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Confirmar Cancelación/i }),
    ).not.toBeInTheDocument();
  });
});
