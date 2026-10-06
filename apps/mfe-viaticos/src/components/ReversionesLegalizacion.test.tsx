import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReversionesLegalizacion from './ReversionesLegalizacion';
import { legalizacionService } from '../services/api/legalizacionService';

vi.mock('../services/api/legalizacionService', () => ({
  legalizacionService: { reversionesPendientes: vi.fn(), resolverReversion: vi.fn() },
}));

const svc = legalizacionService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const ITEM = {
  id: 'rev-1', motivo: 'Aprobé por error el formato sin firma.', solicitadaPorId: 'analista-1',
  solicitadaEn: '2026-09-28T15:00:00Z', solicitudId: 'sol-1', consecutivoUnico: 'COM-2026-0001',
  comisionadoNombre: 'Carlos Eduardo Ramírez Gómez', valorPagado: 1500000,
  revisionAprobadaEn: '2026-09-28T14:00:00Z', siifExportadoEn: '2026-09-28T14:30:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  svc.reversionesPendientes.mockResolvedValue([ITEM]);
  svc.resolverReversion.mockResolvedValue({ estado: 'APROBADA', solicitudId: 'sol-1' });
});

describe('EFDS-1310 — bandeja de reversiones de revisión', () => {
  it('muestra la solicitud con su motivo y advierte que el CSV ya exportado se descarta', async () => {
    render(<ReversionesLegalizacion />);
    expect(await screen.findByText(/COM-2026-0001 · Carlos Eduardo/)).toBeInTheDocument();
    expect(screen.getByText('Motivo: Aprobé por error el formato sin firma.')).toBeInTheDocument();
    expect(screen.getByText(/ya se exportó el CSV para SIIF/)).toBeInTheDocument();
  });

  it('aprobar llama al servidor y recarga la bandeja', async () => {
    render(<ReversionesLegalizacion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar reversión de COM-2026-0001' }));
    await screen.findByText(/Reversión aprobada: la legalización de COM-2026-0001 vuelve a revisión/);
    expect(svc.resolverReversion).toHaveBeenCalledWith('rev-1', 'APROBAR', undefined);
    expect(svc.reversionesPendientes).toHaveBeenCalledTimes(2);
  });

  it('rechazar exige una observación de al menos 10 caracteres', async () => {
    svc.resolverReversion.mockResolvedValue({ estado: 'RECHAZADA', solicitudId: 'sol-1' });
    render(<ReversionesLegalizacion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar reversión de COM-2026-0001' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar rechazo' });
    fireEvent.change(screen.getByLabelText('Observación del rechazo'), { target: { value: 'corta' } });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Observación del rechazo'), { target: { value: 'El formato sí tiene la firma.' } });
    fireEvent.click(confirmar);
    await screen.findByText(/Reversión rechazada/);
    expect(svc.resolverReversion).toHaveBeenCalledWith('rev-1', 'RECHAZAR', 'El formato sí tiene la firma.');
  });

  it('muestra el error del servidor, por ejemplo si quien resuelve es quien solicitó', async () => {
    svc.resolverReversion.mockRejectedValue(new Error('Quien solicitó la reversión no puede resolverla: debe hacerlo otra persona.'));
    render(<ReversionesLegalizacion />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar reversión de COM-2026-0001' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('debe hacerlo otra persona');
  });

  it('sin solicitudes pendientes lo dice', async () => {
    svc.reversionesPendientes.mockResolvedValue([]);
    render(<ReversionesLegalizacion />);
    expect(await screen.findByText('No hay solicitudes de reversión pendientes.')).toBeInTheDocument();
  });
});
