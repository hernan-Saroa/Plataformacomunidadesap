import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PTAForm } from './PTAForm';
import { getComponentesAprobacion, getPTAById, savePTA, requestPTAFirmaDocenteCode,
  enviarAprobacionPTA, updatePTAStatus, validarReenvioPTA } from '../../../services/api/ptaApi';

vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('../../../services/api/docenciaConcertadaApi', () => ({ getRegimenDocencia: vi.fn().mockResolvedValue('actual') }));
vi.mock('../../../services/api/ptaApi', () => {
  const empty = () => Promise.resolve({ success: true, data: [] });
  return {
    getPTAById: vi.fn(), savePTA: vi.fn().mockResolvedValue({ success: true, data: { id: 'pta-1' } }),
    getCatalogoProgramas: empty, getCatalogoAsignaturas: empty, getCatalogoTerritoriales: empty,
    getCatalogoCetaps: empty, getCatalogoActividadesInvestigacion: empty, getCatalogoActividadesExtension: empty,
    getCatalogoActividadesComplementarias: empty, getCatalogoActividadesAcademicoAdmin: empty,
    getCatalogoRolesInvestigacion: empty, getCatalogoSeccionesExtension: empty, getPeriodosAcademicos: empty,
    getRUNDDocente: empty, getComponentesAprobacion: vi.fn().mockImplementation(empty),
    getCatalogoProgramasCascada: empty, getOfertaCetap: empty,
    getActivePeriodoAcademico: () => Promise.resolve({ codigo: '2026-2' }),
    getBancoDocenteById: () => Promise.resolve({ success: true, data: { horas_programables: 800 } }),
    getConfiguracionPTAGlobal: () => Promise.resolve({ success: true, data: {} }),
    requestPTAFirmaDocenteCode: vi.fn().mockResolvedValue({ success: true, data: { verificationId: 'otp-1', email: 'docente@test' } }),
    verifyPTAFirmaDocenteCode: vi.fn().mockResolvedValue({ success: true }),
    updatePTAStatus: vi.fn().mockResolvedValue({ success: true, nuevoEstado: 'Pendiente Jefatura' }),
    enviarAprobacionPTA: vi.fn().mockResolvedValue({ success: true }),
    validarReenvioPTA: vi.fn().mockResolvedValue({ success: true }),
    guardarFirmaDigitalPTA: vi.fn().mockResolvedValue({ success: true }),
  };
});
vi.mock('../portalApi', () => ({ getPerfilPortal: () => Promise.resolve({ success: false }) }));
vi.mock('../../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('./IdentificacionDocentePanel', () => ({ IdentificacionDocentePanel: () => null }));
vi.mock('./FirmaElectronicaModal', () => ({ FirmaElectronicaModal: () => null }));
vi.mock('../../pta/FirmaDigitalPTA', () => ({ FirmaDigitalPTA: ({ onFirmaCompleta }: any) =>
  <button onClick={() => onFirmaCompleta({ certificado_id: 'firma-1', firmante: 'Docente' })}>Confirmar firma de prueba</button> }));

const asignaturas = ['Historia', 'Economía'].map((nombre, index) => ({
  id: index + 1, asignatura_id: `A${index + 1}`, asignatura_nombre: nombre,
  territorial_id: 'central', programa_id: 'programa-1', pensum: 'AP_36', creditos: 3,
  horas_base: 64, total_horas: 192, total_estudiantes: 100, modalidad: 'PRESENCIAL',
  fecha_inicio: '2026-11-01', fecha_fin: '2026-11-30',
}));
const plan = { id: 'pta-1', estado: 'Borrador', periodo: '2026-2', tipo_vinculacion: 'CARRERA',
  horas_a_programar: 800, asignaturas };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.mocked(getPTAById).mockResolvedValue({ success: true, data: plan } as any);
  vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [] });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('cruces presenciales como alerta del PTA', () => {
  it('conserva todas las horas, permite cancelar y envía únicamente después de continuar y firmar', async () => {
    const onBack = vi.fn();
    render(<PTAForm onBack={onBack} userPersonId="docente-1" ptaId="pta-1" />);
    expect(await screen.findByText(/el PTA podrá enviarse a aprobación con esta alerta/)).toBeTruthy();
    expect(screen.getAllByText(/⚠ Cruce de fechas/)).toHaveLength(2);
    expect(screen.queryByText(/no se suma al total/)).toBeNull();
    const enviar = screen.getByRole('button', { name: /^Enviar a Aprobación$/ }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(false);
    fireEvent.click(enviar);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('384h').length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/Historia.*Economía/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar envío' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(requestPTAFirmaDocenteCode).not.toHaveBeenCalled();
    expect(savePTA).not.toHaveBeenCalled();
    fireEvent.click(enviar);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Continuar con alerta' }));
    fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
    await waitFor(() => expect(enviarAprobacionPTA).toHaveBeenCalledWith('pta-1'));
    expect(vi.mocked(savePTA).mock.calls[0][0].asignaturas).toEqual(asignaturas.map(asignatura => expect.objectContaining(asignatura)));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('permite reenviar una edición de Docencia autorizada sin eliminar la alerta', async () => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: { ...plan, estado: 'REVISION_DOCENTE_N1' } } as any);
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente: 'academica_pregrado', estado: 'devuelto', scope: 'solicitud_edicion', scopeId: 'sol-1' },
    ] } as any);
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
    const reenviar = await screen.findByRole('button', { name: /^Enviar a reaprobación$/ });
    fireEvent.click(reenviar);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Historia.*Economía/)).toBeTruthy();
    expect(within(dialog).getAllByText('384h').length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar con alerta' }));
    fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
    await waitFor(() => expect(updatePTAStatus).toHaveBeenCalledWith('pta-1', expect.objectContaining({ accion: 'reenviar_corregido' })));
    expect(validarReenvioPTA).toHaveBeenCalledWith('pta-1');
    expect(enviarAprobacionPTA).not.toHaveBeenCalled();
  });
});
