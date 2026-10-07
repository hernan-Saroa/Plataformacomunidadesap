// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { getPTAById, getComponentesAprobacion, getComponentesRevision, getPTADecisionPermissions, requestPTAFirmaAprobadorCode, aprobarComponente, revisarComponente, getAprobacionTerritorial, getRevisionTerritorial, getEvidenciasSeguimientoPTA, revisarEvidenciaPTA } from '../../services/api/ptaApi';
import { PTADetallePanelBackoffice, ApprovalTracker } from './PTADetallePanelBackoffice';
import { PTA_COMPONENT_KEYS } from './shared/ptaComponentPermissions';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  permisosGranulares.clear();
  permisosGranulares.add('pta.approve.academica.pregrado');
});

const { resultadoFirma, permisosGranulares } = vi.hoisted(() => ({
  resultadoFirma: vi.fn(),
  permisosGranulares: new Set(['pta.approve.academica.pregrado']),
}));
vi.mock('./FirmaDigitalPTA', () => ({
  FirmaDigitalPTA: ({ onFirmaCompleta }: any) => <button onClick={async () => {
    resultadoFirma(await onFirmaCompleta({ certificado_id: 'firma-test' }));
  }}>Confirmar firma de prueba</button>,
}));

describe('tarjetas del detalle administrativo', () => {
  it('usa No aplica aun cuando los permisos incluyen todos los componentes', () => {
    const componentesEstado = ['academica', 'investigacion', 'extension', 'complementarias'].map(key => ({
      key, horas: key === 'extension' ? 0 : 100, estado: key === 'extension' ? 'no_aplica' : 'aprobado',
    }));
    render(<ApprovalTracker estado="Aprobado" componentesEstado={componentesEstado} visibleComponentKeys={PTA_COMPONENT_KEYS} />);
    const extension = screen.getByText('Extensión').parentElement!;
    expect(within(extension).getByText('No aplica')).toBeTruthy();
    expect(screen.getAllByText('Aprobado')).toHaveLength(3);
  });
});

// EFDS-1531 (Item 49): el Revisor/Aprobador de un componente (p.ej. Docencia -
// Pregrado) solo veía el nombre de la asignatura/actividad de SU componente;
// las de los demás componentes (Posgrado, Investigación, etc.) quedaban
// completamente ocultas en vez de mostrarse en modo consulta. El fix quitó el
// gate `shouldShowComponentKey(...) &&` que desmontaba esas secciones de
// detalle. Estas pruebas fijan que:
//  1) las asignaturas/actividades de componentes ajenos ahora SE VEN, y
//  2) las acciones de aprobar/devolver sobre esos componentes ajenos siguen
//     bloqueadas (el fix es de VISIBILIDAD, no de permisos de acción).

vi.mock('./PermisosPTAContext', () => ({
  usePermisosPTA: () => ({ permisos: { componentesAprobables: [] } }),
  usePermisosPTAGranulares: () => ({
    // Simula un Aprobador con permiso granular ÚNICAMENTE sobre Docencia - Pregrado.
    puede: (permissionId: string) => permisosGranulares.has(permissionId),
    puedeAccion: () => false,
    puedeVista: () => true,
    sourceInfo: { source: 'test', granularCount: 1, totalPermisos: 1, ptaPermisos: 1 },
  }),
}));

vi.mock('./ConfiguracionReglasPTA', () => ({
  usePTARules: () => ({ rules: {}, loading: false }),
}));

vi.mock('../portal/pta/ReportePTAInstitucional', () => ({
  ReportePTAInstitucional: ({ pta, componentesAprobacion }: any) =>
    <div data-testid="reporte-institucional">{pta.estado}|{componentesAprobacion[0]?.estado}</div>,
}));

// El módulo real de la shell instancia un OfflineCacheManager (IndexedDB) al
// cargarse, que no existe en jsdom. Solo se usa `getBaseURL` aquí.
vi.mock('../../../../shell/src/services/api', () => ({
  getBaseURL: () => 'http://localhost',
}));

vi.mock('../../services/api/ptaApi', () => ({
  getPTADecisionPermissions: vi.fn().mockResolvedValue({ success: true, data: {
    allowedComponents: ['academica_pregrado'], allowedReviewSubsecciones: [],
    territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
  } }),
  getPTAById: vi.fn().mockResolvedValue({ success: false }),
  updatePTAStatus: vi.fn().mockResolvedValue({ success: true }),
  guardarFirmaDigitalPTA: vi.fn().mockResolvedValue({ success: true }),
  getAprobacionesJefatura: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getEvidenciasSeguimientoPTA: vi.fn().mockResolvedValue({ success: true, data: [] }),
  revisarEvidenciaPTA: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getComponentesAprobacion: vi.fn().mockResolvedValue({ success: true, data: [] }),
  aprobarComponente: vi.fn().mockResolvedValue({ success: true }),
  getComponentesRevision: vi.fn().mockResolvedValue({ success: true, data: [] }),
  revisarComponente: vi.fn().mockResolvedValue({ success: true }),
  requestPTAFirmaAprobadorCode: vi.fn().mockResolvedValue({ success: true }),
  verifyPTAFirmaDocenteCode: vi.fn().mockResolvedValue({ success: true }),
  getAprobacionTerritorial: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getRevisionTerritorial: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

function basePta(overrides: Record<string, any> = {}) {
  return {
    id: 'pta-1',
    estado: 'Pendiente Jefatura',
    periodo: '2026-1',
    asignaturas: [
      { nombre: 'Cálculo I', componente_docencia: 'academica_pregrado', creditos: 4, semestre: 1, total_horas: 96 },
      { nombre: 'Estadística Avanzada', componente_docencia: 'academica_posgrado', creditos: 4, semestre: 3, total_horas: 96 },
    ],
    investigacion_actividades: [
      { nombre: 'Proyecto Ajeno de Investigación', horas_total: 50 },
    ],
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof PTADetallePanelBackoffice>> = {}) {
  return {
    pta: basePta(),
    onClose: vi.fn(),
    onAprobar: vi.fn(),
    onDevolver: vi.fn(),
    onConcertar: vi.fn(),
    onVerReporte: vi.fn(),
    puedeAprobar: true,
    nivelAprobacion: 1,
    rolLabel: 'Aprobador Docencia Pregrado',
    isSuperUser: false,
    ...overrides,
  } as React.ComponentProps<typeof PTADetallePanelBackoffice>;
}

describe('PTADetallePanelBackoffice — visibilidad de componentes ajenos (EFDS-1531)', () => {
  it('no muestra ni carga Seguimiento cuando falta su permiso funcional', () => {
    render(<PTADetallePanelBackoffice {...baseProps()} />);

    expect(screen.queryByRole('button', { name: 'Seguimiento' })).toBeNull();
    expect(getEvidenciasSeguimientoPTA).not.toHaveBeenCalled();
  });

  it('con el permiso funcional usa la consulta protegida y no simula una decisión rechazada', async () => {
    permisosGranulares.add('pta.backoffice.seguimiento');
    vi.mocked(getEvidenciasSeguimientoPTA).mockResolvedValueOnce({ success: true, data: [{
      id: 'ev-1', nombre: 'soporte-seguro.pdf', componentePta: 'docencia',
      estadoRevision: 'pendiente', horasAvance: 10,
    }] } as any);
    vi.mocked(revisarEvidenciaPTA).mockResolvedValueOnce({
      success: false, data: null, message: 'Permiso retirado',
    } as any);

    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));
    await screen.findByText('soporte-seguro.pdf');
    fireEvent.click(screen.getByRole('button', { name: '✓ Aprobar' }));

    await waitFor(() => expect(revisarEvidenciaPTA).toHaveBeenCalledTimes(1));
    expect(screen.getByText('pendiente')).toBeTruthy();
    expect(getEvidenciasSeguimientoPTA).toHaveBeenCalledWith('pta-1');
  });

  it('reconoce en Seguimiento el permiso territorial granular por nivel', async () => {
    permisosGranulares.clear();
    permisosGranulares.add('pta.backoffice.seguimiento');
    permisosGranulares.add('pta.approve.academica.territorial.pregrado');
    vi.mocked(getEvidenciasSeguimientoPTA).mockResolvedValueOnce({ success: true, data: [{
      id: 'ev-territorial', nombre: 'soporte-territorial.pdf', componentePta: 'docencia',
      estadoRevision: 'pendiente', horasAvance: 96,
    }] } as any);

    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    expect(await screen.findByText('soporte-territorial.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: '✓ Aprobar' })).toBeTruthy();
  });

  it('retira las evidencias visibles si el servidor revoca el acceso con el detalle abierto', async () => {
    permisosGranulares.add('pta.backoffice.seguimiento');
    vi.mocked(getEvidenciasSeguimientoPTA).mockResolvedValueOnce({ success: true, data: [{
      id: 'ev-revocada', nombre: 'evidencia-antes-visible.pdf', componentePta: 'docencia',
      estadoRevision: 'pendiente', horasAvance: 10,
    }] } as any);
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));
    await screen.findByText('evidencia-antes-visible.pdf');

    vi.mocked(getEvidenciasSeguimientoPTA).mockResolvedValueOnce({
      success: false, data: [], message: 'Permiso retirado',
    } as any);
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);

    await waitFor(() => expect(screen.queryByText('evidencia-antes-visible.pdf')).toBeNull());
    expect(await screen.findByText('Sin evidencias registradas')).toBeTruthy();
  });

  it('descarta una respuesta de evidencias anterior a la sincronización vigente', async () => {
    permisosGranulares.add('pta.backoffice.seguimiento');
    let resolverAnterior!: (value: any) => void;
    vi.mocked(getEvidenciasSeguimientoPTA).mockImplementationOnce(
      () => new Promise(resolve => { resolverAnterior = resolve; }),
    );
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

    vi.mocked(getEvidenciasSeguimientoPTA).mockResolvedValueOnce({ success: true, data: [{
      id: 'ev-vigente', nombre: 'evidencia-vigente.pdf', componentePta: 'docencia',
      estadoRevision: 'pendiente', horasAvance: 10,
    }] } as any);
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await screen.findByText('evidencia-vigente.pdf');

    await act(async () => resolverAnterior({ success: true, data: [{
      id: 'ev-obsoleta', nombre: 'evidencia-obsoleta.pdf', componentePta: 'docencia',
      estadoRevision: 'pendiente', horasAvance: 10,
    }] }));
    expect(screen.queryByText('evidencia-obsoleta.pdf')).toBeNull();
    expect(screen.getByText('evidencia-vigente.pdf')).toBeTruthy();
  });

  it('muestra en modo consulta las asignaturas/actividades de componentes que el actor no revisa/aprueba', async () => {
    render(<PTADetallePanelBackoffice {...baseProps()} />);

    // El tab de flujo se etiqueta "Aprobación" porque puedeAprobar=true.
    screen.getByText('Aprobación').closest('button')!.click();

    // Propio componente (Docencia - Pregrado): visible, como siempre.
    await screen.findByText('Cálculo I');

    // Componente AJENO (Docencia - Posgrado): antes del fix, esta sección ni
    // siquiera se montaba. Ahora debe verse en modo consulta.
    await screen.findByText('Estadística Avanzada');

    // Componente AJENO (Investigación): antes del fix, ni el título de la
    // sección se montaba. Ahora se ve (colapsada por defecto: se despliega).
    const investigacionHeader = await screen.findByText('Componente Investigación');
    investigacionHeader.closest('button')!.click();
    await screen.findByText('Proyecto Ajeno de Investigación');
  });

  it('muestra asignaturas de otra territorial en consulta y explica el alcance asignado', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: ['academica_territorial'], allowedReviewSubsecciones: [],
      personalTerritoriales: ['Meta'],
      territorial: {
        aprobar: { pairs: [{ territorialId: 'Meta', nivel: 'pregrado' }], reason: null },
        revisar: { pairs: [], reason: null },
      },
    } } as any);
    const pta = basePta({ asignaturas: [
      { nombre: 'Asignatura Meta', territorial_id: 'Meta', componente_docencia: 'academica_territorial', total_horas: 40 },
      { nombre: 'Asignatura Tolima', territorial_id: 'Tolima', territorial_nombre: 'Meta',
        componente_docencia: 'academica_territorial', total_horas: 40 },
    ] });
    render(<PTADetallePanelBackoffice {...baseProps({ pta })} />);
    screen.getByText('Aprobación').closest('button')!.click();

    await screen.findByText('Asignatura Meta');
    expect(screen.getByText('Asignatura Tolima')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('solo revisar o aprobar Docencia dentro de su alcance territorial');
  });

  it('muestra Investigación de cualquier territorial y bloquea la decisión cuando falta el permiso', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: [], allowedReviewSubsecciones: [],
      personalTerritoriales: ['Meta'],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } } as any);
    const pta = basePta({ asignaturas: [], investigacion_actividades: [
      { nombre: 'Proyecto Meta', territorial_id: 'Meta', horas_total: 20 },
      { nombre: 'Proyecto Tolima', territorial_id: 'Tolima', horas_total: 20 },
    ] });
    render(<PTADetallePanelBackoffice {...baseProps({ pta })} />);
    screen.getByText('Aprobación').closest('button')!.click();
    const header = await screen.findByText('Componente Investigación');
    header.closest('button')!.click();
    await screen.findByText('Proyecto Meta');
    expect(screen.getByText('Proyecto Tolima')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
  });

  it('mantiene bloqueada la acción de aprobar/devolver sobre los componentes ajenos', async () => {
    render(<PTADetallePanelBackoffice {...baseProps()} />);
    screen.getByText('Aprobación').closest('button')!.click();

    await screen.findByText('Estadística Avanzada');

    // Docencia - Pregrado es SU componente: no debe llevar el mensaje de bloqueo.
    screen.getByText('Componente Docencia (Pregrado)');

    // Docencia - Posgrado, Investigación y Complementarias (esta última
    // siempre se renderiza, con o sin datos) son AJENOS a este actor: el dato
    // ya se ve, pero la acción de aprobar/devolver sigue bloqueada en los tres.
    screen.getByText('Componente Docencia (Posgrado)');
    screen.getByText('Componente Investigación (Proyectos y Actividades)');
    expect(screen.queryAllByText('No tienes los permisos para aprobar este componente.')).toHaveLength(3);
  });
});

describe('sincronización del detalle abierto', () => {
  it('aplica los indicadores recibidos de Gestión sin esperar otro sondeo ni perder comentarios', async () => {
    const pta = basePta({ componentes_estado: [
      { key: 'academica', horas: 192, estado: 'pendiente' },
      { key: 'investigacion', horas: 50, estado: 'pendiente' },
    ] });
    const props = baseProps({ pta, syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    const input = await screen.findByPlaceholderText('Comentario opcional al aprobar este componente...');
    fireEvent.change(input, { target: { value: 'Comentario que debe conservarse' } });
    const consultas = vi.mocked(getPTAById).mock.calls.length;
    const actualizado = { ...pta, componentes_estado: [
      { key: 'academica', horas: 192, estado: 'pendiente' },
      { key: 'investigacion', horas: 50, estado: 'aprobado' },
    ] };
    rerender(<PTADetallePanelBackoffice {...props} pta={actualizado} />);
    await waitFor(() => {
      const card = screen.getAllByText('Investigación')[0].parentElement!;
      expect(within(card).getByText('Aprobado')).toBeTruthy();
    });
    expect(getPTAById).toHaveBeenCalledTimes(consultas + 1);
    expect((screen.getByPlaceholderText('Comentario opcional al aprobar este componente...') as HTMLTextAreaElement).value)
      .toBe('Comentario que debe conservarse');
    expect(screen.queryByTitle('Aprobar Investigación')).toBeNull();
  });

  it('descarta una lectura anterior cuando Gestión entrega nuevos indicadores para el mismo PTA', async () => {
    const pta = basePta({ componentes_estado: [
      { key: 'academica', horas: 192, estado: 'pendiente' },
      { key: 'investigacion', horas: 50, estado: 'pendiente' },
    ] });
    let completarLecturaAnterior!: (value: any) => void;
    vi.mocked(getPTAById).mockImplementationOnce(() => new Promise(resolve => { completarLecturaAnterior = resolve; }));
    const props = baseProps({ pta, syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    const actualizado = { ...pta, componentes_estado: [
      { key: 'academica', horas: 192, estado: 'pendiente' },
      { key: 'investigacion', horas: 50, estado: 'aprobado' },
    ] };
    rerender(<PTADetallePanelBackoffice {...props} pta={actualizado} />);
    await waitFor(() => expect(getPTAById).toHaveBeenCalledTimes(2));
    await act(async () => { completarLecturaAnterior({ success: true, data: pta }); });
    const card = screen.getAllByText('Investigación')[0].parentElement!;
    expect(within(card).getByText('Aprobado')).toBeTruthy();
  });

  it('refresca el reporte institucional abierto desde el backoffice', async () => {
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Reporte'));
    await screen.findByTestId('reporte-institucional');
    vi.mocked(getPTAById).mockResolvedValueOnce({ success: true, data: basePta({ estado: 'Aprobado' }) });
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: true, data: [{ componente: 'academica_pregrado', estado: 'aprobado' }] });
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await waitFor(() => expect(screen.getByTestId('reporte-institucional').textContent).toBe('Aprobado|aprobado'));
  });
  it('actualiza las tarjetas y conserva el comentario que se está escribiendo', async () => {
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    const input = await screen.findByPlaceholderText('Comentario opcional al aprobar este componente...');
    fireEvent.change(input, { target: { value: 'Comentario todavía sin guardar' } });
    vi.mocked(getPTAById).mockResolvedValueOnce({ success: true, data: basePta({
      componentes_estado: [
        { key: 'academica', horas: 192, estado: 'pendiente' },
        { key: 'investigacion', horas: 50, estado: 'aprobado' },
      ],
    }) });
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await waitFor(() => expect(getComponentesRevision).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      const card = screen.getAllByText('Investigación')[0].parentElement!;
      expect(within(card).getByText('Aprobado')).toBeTruthy();
    });
    expect((screen.getByPlaceholderText('Comentario opcional al aprobar este componente...') as HTMLTextAreaElement).value)
      .toBe('Comentario todavía sin guardar');
  });

  it('descarta respuestas anteriores y conserva el último estado si falla la consulta', async () => {
    let resolveOld!: (value: any) => void;
    vi.mocked(getPTAById).mockImplementationOnce(() => new Promise(done => { resolveOld = done; }));
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    vi.mocked(getPTAById).mockResolvedValueOnce({ success: true, data: basePta({ docente_nombre: 'Estado actualizado' }) });
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await screen.findByText('Estado actualizado');
    await act(async () => { resolveOld({ success: true, data: basePta({ docente_nombre: 'Respuesta obsoleta' }) }); });
    expect(screen.queryByText('Respuesta obsoleta')).toBeNull();
    vi.mocked(getPTAById).mockRejectedValueOnce(new Error('Conexión interrumpida'));
    vi.mocked(getComponentesAprobacion).mockRejectedValueOnce(new Error('Conexión interrumpida'));
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="tercera" />);
    await waitFor(() => expect(getComponentesRevision).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Estado actualizado')).toBeTruthy();
  });
});

describe('autorización vigente del servidor', () => {
  it.each([false, true])('la advertencia territorial solo corresponde a Docencia, aun con actividades ajenas en todos los demás componentes: %s', async conDocencia => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: ['investigacion'], allowedReviewSubsecciones: [], personalTerritoriales: ['Meta'],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } });
    const pta = basePta({
      asignaturas: conDocencia ? [{ nombre: 'Docencia Caldas', territorial_id: 'Caldas', total_horas: 100 }] : [],
      investigacion_proyecto: { nombre: 'Proyecto Caldas', territorial_id: 'Caldas', horas_solicitadas: 100 },
      investigacion_actividades: [{ nombre: 'Actividad Tolima', territorial_id: 'Tolima', horas_total: 32 }],
      extension_actividades: [{ nombre: 'Extensión Tolima', territorial_id: 'Tolima', seccion: 'capacitacion', horas: 10 }],
      complementarias: [{ nombre: 'Complementaria Caldas', territorial_id: 'Caldas', horas: 10 }],
    });
    render(<PTADetallePanelBackoffice {...baseProps({ pta })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    await waitFor(() => expect(getPTADecisionPermissions).toHaveBeenCalled());
    await screen.findByRole('button', { name: /^Componente Investigación/ });
    await waitFor(() => expect(Boolean(screen.queryByText(/solo revisar o aprobar Docencia dentro de su alcance territorial/))).toBe(conDocencia));
    expect(screen.queryByText(/La actividad requiere.*alcance territorial/)).toBeNull();
  });

  const sinPermisos = { success: true, data: {
    allowedComponents: [], allowedReviewSubsecciones: [],
    territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
  } };

  it('no ofrece aprobar aunque el rol local o la prop indiquen que puede', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(sinPermisos);
    render(<PTADetallePanelBackoffice {...baseProps({ isSuperUser: true })} />);
    fireEvent.click(screen.getByText(/^(Aprobación|Revisión y aprobación)$/).closest('button')!);
    await waitFor(() => expect(getComponentesRevision).toHaveBeenCalled());
    expect(screen.queryByPlaceholderText('Comentario opcional al aprobar este componente...')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
    expect(requestPTAFirmaAprobadorCode).not.toHaveBeenCalled();
  });

  it('retira las acciones al revocar permisos mientras el detalle está abierto', async () => {
    const props = baseProps({ syncVersion: 'primera' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    await screen.findByPlaceholderText('Comentario opcional al aprobar este componente...');
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(sinPermisos);
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull());
    expect(screen.queryByPlaceholderText('Comentario opcional al aprobar este componente...')).toBeNull();
    expect(screen.getByText('Cálculo I')).toBeTruthy();
  });

  it('revalida antes de solicitar el código de firma y detiene una autorización revocada', async () => {
    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    const approve = await screen.findByRole('button', { name: /^Aprobar$/ });
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(sinPermisos);
    fireEvent.click(approve);
    await waitFor(() => expect(getPTADecisionPermissions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull());
    expect(requestPTAFirmaAprobadorCode).not.toHaveBeenCalled();
    expect(aprobarComponente).not.toHaveBeenCalled();
  });

  it('ofrece solamente el par territorial y nivel autorizado y no reaparece al resolverlo', async () => {
    const permisos = { ...sinPermisos, data: { ...sinPermisos.data,
      allowedComponents: ['academica_territorial'],
      territorial: { ...sinPermisos.data.territorial,
        aprobar: { pairs: [{ territorialId: 'narino', nivel: 'pregrado' as const }], reason: null },
      },
    } };
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permisos);
    const pairs = [
      { territorialId: 'narino', territorialNombre: 'Nariño', nivel: 'pregrado', estado: 'pendiente' },
      { territorialId: 'narino', territorialNombre: 'Nariño', nivel: 'posgrado', estado: 'pendiente' },
      { territorialId: 'meta', territorialNombre: 'Meta', nivel: 'pregrado', estado: 'pendiente' },
    ];
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: true, data: pairs } as any);
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: true, data: [{ componente: 'academica_territorial', subseccion: 'general', estado: 'revisado' }] } as any);
    vi.mocked(getRevisionTerritorial).mockResolvedValueOnce({ success: true, data: pairs.map(pair => ({ ...pair, estado: 'revisado' })) } as any);
    const props = baseProps({ syncVersion: 'primera', pta: basePta({ asignaturas: pairs.map(t => ({
      nombre: `Asignatura ${t.territorialNombre} ${t.nivel}`, componente_docencia: 'academica_territorial',
      territorial_id: t.territorialId, territorial: t.territorialNombre, nivel_programa: t.nivel, total_horas: 96,
    })) }) });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    await screen.findByTitle('Aprobar Nariño · Pregrado');
    expect(screen.queryByTitle('Aprobar Nariño · Posgrado')).toBeNull();
    expect(screen.queryByTitle('Aprobar Meta · Pregrado')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Aprobar$/ })).toHaveLength(1);
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permisos);
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: true,
      data: pairs.map((p, i) => ({ ...p, estado: i === 0 ? 'aprobado' : 'pendiente' })) } as any);
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull());
  });

  it('explica la falta de territorial sin habilitar el formulario', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ ...sinPermisos, data: {
      ...sinPermisos.data, territorial: { ...sinPermisos.data.territorial,
        aprobar: { pairs: [], reason: 'Su cuenta no tiene territorial asignada.' },
      },
    } });
    render(<PTADetallePanelBackoffice {...baseProps({ pta: basePta({ asignaturas: [
      { nombre: 'Asignatura territorial', componente_docencia: 'academica_territorial', total_horas: 96 },
    ] }) })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    await screen.findByText('Su cuenta no tiene territorial asignada.');
    expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
  });

  it('habilita todas las territoriales concedidas por el rol sin seccional personal y se actualiza al limitar el alcance', async () => {
    const pairs = [
      { territorialId: 'narino', territorialNombre: 'Nariño', nivel: 'pregrado' as const, estado: 'pendiente' },
      { territorialId: 'meta', territorialNombre: 'Meta', nivel: 'pregrado' as const, estado: 'pendiente' },
    ];
    const permisos = { ...sinPermisos, data: { ...sinPermisos.data,
      allowedComponents: ['academica_territorial'],
      territorial: { ...sinPermisos.data.territorial, aprobar: { pairs, reason: null } },
    } };
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permisos);
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: true, data: pairs } as any);
    vi.mocked(getRevisionTerritorial).mockResolvedValueOnce({ success: true, data: pairs.map(pair => ({ ...pair, estado: 'revisado' })) } as any)
      .mockResolvedValueOnce({ success: true, data: pairs.map(pair => ({ ...pair, estado: 'revisado' })) } as any);
    const props = baseProps({ syncVersion: 'primera', pta: basePta({ asignaturas: pairs.map(t => ({
      nombre: `Asignatura ${t.territorialNombre}`, componente_docencia: 'academica_territorial',
      territorial_id: t.territorialId, territorial: t.territorialNombre, nivel_programa: t.nivel, total_horas: 96,
    })) }) });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    await screen.findByTitle('Aprobar Nariño · Pregrado');
    expect(screen.getByTitle('Aprobar Meta · Pregrado')).toBeTruthy();
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ ...permisos, data: { ...permisos.data,
      territorial: { ...permisos.data.territorial, aprobar: { pairs: [pairs[1]], reason: null } },
    } });
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: true, data: pairs } as any);
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="segunda" />);
    await waitFor(() => expect(screen.queryByTitle('Aprobar Nariño · Pregrado')).toBeNull());
    expect(screen.getByTitle('Aprobar Meta · Pregrado')).toBeTruthy();
  });

  it.each([false, true])('comunica a la firma el resultado real de la aprobación: %s', async success => {
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
      data: { verificationId: 'otp-test', email: 'prueba@example.test' } } as any);
    vi.mocked(aprobarComponente).mockResolvedValueOnce({ success, message: 'Resultado de prueba' } as any);
    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: /^Aprobar$/ }));
    fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
    await waitFor(() => expect(resultadoFirma).toHaveBeenCalledWith(success));
    expect(aprobarComponente).toHaveBeenCalledTimes(1);
  });

  it('informa el estado personal aprobado antes del refresco auxiliar sin reenviar los estados anteriores', async () => {
    const pta = basePta({ componentes_aprobacion_usuario: [
      { componente: 'academica_pregrado', estado: 'pendiente', revision_completa: true },
    ] });
    const ptaActualizado = { ...pta, componentes_aprobacion_usuario: [
      { componente: 'academica_pregrado', estado: 'aprobado', revision_completa: true },
    ] };
    const onUpdated = vi.fn();
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
      data: { verificationId: 'otp-test', email: 'prueba@example.test' } } as any);
    vi.mocked(aprobarComponente).mockResolvedValueOnce({ success: true,
      data: { estadoGeneral: 'Pendiente Jefatura', ptaActualizado } } as any);
    render(<PTADetallePanelBackoffice {...baseProps({ pta, onUpdated })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: /^Aprobar$/ }));
    await screen.findByText('Confirmar firma de prueba');
    let completarConsulta!: (value: any) => void;
    vi.mocked(getComponentesAprobacion).mockImplementationOnce(() => new Promise(resolve => { completarConsulta = resolve; }));
    // La lectura general no incluye los estados del usuario autenticado.
    vi.mocked(getPTAById).mockResolvedValueOnce({ success: true, data: { id: pta.id, estado: pta.estado } } as any);
    fireEvent.click(screen.getByText('Confirmar firma de prueba'));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(ptaActualizado));
    expect(resultadoFirma).not.toHaveBeenCalled();
    await act(async () => { completarConsulta({ success: true, data: [] }); });
    await waitFor(() => expect(resultadoFirma).toHaveBeenCalledWith(true));
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('muestra un único aviso temporal cuando el servidor entrega un código de pruebas', async () => {
    const info = vi.spyOn(toast, 'info').mockImplementation(() => 'otp-test');
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 'otp-test');
    try {
      vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
        data: { verificationId: 'otp-test', email: 'prueba@example.test', devCode: '676066' } } as any);
      render(<PTADetallePanelBackoffice {...baseProps()} />);
      fireEvent.click(screen.getByText('Aprobación').closest('button')!);
      fireEvent.click(await screen.findByRole('button', { name: /^Aprobar$/ }));
      await screen.findByText('Confirmar firma de prueba');
      expect(info).toHaveBeenCalledOnce();
      expect(info).toHaveBeenCalledWith('[PRUEBAS] Código de validación: 676066', {
        id: 'pta-firma-otp', duration: 20000,
      });
      expect(success).not.toHaveBeenCalled();
    } finally {
      info.mockRestore();
      success.mockRestore();
    }
  });

  it('muestra carga desde la comprobación de permisos y evita clics repetidos u otras decisiones hasta recibir el código', async () => {
    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    const approve = await screen.findByRole('button', { name: /^Aprobar$/ });
    const reject = screen.getByRole('button', { name: /^Devolver$/ });
    let resolvePermissions!: (value: any) => void;
    let resolveCode!: (value: any) => void;
    vi.mocked(getPTADecisionPermissions).mockImplementationOnce(() => new Promise(done => { resolvePermissions = done; }));
    vi.mocked(requestPTAFirmaAprobadorCode).mockImplementationOnce(() => new Promise(done => { resolveCode = done; }));
    fireEvent.click(approve);
    fireEvent.click(approve);
    fireEvent.click(reject);
    expect(screen.getByRole('dialog', { name: 'Preparando autenticación' })).toBeTruthy();
    expect(getPTADecisionPermissions).toHaveBeenCalledTimes(2);
    expect(requestPTAFirmaAprobadorCode).not.toHaveBeenCalled();
    await act(async () => { resolvePermissions({ success: true, data: {
      ...sinPermisos.data, allowedComponents: ['academica_pregrado'],
    } }); });
    expect(screen.getByRole('dialog', { name: 'Preparando autenticación' })).toBeTruthy();
    fireEvent.click(approve);
    expect(requestPTAFirmaAprobadorCode).toHaveBeenCalledTimes(1);
    await act(async () => { resolveCode({ success: true, data: { verificationId: 'otp', email: 'prueba@example.test' } }); });
    expect(screen.queryByRole('dialog', { name: 'Preparando autenticación' })).toBeNull();
    expect(await screen.findByText('Confirmar firma de prueba')).toBeTruthy();
    expect(aprobarComponente).not.toHaveBeenCalled();
  });

  it('libera el bloqueo si falla la solicitud del código y permite reintentar', async () => {
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: false, message: 'Sin conexión' } as any)
      .mockResolvedValueOnce({ success: true, data: { verificationId: 'otp', email: 'prueba@example.test' } } as any);
    render(<PTADetallePanelBackoffice {...baseProps()} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: /^Aprobar$/ }));
    await waitFor(() => expect(requestPTAFirmaAprobadorCode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Preparando autenticación' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /^Aprobar$/ }));
    await screen.findByText('Confirmar firma de prueba');
    expect(requestPTAFirmaAprobadorCode).toHaveBeenCalledTimes(2);
  });
});

// EFDS-1353 dejó 'gestion_profesoral' como ámbito por defecto de las actividades
// complementarias del catálogo, pero el detalle seguía renderizando UNA sola
// tarjeta con la clave fija 'complementarias' (el catch-all). Resultado: las
// horas vivían en otro componente, la tarjeta visible quedaba en 0h ("No aplica")
// y el componente real no aparecía en ninguna parte — sin forma de revisarlo ni
// aprobarlo.
describe('Docencia por territorial: avance personal', () => {
  const pares = [
    { territorialId: 'Pasto', territorialNombre: 'Pasto', nivel: 'pregrado' as const, estado: 'pendiente' },
    { territorialId: 'Bucaramanga', territorialNombre: 'Bucaramanga', nivel: 'pregrado' as const, estado: 'pendiente' },
  ];
  const pta = (estado = 'Pendiente Jefatura') => basePta({ estado, asignaturas: pares.map(par => ({ nombre: `Asignatura ${par.territorialId}`,
    territorial_id: par.territorialId, componente_docencia: 'academica_territorial', total_horas: 100,
  })), investigacion_actividades: [], horas_docencia: 200 });
  const permiso = (territorialId: string, etapa: 'aprobar' | 'revisar') => ({ success: true, data: {
    allowedComponents: etapa === 'aprobar' ? ['academica_territorial'] : [],
    allowedReviewSubsecciones: etapa === 'revisar' ? ['academica_territorial:general'] : [],
    territorial: { aprobar: { pairs: etapa === 'aprobar' ? [{ territorialId, nivel: 'pregrado' }] : [], reason: null },
      revisar: { pairs: etapa === 'revisar' ? [{ territorialId, nivel: 'pregrado' }] : [], reason: null } },
  } });
  const cargar = (consolidado = 'pendiente', revisionPasto = 'revisado') => {
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: true, data: [{ componente: 'academica_territorial', estado: consolidado, estado_visual: consolidado, aplica: true, horas: 200 }] } as any);
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: true, data: [{ componente: 'academica_territorial', subseccion: 'general', estado: 'pendiente' }] } as any);
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: true, data: pares.map(par => ({ ...par,
      estado: par.territorialId === 'Bucaramanga' && consolidado === 'devuelto' ? 'devuelto' : par.estado,
    })) } as any);
    vi.mocked(getRevisionTerritorial).mockResolvedValueOnce({ success: true, data: pares.map(par => ({ ...par,
      estado: par.territorialId === 'Pasto' ? revisionPasto : 'pendiente', revisorNombre: 'Revisor Pasto',
    })) } as any);
  };

  it.each(['pendiente', 'devuelto'])('aprueba Pasto con Bucaramanga %s y conserva el indicador personal aprobado aunque fallen las lecturas posteriores', async consolidado => {
    permisosGranulares.add('pta.approve.academica.territorial.pregrado');
    const permissions = permiso('Pasto', 'aprobar');
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permissions as any).mockResolvedValueOnce(permissions as any);
    cargar(consolidado);
    const propio = pta(consolidado === 'devuelto' ? 'REVISION_DOCENTE_N1' : 'Pendiente Jefatura');
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true, data: { verificationId: 'otp', email: 'test@example.test' } } as any);
    vi.mocked(aprobarComponente).mockResolvedValueOnce({ success: true, data: {
      estadoGeneral: propio.estado, approval: { componente: 'academica_territorial', ...pares[0], estado: 'aprobado' },
      ptaActualizado: { ...propio, componentes_aprobacion_usuario: [{ componente: 'academica_territorial', territorial_id: 'Pasto', nivel: 'pregrado', estado: 'aprobado', revision_completa: true }] },
    } } as any);
    render(<PTADetallePanelBackoffice {...baseProps({ pta: propio, actorNombre: 'Aprobador Pasto' })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    const aprobar = await screen.findByTitle('Aprobar Pasto · Pregrado') as HTMLButtonElement;
    expect(aprobar.disabled).toBe(false);
    expect(screen.queryByTitle('Aprobar Bucaramanga · Pregrado')).toBeNull();
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: false, data: [] } as any);
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: false, data: [] } as any);
    fireEvent.click(aprobar);
    fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
    await waitFor(() => expect(aprobarComponente).toHaveBeenCalledWith('pta-1', expect.objectContaining({ territorialId: 'Pasto', nivel: 'pregrado' })));
    await waitFor(() => expect(within(screen.getByText('Docencia').parentElement!).getByText('Aprobado')).toBeTruthy());
    expect(screen.queryByTitle('Aprobar Pasto · Pregrado')).toBeNull();
  });

  it.each([
    ['aprobar', false], ['revisar', false], ['aprobar', true], ['revisar', true],
  ] as const)('actualiza el indicador de %s con la confirmación de otro usuario y consultas territoriales demoradas=%s', async (etapa, demorada) => {
    const aprueba = etapa === 'aprobar';
    permisosGranulares.add(aprueba ? 'pta.approve.academica.territorial.pregrado' : 'pta.review.academica.territorial.pregrado');
    const permissions = permiso('Pasto', etapa);
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permissions as any)
      .mockResolvedValueOnce(permissions as any).mockResolvedValueOnce(permissions as any);
    cargar('pendiente', 'pendiente');
    const props = baseProps({ pta: pta(), puedeAprobar: aprueba });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} syncVersion="inicial" />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText('Pendiente')).toBeTruthy());
    await waitFor(() => expect(getAprobacionTerritorial).toHaveBeenCalledTimes(1));
    // La consulta de Gestión confirma el avance propio, pero las lecturas
    // auxiliares no consiguen renovar el estado pendiente que tenía el panel.
    let liberarLectura!: () => void;
    const lectura = demorada ? new Promise<any>(resolve => { liberarLectura = () => resolve({ success: false, data: [] }); })
      : Promise.resolve({ success: false, data: [] });
    vi.mocked(getAprobacionTerritorial).mockReturnValueOnce(lectura as any);
    vi.mocked(getRevisionTerritorial).mockReturnValueOnce(lectura as any);
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: false, data: [] } as any);
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: false, data: [] } as any);
    const campo = aprueba ? 'componentes_aprobacion_usuario' : 'componentes_revision_usuario';
    const actualizado = { ...props.pta, [campo]: [{ componente: 'academica_territorial',
      territorial_id: 'Pasto', nivel: 'pregrado', subseccion: 'general', estado: aprueba ? 'aprobado' : 'revisado' }] };
    rerender(<PTADetallePanelBackoffice {...props} pta={actualizado} syncVersion="cambio-externo" />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText(aprueba ? 'Aprobado' : 'Revisado')).toBeTruthy());
    if (demorada) await act(async () => { liberarLectura(); });
    expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText(aprueba ? 'Aprobado' : 'Revisado')).toBeTruthy();
    // Una reapertura confirmada también debe quitar el verde anterior.
    vi.mocked(getAprobacionTerritorial).mockResolvedValueOnce({ success: false, data: [] } as any);
    vi.mocked(getRevisionTerritorial).mockResolvedValueOnce({ success: false, data: [] } as any);
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: false, data: [] } as any);
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: false, data: [] } as any);
    rerender(<PTADetallePanelBackoffice {...props} pta={{ ...actualizado, estado: 'REVISION_DOCENTE_N1',
      [campo]: actualizado[campo].map((row: any) => ({ ...row, estado: 'pendiente' })),
    }} syncVersion="reapertura" />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText('Pendiente')).toBeTruthy());
    expect(aprobarComponente).not.toHaveBeenCalled();
    expect(revisarComponente).not.toHaveBeenCalled();
  });

  it('el revisor de Pasto ve Revisado y el de Bucaramanga continúa pendiente sobre el mismo PTA', async () => {
    permisosGranulares.add('pta.review.academica.territorial.pregrado');
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permiso('Pasto', 'revisar') as any);
    cargar();
    const props = baseProps({ pta: pta(), puedeAprobar: false, rolLabel: 'Revisor Docencia' });
    const { rerender } = render(<PTADetallePanelBackoffice {...props} syncVersion="Pasto" />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText('Revisado')).toBeTruthy());
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permiso('Bucaramanga', 'revisar') as any);
    cargar();
    rerender(<PTADetallePanelBackoffice {...props} syncVersion="Bucaramanga" />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText('Pendiente')).toBeTruthy());
  });

  it('el permiso de aprobar otro componente no reemplaza el indicador de revisión propia de Docencia', async () => {
    permisosGranulares.add('pta.review.academica.territorial.pregrado');
    permisosGranulares.add('pta.approve.investigacion');
    const permissions = permiso('Pasto', 'revisar');
    permissions.data.allowedComponents = ['investigacion'];
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce(permissions as any);
    cargar();
    render(<PTADetallePanelBackoffice {...baseProps({ pta: pta(), puedeAprobar: true })} />);
    await waitFor(() => expect(within(screen.getAllByText('Docencia')[0].parentElement!).getByText('Revisado')).toBeTruthy());
  });
});

describe('PTADetallePanelBackoffice — ámbitos de Complementarias', () => {
  const ptaConGestionProfesoral = () => basePta({
    complementarias: [
      { nombre: 'Tutoría de trabajos de grado', horas: 43, seccion: 'complementarias_docencia',
        componente_complementaria: 'complementarias_gestion_profesoral' },
    ],
    complementarias_por_componente: {
      complementarias: 0, complementarias_pregrado: 0, complementarias_posgrado: 0,
      complementarias_territorial: 0, complementarias_gestion_profesoral: 43,
    },
  });

  it('renderiza la tarjeta del ámbito que tiene las horas, no la del catch-all vacío', async () => {
    render(<PTADetallePanelBackoffice {...baseProps({ pta: ptaConGestionProfesoral() })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);

    const tarjeta = await screen.findByText('Actividades Complementarias — Gestión Profesoral');
    expect(tarjeta).toBeTruthy();
    // El catch-all no tiene horas: su tarjeta ya no se renderiza (era la única
    // que se mostraba antes, siempre vacía y en "No aplica"). Queda solo el
    // acordeón de detalle, que siempre lista todas las actividades.
    expect(screen.getByText(/Contenido: 1 actividad\(es\) \(43h\)/)).toBeTruthy();
    expect(screen.queryByText(/Contenido: 0 actividad\(es\) \(0h\)/)).toBeNull();
  });

  it('habilita la revisión de la subsección sobre el componente real', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: ['complementarias_gestion_profesoral'],
      allowedReviewSubsecciones: ['complementarias_gestion_profesoral:docencia'],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } });
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: true, data: [
      { componente: 'complementarias_gestion_profesoral', subseccion: 'docencia', estado: 'pendiente' },
    ] });
    render(<PTADetallePanelBackoffice {...baseProps({ pta: ptaConGestionProfesoral() })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);

    await screen.findByText('Actividades Complementarias — Gestión Profesoral');
    await waitFor(() => expect(screen.getAllByText('Revisión previa (pendiente)').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Revisar' })).toBeTruthy();
  });

  it('muestra el rechazo por permiso sin habilitar revisión ni aprobación', async () => {
    const reason = 'No tiene el permiso de revisión de Complementarias de Gestión Profesoral.';
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: [], allowedReviewSubsecciones: [],
      componentReasons: { complementarias_gestion_profesoral: { revisar: reason } },
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } });
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: true, data: [
      { componente: 'complementarias_gestion_profesoral', subseccion: 'docencia', estado: 'pendiente' },
    ] });
    render(<PTADetallePanelBackoffice {...baseProps({ pta: ptaConGestionProfesoral(), puedeAprobar: false })} />);
    fireEvent.click(screen.getByText('Concertación').closest('button')!);
    expect(await screen.findByText(reason)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Revisar$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
  });

  it('explica la falta de autorización para revisar GP aunque el usuario pueda aprobarlo', async () => {
    vi.mocked(getPTADecisionPermissions).mockResolvedValueOnce({ success: true, data: {
      allowedComponents: ['complementarias_gestion_profesoral'], allowedReviewSubsecciones: [],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } });
    vi.mocked(getComponentesRevision).mockResolvedValueOnce({ success: true, data: [
      { componente: 'complementarias_gestion_profesoral', subseccion: 'docencia', estado: 'pendiente' },
    ] });
    render(<PTADetallePanelBackoffice {...baseProps({ pta: ptaConGestionProfesoral() })} />);
    fireEvent.click(screen.getByText('Aprobación').closest('button')!);
    expect(await screen.findByText(/No tienes autorización para revisar.*Gestión Profesoral/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Revisar$/ })).toBeNull();
  });

  it.each([0, 43])('el revisor GP firma ambas subsecciones con %s horas de docencia y conserva el resultado al reabrir, sin adquirir aprobación', async horasDocencia => {
    permisosGranulares.clear();
    permisosGranulares.add('pta.review.complementarias.gestion_profesoral');
    const permissions = { success: true, data: {
      allowedComponents: [], allowedReviewSubsecciones: [
        'complementarias_gestion_profesoral:docencia', 'complementarias_gestion_profesoral:academico_administrativas',
      ],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } };
    const horasAadm = horasDocencia === 0 ? 0 : 100;
    const horas = horasDocencia + horasAadm;
    const pta = { ...ptaConGestionProfesoral(), asignaturas: [], investigacion_actividades: [],
      complementarias: ptaConGestionProfesoral().complementarias.map(item => ({ ...item, horas: horasDocencia })),
      academico_admin: [{ nombre: 'Coordinación académica', horas: horasAadm, seccion: 'academico_administrativas',
        componente_complementaria: 'complementarias_gestion_profesoral' }],
      horas_complementarias: horas,
      complementarias_por_componente: { complementarias_gestion_profesoral: horas },
      complementarias_con_contenido: { complementarias_gestion_profesoral: true },
      componentes_estado: [{ key: 'complementarias', estado: 'en_revision', horas, aplica: true }],
    };
    const reviews: any[] = ['docencia', 'academico_administrativas'].map(subseccion => ({
      componente: 'complementarias_gestion_profesoral', subseccion, estado: 'pendiente',
    }));
    vi.mocked(getPTADecisionPermissions).mockResolvedValue(permissions);
    vi.mocked(getComponentesRevision).mockImplementation(async () => ({ success: true, data: reviews.map(r => ({ ...r })) }));
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente: 'complementarias_gestion_profesoral', estado: 'pendiente', horas, aplica: true },
    ] });
    vi.mocked(revisarComponente).mockImplementation(async (_id, body) => {
      const review = reviews.find(r => r.subseccion === body.subseccion)!;
      Object.assign(review, { estado: 'revisado', revisorNombre: 'Revisor Gestión Profesoral' });
      return { success: true, data: { review: { ...review }, estadoGeneral: 'Pendiente Jefatura' } };
    });
    const props = baseProps({ pta, puedeAprobar: false, rolLabel: 'Revisor Gestión Profesoral' });
    try {
      const { unmount } = render(<PTADetallePanelBackoffice {...props} />);
      fireEvent.click(screen.getByText('Revisión').closest('button')!);
      await waitFor(() => expect(screen.getAllByRole('button', { name: /^Revisar$/ })).toHaveLength(2));
      for (const pendingCount of [2, 1]) {
        vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
          data: { verificationId: 'otp-test', email: 'prueba@example.test' } } as any);
        await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: /^Revisar$/ })[0]); });
        fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
        await waitFor(() => expect(screen.queryAllByRole('button', { name: /^Revisar$/ })).toHaveLength(pendingCount - 1));
        await waitFor(() => expect(screen.queryByText('Confirmar firma de prueba')).toBeNull());
        await waitFor(() => expect(resultadoFirma).toHaveBeenCalledTimes(3 - pendingCount));
      }
      await screen.findByText('Revisión previa (completa)');
      expect(resultadoFirma).toHaveBeenCalledWith(true);
      expect(aprobarComponente).not.toHaveBeenCalled();
      unmount();
      render(<PTADetallePanelBackoffice {...props} />);
      fireEvent.click(screen.getByText('Revisión').closest('button')!);
      await screen.findByText('Revisión previa (completa)');
      expect(screen.queryByRole('button', { name: /^Revisar$/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
    } finally {
      vi.mocked(getPTADecisionPermissions).mockResolvedValue({ success: true, data: {
        allowedComponents: ['academica_pregrado'], allowedReviewSubsecciones: [], territorial: permissions.data.territorial,
      } });
      vi.mocked(getComponentesRevision).mockResolvedValue({ success: true, data: [] });
      vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [] });
      vi.mocked(revisarComponente).mockResolvedValue({ success: true } as any);
    }
  });
});

describe('Investigación: firma de revisión y recarga del detalle', () => {
  const casos = ['plano', 'agrupado'].flatMap(formato => ['proyecto', 'actividades', 'ambos'].flatMap(contenido =>
    ['revision', 'aprobacion'].map(etapa => ({ formato, contenido, etapa }))));
  it.each(casos)('muestra y decide Investigación $contenido en formato $formato con permiso de $etapa', async ({ formato, contenido, etapa }) => {
    const proyecto = { nombre_proyecto: 'Proyecto visible', horas_solicitadas: 200 };
    const actividad = { actividad_nombre: 'Actividad visible', horas: 32 };
    const proyectos = contenido === 'actividades' ? [] : [proyecto];
    const actividades = contenido === 'proyecto' ? [] : [actividad];
    const horas = (proyectos.length ? 200 : 0) + (actividades.length ? 32 : 0);
    const pta = basePta({ asignaturas: [], investigacion_actividades: undefined,
      ...(formato === 'plano'
        ? { investigacion_proyecto: proyectos[0] || {}, investigacion_actividades: actividades }
        : { investigacion: { proyectos, actividades } }),
    });
    const revisa = etapa === 'revision';
    const permisos = { success: true, data: {
      allowedComponents: revisa ? [] : ['investigacion'],
      allowedReviewSubsecciones: revisa ? ['investigacion:general'] : [],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } };
    permisosGranulares.clear();
    permisosGranulares.add(revisa ? 'pta.review.investigacion' : 'pta.approve.investigacion');
    vi.mocked(getPTADecisionPermissions).mockResolvedValue(permisos);
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: pta } as any);
    vi.mocked(getComponentesRevision).mockResolvedValue({ success: true, data: [
      { componente: 'investigacion', subseccion: 'general', estado: revisa ? 'pendiente' : 'revisado' },
    ] });
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente: 'investigacion', estado: 'pendiente', aplica: true, horas },
    ] });
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
      data: { verificationId: 'otp-test', email: 'prueba@example.test' } } as any);
    const decidir = revisa ? revisarComponente : aprobarComponente;
    vi.mocked(decidir).mockResolvedValueOnce({ success: true } as any);
    try {
      render(<PTADetallePanelBackoffice {...baseProps({ pta, puedeAprobar: !revisa, rolLabel: 'Docente' })} />);
      fireEvent.click(screen.getByText(revisa ? 'Revisión' : 'Aprobación').closest('button')!);
      fireEvent.click(await screen.findByRole('button', { name: /^Componente Investigación/ }));
      if (proyectos.length) expect(await screen.findByText('Proyecto visible')).toBeTruthy();
      else expect(screen.queryByText('Proyecto de Investigación (Pendiente Registro)')).toBeNull();
      if (actividades.length) expect(await screen.findByText('Actividad visible')).toBeTruthy();
      expect(screen.getByText(`Total Investigación: ${horas}h`)).toBeTruthy();
      expect(screen.getByText(`Contenido: ${proyectos.length} proyecto(s), ${actividades.length} actividad(es) (${horas}h)`)).toBeTruthy();
      expect(screen.queryByRole('button', { name: revisa ? /^Aprobar$/ : /^Revisar$/ })).toBeNull();
      fireEvent.click(await screen.findByRole('button', { name: revisa ? /^Revisar$/ : /^Aprobar$/ }));
      fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
      await waitFor(() => expect(resultadoFirma).toHaveBeenCalledWith(true));
      expect(decidir).toHaveBeenCalledWith('pta-1', expect.objectContaining({
        componente: 'investigacion', estado: revisa ? 'revisado' : 'aprobado',
      }));
      expect(revisa ? aprobarComponente : revisarComponente).not.toHaveBeenCalled();
    } finally {
      vi.mocked(getPTADecisionPermissions).mockResolvedValue({ success: true, data: {
        ...permisos.data, allowedComponents: ['academica_pregrado'], allowedReviewSubsecciones: [],
      } });
      vi.mocked(getPTAById).mockResolvedValue({ success: false });
      vi.mocked(getComponentesRevision).mockResolvedValue({ success: true, data: [] });
      vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [] });
    }
  });

  it('conserva proyecto y actividades revisados al volver a abrir, sin otorgar aprobación al revisor', async () => {
    const permissions = { success: true, data: {
      allowedComponents: [], allowedReviewSubsecciones: ['investigacion:general'],
      territorial: { aprobar: { pairs: [], reason: null }, revisar: { pairs: [], reason: null } },
    } };
    permisosGranulares.clear();
    permisosGranulares.add('pta.review.investigacion');
    let reviewed = false;
    const review = () => ({ componente: 'investigacion', subseccion: 'general',
      estado: reviewed ? 'revisado' : 'pendiente', revisorNombre: reviewed ? 'Revisor Investigación' : null,
      comentarios: reviewed ? 'Proyecto y actividades verificados' : null });
    const pta = basePta({ asignaturas: [], horas_investigacion: 232,
      investigacion_proyecto: { nombre: 'Proyecto de Investigación', horas_solicitadas: 200 },
      investigacion_actividades: [{ nombre: 'Actividad de Investigación', horas_total: 32 }],
    });
    vi.mocked(getPTADecisionPermissions).mockResolvedValue(permissions);
    vi.mocked(getComponentesRevision).mockImplementation(async () => ({ success: true, data: [review()] }));
    vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [
      { componente: 'investigacion', estado: 'pendiente', horas: 232, aplica: true },
    ] });
    vi.mocked(revisarComponente).mockImplementation(async () => {
      reviewed = true;
      return { success: true, data: { review: review(), estadoGeneral: 'Pendiente Jefatura',
        ptaActualizado: { ...pta, componentes_aprobacion_usuario: [],
          componentes_revision_usuario: [review()] },
      } };
    });
    vi.mocked(requestPTAFirmaAprobadorCode).mockResolvedValueOnce({ success: true,
      data: { verificationId: 'otp-test', email: 'prueba@example.test' } } as any);
    const onUpdated = vi.fn();
    const props = baseProps({ pta, onUpdated, puedeAprobar: false, rolLabel: 'Revisor Investigación' });
    try {
      const { unmount } = render(<PTADetallePanelBackoffice {...props} />);
      fireEvent.click(screen.getByText('Revisión').closest('button')!);
      fireEvent.click(await screen.findByRole('button', { name: /^Revisar$/ }));
      fireEvent.click(await screen.findByText('Confirmar firma de prueba'));
      await screen.findByText('Revisión previa (completa)');
      await waitFor(() => expect(resultadoFirma).toHaveBeenCalledWith(true));
      expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({
        componentes_aprobacion_usuario: [],
        componentes_revision_usuario: [expect.objectContaining({ componente: 'investigacion', estado: 'revisado' })],
      }));
      expect(revisarComponente).toHaveBeenCalledWith('pta-1', expect.objectContaining({
        componente: 'investigacion', subseccion: 'general', estado: 'revisado',
      }));
      unmount();

      render(<PTADetallePanelBackoffice {...props} />);
      fireEvent.click(screen.getByText('Revisión').closest('button')!);
      await screen.findByText('Revisión previa (completa)');
      expect(screen.getByText('Proyecto y actividades verificados')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^Revisar$/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Aprobar$/ })).toBeNull();
      expect(aprobarComponente).not.toHaveBeenCalled();
    } finally {
      vi.mocked(getPTADecisionPermissions).mockResolvedValue({ success: true, data: {
        ...permissions.data, allowedComponents: ['academica_pregrado'], allowedReviewSubsecciones: [],
      } });
      vi.mocked(getComponentesRevision).mockResolvedValue({ success: true, data: [] });
      vi.mocked(getComponentesAprobacion).mockResolvedValue({ success: true, data: [] });
      vi.mocked(revisarComponente).mockResolvedValue({ success: true });
    }
  });
});
