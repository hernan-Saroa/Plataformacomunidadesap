import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PTAForm } from './PTAForm';
import { getRegimenDocencia } from '../../../services/api/docenciaConcertadaApi';
import { getComponentesAprobacion, getPTAById, savePTA } from '../../../services/api/ptaApi';

vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('../../../services/api/docenciaConcertadaApi', () => ({ getRegimenDocencia: vi.fn() }));
vi.mock('../../../services/api/ptaApi', () => {
  const empty = () => Promise.resolve({ success: true, data: [] });
  return {
    getPTAById: vi.fn(), savePTA: vi.fn(),
    getCatalogoProgramas: empty, getCatalogoAsignaturas: empty,
    getCatalogoTerritoriales: empty, getCatalogoCetaps: empty,
    getCatalogoActividadesInvestigacion: empty, getCatalogoActividadesExtension: empty,
    getCatalogoActividadesComplementarias: empty, getCatalogoActividadesAcademicoAdmin: empty,
    getCatalogoRolesInvestigacion: empty, getCatalogoSeccionesExtension: empty,
    getPeriodosAcademicos: empty, getRUNDDocente: empty, getComponentesAprobacion: vi.fn(),
    getCatalogoProgramasCascada: empty, getOfertaCetap: empty,
    getActivePeriodoAcademico: () => Promise.resolve({ codigo: '2050-2' }),
    getBancoDocenteById: () => Promise.resolve({ success: true, data: { horas_programables: 800 } }),
    getConfiguracionPTAGlobal: () => Promise.resolve({ success: true, data: {} }),
    requestPTAFirmaDocenteCode: vi.fn(), verifyPTAFirmaDocenteCode: vi.fn(),
    updatePTAStatus: vi.fn(), enviarAprobacionPTA: vi.fn(), validarReenvioPTA: vi.fn(),
    guardarFirmaDigitalPTA: vi.fn(),
  };
});
vi.mock('../portalApi', () => ({ getPerfilPortal: () => Promise.resolve({ success: false }) }));
vi.mock('../../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('./IdentificacionDocentePanel', () => ({ IdentificacionDocentePanel: () => null }));
vi.mock('./FirmaElectronicaModal', () => ({ FirmaElectronicaModal: () => null }));
vi.mock('../../pta/FirmaDigitalPTA', () => ({ FirmaDigitalPTA: () => null }));

const asignaturas = [
  { id: 1, origen: 'programacion', editable: false, asignatura_id: 'A1', asignatura_nombre: 'Historia', asignatura_codigo: 'HIS-1', total_horas: 64, nivel_concertacion: 'pregrado' },
  { id: 2, origen: 'programacion', editable: false, asignatura_id: 'A2', asignatura_nombre: 'Economía', asignatura_codigo: 'ECO-2', total_horas: 108, nivel_concertacion: 'posgrado' },
];
const pta = { id: 'pta-1', estado: 'Borrador', periodo: '2050-2', horas_a_programar: 800, asignaturas };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRegimenDocencia).mockResolvedValue('programacion');
  vi.mocked(getPTAById).mockResolvedValue({ success: true, data: pta } as any);
  vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
    { componente: 'academica_pregrado', estado: 'aprobado', scope: 'programacion' },
    { componente: 'academica_posgrado', estado: 'aprobado', scope: 'programacion' },
  ] } as any);
  vi.mocked(savePTA).mockResolvedValue({ success: true, data: { id: 'pta-1' } } as any);
});
afterEach(cleanup);

describe('Docencia del PTA según el régimen del backend', () => {
  it('muestra la concertación aprobada, sus horas y total sin controles manuales', async () => {
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
    expect(await screen.findByText('Aprobada en la concertación')).toBeTruthy();
    expect(screen.getByText('Historia')).toBeTruthy();
    expect(screen.getByText('Economía')).toBeTruthy();
    expect(screen.getByText('64 h')).toBeTruthy();
    expect(screen.getByText('108 h')).toBeTruthy();
    expect(screen.getByText('172 h')).toBeTruthy();
    expect(screen.getByText(/no se pueden editar ni agregar asignaturas a mano/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Agregar Asignatura' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Asignatura/ })).toBeNull();
    expect(getRegimenDocencia).toHaveBeenCalledWith({ ptaId: 'pta-1' });
  });

  it('mantiene el formulario manual cuando el backend indica régimen actual', async () => {
    vi.mocked(getRegimenDocencia).mockResolvedValue('actual');
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: { ...pta, asignaturas: [] } } as any);
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
    const agregar = await screen.findByRole('button', { name: 'Agregar Asignatura' });
    fireEvent.click(agregar);
    expect(screen.queryByText('Aprobada en la concertación')).toBeNull();
    expect(screen.getByText(/Asignatura 1/)).toBeTruthy();
  });

  it('oculta el formulario manual si falla la consulta del régimen', async () => {
    vi.mocked(getRegimenDocencia).mockRejectedValue(new Error('503'));
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" ptaId="pta-1" />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/No se pudo consultar el régimen de Docencia/);
    expect(screen.queryByRole('button', { name: 'Agregar Asignatura' })).toBeNull();
  });

  it('tras crear el borrador consulta el PTA y muestra la docencia que llenó el backend', async () => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: pta } as any);
    render(<PTAForm onBack={() => {}} userPersonId="docente-1" />);
    await waitFor(() => expect(getRegimenDocencia).toHaveBeenCalledWith({ periodo: '2050-2' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar Borrador' }));
    await waitFor(() => expect(getPTAById).toHaveBeenCalledWith('pta-1'));
    expect(await screen.findByText('Aprobada en la concertación')).toBeTruthy();
    expect(screen.getByText('172 h')).toBeTruthy();
  });
});
