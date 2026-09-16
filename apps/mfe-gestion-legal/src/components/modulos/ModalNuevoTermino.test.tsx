import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getAbogados: vi.fn().mockResolvedValue([]),
    createTerminoManual: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../config/ConfiguracionesSIGLContext', () => ({
  useConfiguracionesSIGL: () => ({
    getDestinatariosInformeActivos: () => [{ id: 'd1', nombre: 'Contraloría' }],
    getEntesSolicitantesInformeActivos: () => [{ id: 'e1', nombre: 'Ciudadano' }],
    getTiposFuenteNormativaActivos: () => [{ id: 'f1', nombre: 'Resolución' }],
  }),
}));

import { legalService } from '../../../../services/api/legal.service';
import { ModalNuevoTermino } from './ModalNuevoTermino';

describe('ModalNuevoTermino · Nuevo Informe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe mostrar el campo "Módulo / Submódulo de Origen" (fue reemplazado por Destinatario del Informe, no agregado además de él)', () => {
    render(<ModalNuevoTermino open onOpenChange={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.queryByText(/Módulo\s*\/\s*Submódulo de Origen/i)).not.toBeInTheDocument();
    expect(screen.getByText('Destinatario del Informe')).toBeInTheDocument();
  });

  it('no debe enviar un campo "origenModulo" al crear el informe', async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    render(<ModalNuevoTermino open onOpenChange={onOpenChange} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/Reunión de conciliación/i), {
      target: { value: 'Entrega de informe mensual' },
    });

    const fechaInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(fechaInput, { target: { value: '2026-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: /Crear Informe/i }));

    await waitFor(() => expect(legalService.createTerminoManual).toHaveBeenCalledTimes(1));

    const payload = (legalService.createTerminoManual as any).mock.calls[0][0];
    expect(payload).not.toHaveProperty('origenModulo');
    expect(payload).toEqual(expect.objectContaining({ nombreActuacion: 'Entrega de informe mensual' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
