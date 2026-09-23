// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { getPTAById, getComponentesAprobacion, getComponentesRevision, getPTADecisionPermissions, requestPTAFirmaAprobadorCode, aprobarComponente, getAprobacionTerritorial, getEvidenciasSeguimientoPTA, revisarEvidenciaPTA } from '../../services/api/ptaApi';
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
});
