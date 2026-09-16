import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AutorizacionDireccionModal from './AutorizacionDireccionModal';
import { SolicitudAutorizacion } from '../types/viaticos';

const mockSolicitud: SolicitudAutorizacion = {
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

vi.mock('../services/api/viaticosService', () => ({
  default: {
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
  },
  viaticosService: {
    autorizarComisionExtemporanea: vi.fn(),
    rechazarComisionExtemporanea: vi.fn(),
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

  it('permite autorizar con justificación y marca de delegado', async () => {
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

    // Click autorizar
    const btnAutorizar = screen.getByRole('button', { name: /Autorizar Comisión Extemporánea/i });
    fireEvent.click(btnAutorizar);

    await waitFor(() => {
      expect(viaticosService.autorizarComisionExtemporanea).toHaveBeenCalledWith(
        'sol-ext-001',
        'Comisión urgente requerida por calamidad',
        true,
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
});
