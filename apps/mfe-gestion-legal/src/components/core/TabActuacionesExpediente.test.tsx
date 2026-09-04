import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// BUG 1461: en QA, un usuario con el rol configurado como aprobador de etapa ("Jefe de
// Gestión Legal") entró a la pestaña de Actuaciones y la actuación se autorizó SOLA,
// avanzando de etapa, sin ningún clic ni token de firma. La causa era que
// checkAllAssociatedDocsSigned usaba `.every()` sobre la lista de documentos firmables de
// la actuación: si esa lista estaba vacía (actuación sin documentos asociados),
// `.every()` devolvía `true` por vacuidad y el useEffect de autoautorización disparaba
// legalService.autorizarActuacionPorDocumentos con solo montar el componente.
//
// Estas pruebas cubren: (1) que ya NO se autoautoriza una actuación sin documentos
// firmables, (2) que en su lugar se exige una acción explícita del usuario con OTP, y
// (3) que el flujo original (autoautorizar cuando SÍ hay documentos firmados) se preserva.

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), loading: vi.fn() },
}));

vi.mock('../../../../services/api/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    hasRole: vi.fn(),
    getProfesionales: vi.fn(),
    getTodosLosUsuariosActivos: vi.fn(),
  },
}));

vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getDocumentos: vi.fn(),
    getAbogadosDashboard: vi.fn(),
    autorizarActuacionPorDocumentos: vi.fn(),
    enviarOtpActuacion: vi.fn(),
    autorizarActuacion: vi.fn(),
    devolverActuacion: vi.fn(),
  },
}));

vi.mock('../../../../utils/fileUtils', () => ({
  // Solo PDF y Word requieren firma, igual que la implementación real.
  requiresSignature: (filename?: string | null) => {
    if (!filename) return false;
    const cleaned = String(filename).toLowerCase();
    return cleaned.endsWith('.pdf') || cleaned.endsWith('.doc') || cleaned.endsWith('.docx');
  },
  isPreviewableInViewer: () => false,
}));

vi.mock('../../../../config/environment', () => ({
  buildServiceAssetUrl: (service: string, path: string) => `http://mock-service/${service}${path}`,
}));

import { authService } from '../../../../services/api/authService';
import { legalService } from '../../../../services/api/legal.service';
import { TabActuacionesExpediente } from './TabActuacionesExpediente';

const aprobacionEtapaActual = {
  aprobacionTipo: 'rol' as const,
  aprobacionRol: 'JEFE_GESTION_LEGAL',
  nombreEtapa: 'Fallo',
};

const actuacionSinDocumentos = {
  id: 'act-1',
  expedienteId: 'exp-1',
  fecha: '01/01/2026',
  tipo: 'Auto',
  descripcion: 'Actuación de prueba sin documentos',
  responsable: 'Juan Pérez',
  estado: 'Pendiente',
  metadata: { estadoAutorizacion: 'PENDIENTE' },
};

function baseProps(overrides: Partial<React.ComponentProps<typeof TabActuacionesExpediente>> = {}) {
  return {
    actuaciones: [actuacionSinDocumentos],
    botonesAccion: [],
    expedienteId: 'exp-1',
    aprobacionEtapaActual,
    ...overrides,
  };
}

describe('TabActuacionesExpediente · Aprobación de actuaciones (BUG 1461)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authService.getCurrentUser as any).mockReturnValue({ id: 'jefe-1', roles: ['JEFE_GESTION_LEGAL'] });
    (authService.hasRole as any).mockImplementation((rol: string) => rol === 'JEFE_GESTION_LEGAL');
    (authService.getProfesionales as any).mockResolvedValue([]);
    (authService.getTodosLosUsuariosActivos as any).mockResolvedValue([]);
    (legalService.getDocumentos as any).mockResolvedValue([]);
    (legalService.getAbogadosDashboard as any).mockResolvedValue([]);
  });

  it('NO autoriza sola una actuación sin documentos asociados con solo montar la pestaña, aunque el usuario tenga el rol aprobador', async () => {
    render(<TabActuacionesExpediente {...baseProps()} />);

    // Debe ofrecer la aprobación manual (con token), nunca aprobar en silencio.
    expect(await screen.findByRole('button', { name: /Aprobar Actuación/i })).toBeInTheDocument();

    // Dar tiempo a que cualquier efecto asíncrono termine y confirmar que nunca se llamó
    // a la autorización automática por documentos.
    await waitFor(() => expect(legalService.getDocumentos).toHaveBeenCalled());
    expect(legalService.autorizarActuacionPorDocumentos).not.toHaveBeenCalled();
  });

  it('al hacer clic en "Aprobar Actuación" envía el OTP y abre el modal de token; confirmar con token+firma llama a autorizarActuacion (no a autorizarActuacionPorDocumentos)', async () => {
    (legalService.enviarOtpActuacion as any).mockResolvedValue({});
    (legalService.autorizarActuacion as any).mockResolvedValue({});

    render(<TabActuacionesExpediente {...baseProps()} />);

    const aprobarBtn = await screen.findByRole('button', { name: /Aprobar Actuación/i });
    fireEvent.click(aprobarBtn);

    await waitFor(() =>
      expect(legalService.enviarOtpActuacion).toHaveBeenCalledWith('exp-1', 'act-1'),
    );

    // Modal de token OTP + firma digitalizada
    const tokenInput = await screen.findByPlaceholderText(/123456/i);
    fireEvent.change(tokenInput, { target: { value: '654321' } });

    const firmaFile = new File(['firma'], 'firma.png', { type: 'image/png' });
    const fileInput = document.getElementById('firmaFile') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [firmaFile] } });

    fireEvent.click(screen.getByRole('button', { name: /Firmar y Aprobar/i }));

    await waitFor(() =>
      expect(legalService.autorizarActuacion).toHaveBeenCalledWith('exp-1', 'act-1', '654321', firmaFile),
    );
    expect(legalService.autorizarActuacionPorDocumentos).not.toHaveBeenCalled();
  });

  it('SÍ autoriza automáticamente cuando la actuación tiene un documento firmable ya firmado (comportamiento preexistente, sin regresión)', async () => {
    const documentoFirmado = {
      id: 'doc-1',
      nombre: 'contrato.pdf',
      descripcion: JSON.stringify({ firmado: true }),
    };
    (legalService.getDocumentos as any).mockResolvedValue([documentoFirmado]);
    (legalService.autorizarActuacionPorDocumentos as any).mockResolvedValue({});

    const actuacionConDocumento = {
      ...actuacionSinDocumentos,
      id: 'act-2',
      metadata: { estadoAutorizacion: 'PENDIENTE', documentosAsociados: ['doc-1'] },
    };

    render(<TabActuacionesExpediente {...baseProps({ actuaciones: [actuacionConDocumento] })} />);

    await waitFor(() =>
      expect(legalService.autorizarActuacionPorDocumentos).toHaveBeenCalledWith('exp-1', 'act-2'),
    );
  });

  it('un usuario SIN el rol aprobador no ve el botón de aprobación manual ni dispara ninguna autorización', async () => {
    (authService.getCurrentUser as any).mockReturnValue({ id: 'otro-1', roles: ['RESUELVE_GESTION_LEGAL'] });
    (authService.hasRole as any).mockReturnValue(false);

    render(<TabActuacionesExpediente {...baseProps()} />);

    await waitFor(() => expect(legalService.getDocumentos).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Aprobar Actuación/i })).not.toBeInTheDocument();
    expect(legalService.autorizarActuacionPorDocumentos).not.toHaveBeenCalled();
  });
});
