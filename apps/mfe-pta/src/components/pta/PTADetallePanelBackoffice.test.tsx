// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { PTADetallePanelBackoffice, ApprovalTracker } from './PTADetallePanelBackoffice';
import { PTA_COMPONENT_KEYS } from './shared/ptaComponentPermissions';

afterEach(cleanup);

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
    puede: (permissionId: string) => permissionId === 'pta.approve.academica.pregrado',
    puedeAccion: () => false,
    puedeVista: () => true,
    sourceInfo: { source: 'test', granularCount: 1, totalPermisos: 1, ptaPermisos: 1 },
  }),
}));

vi.mock('./ConfiguracionReglasPTA', () => ({
  usePTARules: () => ({ rules: {}, loading: false }),
}));

// El módulo real de la shell instancia un OfflineCacheManager (IndexedDB) al
// cargarse, que no existe en jsdom. Solo se usa `getBaseURL` aquí.
vi.mock('../../../../shell/src/services/api', () => ({
  getBaseURL: () => 'http://localhost',
}));

vi.mock('../../services/api/ptaApi', () => ({
  getPTAById: vi.fn().mockResolvedValue({ success: false }),
  updatePTAStatus: vi.fn().mockResolvedValue({ success: true }),
  guardarFirmaDigitalPTA: vi.fn().mockResolvedValue({ success: true }),
  getAprobacionesJefatura: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getEvidenciasPTA: vi.fn().mockResolvedValue({ success: true, data: [] }),
  revisarEvidenciaPTA: vi.fn().mockResolvedValue({ success: true }),
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
