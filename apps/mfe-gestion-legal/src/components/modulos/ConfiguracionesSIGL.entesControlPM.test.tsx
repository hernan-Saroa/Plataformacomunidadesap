import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getPlanesMejoramiento: vi.fn(),
    getPlanesMejoramientoArchivados: vi.fn(),
    listarReglasAlertaTerminos: vi.fn().mockResolvedValue([]),
    getExpedientes: vi.fn().mockResolvedValue([]),
  },
  procesosCoactivosService: {},
}));
vi.mock('../../../../services/api/authService', () => ({ authService: {} }));
vi.mock('../../../../services/api/roles.service', () => ({ rolesService: {} }));
vi.mock('../configuracion/PlantillasDocumentos', () => ({ PlantillasDocumentos: () => null }));
vi.mock('../configuracion/ConfiguracionTasasReferencia', () => ({ ConfiguracionTasasReferencia: () => null }));
vi.mock('../configuracion/ConfiguracionCategoriasDocumentos', () => ({ ConfiguracionCategoriasDocumentos: () => null }));

const actualizarEntesControlPM = vi.fn();
const entes = [
  { id: 'OCI', nombre: 'Oficina Control Interno', descripcion: 'd', icono: '🔍', color: '#2962FF', activo: true },
  { id: 'LIBRE', nombre: 'Ente Sin Planes', descripcion: 'd', icono: '📊', color: '#9C27B0', activo: true },
];

vi.mock('../config/ConfiguracionesSIGLContext', () => ({
  casosPorEstado: {},
  useConfiguracionesSIGL: () => ({
    configuraciones: [], ejesEstrategicos: [], tiposIndicadores: [], tiposRequerimientos: [],
    organismosControl: [], entesControlPM: entes, destinatariosInforme: [],
    entesSolicitantesInforme: [], tiposFuenteNormativa: [], rolesResponsablesTermino: [],
    cambiosPendientes: false, savingStatus: 'idle',
    setCambiosPendientes: vi.fn(), actualizarConfiguraciones: vi.fn(), actualizarEjesEstrategicos: vi.fn(),
    actualizarTiposIndicadores: vi.fn(), actualizarTiposRequerimientos: vi.fn(),
    actualizarOrganismosControl: vi.fn(), actualizarEntesControlPM,
    actualizarDestinatariosInforme: vi.fn(), actualizarEntesSolicitantesInforme: vi.fn(),
    actualizarTiposFuenteNormativa: vi.fn(), actualizarRolesResponsablesTermino: vi.fn(),
    guardarConfiguraciones: vi.fn(), restablecerDefecto: vi.fn(),
  }),
}));

import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import { ConfiguracionesSIGL } from './ConfiguracionesSIGL';

const abrirEntes = () => {
  render(<ConfiguracionesSIGL />);
  fireEvent.click(screen.getByText('Planes de Mejoramiento'));
};

describe('ConfiguracionesSIGL · eliminar un Ente de Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getPlanesMejoramiento).mockResolvedValue([{ origen: 'OCI' }] as any);
    vi.mocked(legalService.getPlanesMejoramientoArchivados).mockResolvedValue([] as any);
  });

  it('no permite eliminar un ente con planes asociados (solo inactivarlo) y no pide confirmación', async () => {
    abrirEntes();
    fireEvent.click(await screen.findByLabelText('Eliminar ente Oficina Control Interno'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain('No se puede eliminar');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(actualizarEntesControlPM).not.toHaveBeenCalled();
  });

  it('un ente sin planes pide confirmación y solo se elimina al confirmar', async () => {
    abrirEntes();
    fireEvent.click(await screen.findByLabelText('Eliminar ente Ente Sin Planes'));

    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    expect(actualizarEntesControlPM).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Eliminar'));
    expect(actualizarEntesControlPM).toHaveBeenCalledWith(entes.filter(e => e.id !== 'LIBRE'));
  });

  it('cancelar la confirmación conserva el ente', async () => {
    abrirEntes();
    fireEvent.click(await screen.findByLabelText('Eliminar ente Ente Sin Planes'));
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(actualizarEntesControlPM).not.toHaveBeenCalled();
  });

  it('si no puede verificar los planes asociados, no ofrece eliminar', async () => {
    vi.mocked(legalService.getPlanesMejoramiento).mockRejectedValue(new Error('500'));
    abrirEntes();
    fireEvent.click(await screen.findByLabelText('Eliminar ente Ente Sin Planes'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(actualizarEntesControlPM).not.toHaveBeenCalled();
  });
});
