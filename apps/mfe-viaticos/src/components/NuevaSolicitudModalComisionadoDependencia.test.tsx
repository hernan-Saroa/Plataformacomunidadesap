import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { Dependencia, Comisionado } from '../types/viaticos';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerDepartamentos: vi.fn().mockResolvedValue([]),
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
    obtenerTodasCiudades: vi.fn().mockResolvedValue([]),
    obtenerDependencias: vi.fn(),
    obtenerCargosPorDependencia: vi.fn().mockResolvedValue([]),
    listarCargos: vi.fn().mockResolvedValue([]),
    obtenerUsuarioActual: vi.fn(),
    obtenerParametrizacionFormulario: vi.fn().mockResolvedValue({ campos: [], configuraciones: {} }),
    consultarComisionado: vi.fn(),
    listarComisionados: vi.fn().mockResolvedValue([]),
    obtenerChecklistDocumentos: vi.fn().mockResolvedValue({ obligatorios: [], opcionales: [] }),
    actualizarSolicitud: vi.fn(),
    finalizarSolicitud: vi.fn(),
    obtenerSaldosTiquetes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    hasPermission: vi.fn(),
    getCurrentUser: vi.fn(),
    getCurrentUserSync: vi.fn(),
  },
}));

const mockDependencias: Dependencia[] = [
  {
    idDependencia: 1,
    idEmpresa: 1,
    codDependencia: 'DEP-001',
    nomDependencia: 'Subdirección de Gestión Corporativa',
    dirDependencia: null,
    dirEmail: null,
    urlDependencia: null,
    idGeopolitica: null,
    idSede: null,
    idCargo: null,
    idTercero: null,
    tipUnidad: null,
    genTipUnidad: null,
    descripcion: 'Gestión Corporativa',
    activo: true,
    creadoEn: '2026-01-01',
    actualizadoEn: '2026-01-01',
  },
  {
    idDependencia: 2,
    idEmpresa: 1,
    codDependencia: 'DEP-002',
    nomDependencia: 'Subdirección Académica',
    dirDependencia: null,
    dirEmail: null,
    urlDependencia: null,
    idGeopolitica: null,
    idSede: null,
    idCargo: null,
    idTercero: null,
    tipUnidad: null,
    genTipUnidad: null,
    descripcion: 'Académica',
    activo: true,
    creadoEn: '2026-01-01',
    actualizadoEn: '2026-01-01',
  },
];

const mockComisionadosDep1: Comisionado[] = [
  {
    id: 'com-dep1',
    numeroDocumento: '101010',
    primerNombre: 'Carlos',
    primerApellido: 'Pérez',
    email: 'carlos.perez@esap.edu.co',
    tipoComisionado: 'FUNCIONARIO',
    idDependencia: 1,
    cargo: 'PROFESIONAL ESPECIALIZADO',
    autorizacionHabeasData: true,
  },
];

const mockComisionadoDep2: Comisionado = {
  id: 'com-dep2',
  numeroDocumento: '202020',
  primerNombre: 'Ana',
  primerApellido: 'López',
  email: 'ana.lopez@esap.edu.co',
  tipoComisionado: 'FUNCIONARIO',
  idDependencia: 2,
  cargo: 'DOCENTE ASOCIADO',
  autorizacionHabeasData: true,
};

describe('NuevaSolicitudModal — Restricción de Comisionados por Dependencia para Enlaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viaticosService.obtenerDependencias).mockResolvedValue(mockDependencias);
    vi.mocked(viaticosService.listarComisionados).mockResolvedValue(mockComisionadosDep1);
  });

  it('un enlace de dependencia 1 que consulta un comisionado de otra dependencia (dep 2) recibe mensaje de bloqueo', async () => {
    // Configurar usuario Enlace de dependencia 1 (no admin)
    vi.mocked(authService.hasPermission).mockReturnValue(false);
    vi.mocked(authService.getCurrentUserSync).mockReturnValue({
      userId: 'enlace-1',
      username: 'enlace.corporativa',
      esAdmin: false,
      roles: ['ENLACE_DEPENDENCIA'],
    } as any);
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      userId: 'enlace-1',
      username: 'enlace.corporativa',
      roles: ['ENLACE_DEPENDENCIA'],
      person: {
        dependencia: {
          idDependencia: 1,
          codDependencia: 'DEP-001',
          nomDependencia: 'Subdirección de Gestión Corporativa',
        },
      },
    } as any);

    // Mock consultarComisionado retornando comisionado de dep 2
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue(mockComisionadoDep2);

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
        esSuperAdmin={false}
      />,
    );

    // Esperar a que cargue la dependencia del enlace y se muestre el banner
    await waitFor(() => {
      expect(screen.getByText(/Subdirección de Gestión Corporativa/i)).toBeDefined();
    });

    // Ingresar documento de un funcionario de otra dependencia (202020)
    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '202020' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    // Debe mostrarse el error indicando que pertenece a otra dependencia
    await waitFor(() => {
      expect(screen.getByText(/pertenece a otra dependencia/i)).toBeDefined();
    });

    // No debe aparecer la tarjeta verde de comisionado cargado
    expect(screen.queryByText(/Verificado/i)).toBeNull();
    expect(screen.queryByText(/Usuario Comisionado Activo/i)).toBeNull();
  });

  it('un enlace de dependencia 1 consulta un comisionado de su propia dependencia (dep 1) y carga exitosamente', async () => {
    vi.mocked(authService.hasPermission).mockReturnValue(false);
    vi.mocked(authService.getCurrentUserSync).mockReturnValue({
      userId: 'enlace-1',
      username: 'enlace.corporativa',
      esAdmin: false,
      roles: ['ENLACE_DEPENDENCIA'],
    } as any);
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      userId: 'enlace-1',
      username: 'enlace.corporativa',
      roles: ['ENLACE_DEPENDENCIA'],
      person: {
        dependencia: {
          idDependencia: 1,
          codDependencia: 'DEP-001',
          nomDependencia: 'Subdirección de Gestión Corporativa',
        },
      },
    } as any);

    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue(mockComisionadosDep1[0]);

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
        esSuperAdmin={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Subdirección de Gestión Corporativa/i)).toBeDefined();
    });

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '101010' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    // Debe cargar los datos del comisionado de la misma dependencia
    await waitFor(() => {
      expect(screen.getByText(/Carlos Pérez/i)).toBeDefined();
    });

    // No debe haber error
    expect(screen.queryByText(/pertenece a otra dependencia/i)).toBeNull();
  });

  it('un Super Admin puede consultar comisionados de cualquier dependencia sin restricción', async () => {
    vi.mocked(authService.hasPermission).mockReturnValue(true);
    vi.mocked(authService.getCurrentUserSync).mockReturnValue({
      userId: 'admin-1',
      username: 'superadmin',
      esAdmin: true,
      roles: ['SUPER_ADMIN'],
    } as any);
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      userId: 'admin-1',
      username: 'superadmin',
      roles: ['SUPER_ADMIN'],
      person: {
        dependencia: {
          idDependencia: 1,
          codDependencia: 'DEP-001',
          nomDependencia: 'Subdirección de Gestión Corporativa',
        },
      },
    } as any);

    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue(mockComisionadoDep2);

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
        esSuperAdmin={true}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '202020' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    // El admin sí puede consultar comisionados de cualquier dependencia
    await waitFor(() => {
      expect(screen.getByText(/Ana López/i)).toBeDefined();
    });

    expect(screen.queryByText(/pertenece a otra dependencia/i)).toBeNull();
  });
});
