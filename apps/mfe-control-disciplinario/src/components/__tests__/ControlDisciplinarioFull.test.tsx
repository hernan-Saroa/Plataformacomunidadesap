import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ControlDisciplinarioFull } from '../ControlDisciplinarioFull';

// Mock all external dependencies
vi.mock('../../services/api/authService', () => ({
  authService: {
    hasPermission: vi.fn(() => true),
    getCurrentUser: vi.fn(() => ({ id: '1', fullName: 'Test User' })),
  },
}));

vi.mock('../../services/api/disciplinary.service', () => ({
  disciplinaryService: {
    getAllAutos: vi.fn(() => Promise.resolve([
      {
        id: 'auto-123',
        estado: 'REVISION_JEFE',
        tipo: 'AUTO_INHIBITORIO',
        currentVersion: 1,
        createdAt: '2024-01-01T00:00:00Z',
        process: {
          radicadoProceso: 'P-120-2025',
          abogadoAsignadoNombre: 'Juan Carlos Pérez',
          etapaActual: 'Indagación Preliminar',
          news: { disciplinable: { nombre: 'Juan Pérez Gómez' } }
        },
        comentarios: 'Comentarios del auto'
      }
    ])),
    getAllReassignmentRequests: vi.fn(() => Promise.resolve([])),
    getPendingReassignmentRequests: vi.fn(() => Promise.resolve([])),
    aprobarAuto: vi.fn(() => Promise.resolve()),
    devolverAuto: vi.fn(() => Promise.resolve()),
    approveReassignmentRequest: vi.fn(() => Promise.resolve({
      id: '1',
      status: 'APROBADA',
      currentProfessional: { nombre: 'Old Pro' },
      newProfessional: { nombre: 'New Pro', cargo: 'Cargo', especialidad: 'Esp', procesosAsignados: 5 },
      process: { radicadoProceso: 'P-123', etapaActual: 'Etapa', news: { disciplinable: { nombre: 'Denunciado' } } },
      requestedBy: 'Requester',
      createdAt: '2023-01-01',
      justification: 'Justif',
      priority: 'NORMAL',
      resolvedAt: null,
      jefeObservations: 'Obs',
      rejectionReason: null,
    })),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('../../shared/ModuleLayout', () => ({
  ModuleLayout: ({ children, menuItems, activeSection, onSectionChange }: any) => (
    <div data-testid="module-layout">
      <nav>
        {menuItems.map((item: any) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            data-testid={`menu-${item.id}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {children}
    </div>
  ),
}));

// Mock sub-components
vi.mock('../GestionProfesionalesWorldClass', () => ({
  GestionProfesionalesWorldClass: ({ onVerProcesos }: any) => (
    <div data-testid="gestion-profesionales" onClick={() => onVerProcesos?.({ id: '1' })}>
      GestionProfesionalesWorldClass
    </div>
  ),
}));

vi.mock('../ModuloConfiguracionPremium', () => ({
  ModuloConfiguracionPremium: () => <div data-testid="modulo-configuracion">ModuloConfiguracionPremium</div>,
}));

vi.mock('../RevisionAprobacionJefe', () => ({
  RevisionAprobacionJefe: ({ borradores, onAprobar }: any) => (
    <div data-testid="revision-aprobacion">
      RevisionAprobacionJefe - {borradores.length} borradores
      {borradores.map((borrador: any) => (
        <button
          key={borrador.id}
          data-testid={`aprobar-btn-${borrador.id}`}
          onClick={() => onAprobar(borrador.id, 'Comentarios')}
        >
          Aprobar {borrador.id}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../ExpedientesElectronicosWorldClass', () => ({
  ExpedientesElectronicosWorldClass: () => <div data-testid="expedientes-electronicos">ExpedientesElectronicosWorldClass</div>,
}));

vi.mock('../GestionTerminosAlertas', () => ({
  GestionTerminosAlertas: () => <div data-testid="gestion-terminos">GestionTerminosAlertas</div>,
}));

vi.mock('../DashboardKanbanOperativo', () => ({
  DashboardKanbanOperativo: ({ onEnviarARevision, onNavigateToRevision }: any) => (
    <div data-testid="dashboard-kanban">
      DashboardKanbanOperativo
      <button onClick={() => onEnviarARevision({ id: 'b1', titulo: 'Test' })}>Enviar a Revision</button>
      <button onClick={onNavigateToRevision}>Navigate to Revision</button>
    </div>
  ),
}));

describe('ControlDisciplinarioFull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with default dashboard section', async () => {
    render(<ControlDisciplinarioFull />);

    await waitFor(() => {
      expect(screen.getByTestId('module-layout')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-kanban')).toBeInTheDocument();
    });
  });

  it('changes section when menu item is clicked', async () => {
    render(<ControlDisciplinarioFull />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-kanban')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('menu-aprobacion'));

    await waitFor(() => {
      expect(screen.getByTestId('revision-aprobacion')).toBeInTheDocument();
    });
  });

  it('handles aprobar borrador correctly', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');

    render(<ControlDisciplinarioFull />);

    fireEvent.click(screen.getByTestId('menu-aprobacion'));

    await waitFor(() => {
      expect(screen.getByTestId('revision-aprobacion')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('aprobar-btn-auto-auto-123'));

    await waitFor(() => {
      expect(disciplinaryService.aprobarAuto).toHaveBeenCalledWith('auto-123', '1');
    });
  });

  it('loads autos on mount', async () => {
    const { disciplinaryService } = await import('../../services/api/disciplinary.service');

    render(<ControlDisciplinarioFull />);

    await waitFor(() => {
      expect(disciplinaryService.getAllAutos).toHaveBeenCalled();
      expect(disciplinaryService.getAllReassignmentRequests).toHaveBeenCalled();
    });
  });

  it('navigates to dashboard when viewing professional processes', async () => {
    render(<ControlDisciplinarioFull />);

    fireEvent.click(screen.getByTestId('menu-profesionales'));

    await waitFor(() => {
      expect(screen.getByTestId('gestion-profesionales')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('gestion-profesionales'));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-kanban')).toBeInTheDocument();
    });
  });
});