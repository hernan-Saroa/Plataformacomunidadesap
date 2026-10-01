import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';
import { Dependencia, Cargo } from '../types/viaticos';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerDepartamentos: vi.fn().mockResolvedValue([]),
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
    obtenerTodasCiudades: vi.fn().mockResolvedValue([]),
    obtenerDependencias: vi.fn(),
    obtenerCargosPorDependencia: vi.fn(),
    listarCargos: vi.fn().mockResolvedValue([]),
    obtenerUsuarioActual: vi.fn().mockResolvedValue({ id: 'u1', username: 'admin' }),
    obtenerParametrizacionFormulario: vi.fn().mockResolvedValue({ campos: [], configuraciones: {} }),
    consultarComisionado: vi.fn(),
    obtenerChecklistDocumentos: vi.fn().mockResolvedValue({ obligatorios: [], opcionales: [] }),
    actualizarSolicitud: vi.fn(),
    finalizarSolicitud: vi.fn(),
    obtenerSaldosTiquetes: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/api/authService', () => ({
  authService: {
    hasPermission: vi.fn().mockReturnValue(true),
    getCurrentUser: vi.fn().mockResolvedValue({ userId: 'u1', username: 'admin', roles: ['SUPER_ADMIN'] }),
    getCurrentUserSync: vi.fn().mockReturnValue({ userId: 'u1', username: 'admin', esAdmin: true, roles: ['SUPER_ADMIN'] }),
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

const mockCargosDep1: Cargo[] = [
  {
    idCargo: 101,
    codCargo: 'CARG-001',
    nomCargo: 'DIRECTOR TÉCNICO',
    nivelJerarquico: 'DIRECTIVO',
    activo: true,
  },
  {
    idCargo: 102,
    codCargo: 'CARG-002',
    nomCargo: 'PROFESIONAL ESPECIALIZADO',
    nivelJerarquico: 'PROFESIONAL',
    activo: true,
  },
];

const mockCargosDep2: Cargo[] = [
  {
    idCargo: 201,
    codCargo: 'CARG-003',
    nomCargo: 'DOCENTE ASOCIADO',
    nivelJerarquico: 'DOCENTE',
    activo: true,
  },
];

describe('NuevaSolicitudModal — Dependencia x Cargo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viaticosService.obtenerDependencias).mockResolvedValue(mockDependencias);
    vi.mocked(viaticosService.obtenerCargosPorDependencia).mockImplementation(async (idDep) => {
      if (Number(idDep) === 1) return mockCargosDep1;
      if (Number(idDep) === 2) return mockCargosDep2;
      return [];
    });
  });

  it('consulta los cargos de la dependencia cuando el comisionado pertenece a idDependencia 1', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-1',
      numeroDocumento: '12345678',
      primerNombre: 'Carlos',
      primerApellido: 'Pérez',
      email: 'carlos@esap.edu.co',
      telefonoContacto: '3001234567',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      idDependencia: 1,
      cargo: 'PROFESIONAL ESPECIALIZADO',
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    // Escribir cédula y consultar
    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '12345678' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    // Debe consultar cargos de la dependencia 1
    await waitFor(() => {
      expect(viaticosService.obtenerCargosPorDependencia).toHaveBeenCalledWith(1);
    });

    // Se debe renderizar el bloque de Asignación Organizacional
    expect(screen.getByText(/Asignación Organizacional \(Dependencia y Cargo\)/i)).toBeDefined();

    // El cargo predeterminado del comisionado debe estar visible
    await waitFor(() => {
      expect(screen.getAllByText(/PROFESIONAL ESPECIALIZADO/i).length).toBeGreaterThan(0);
    });
  });

  it('permite cambiar la dependencia y recarga los cargos correspondientes a la nueva dependencia', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-2',
      numeroDocumento: '87654321',
      primerNombre: 'María',
      primerApellido: 'Gómez',
      email: 'maria@esap.edu.co',
      telefonoContacto: '3109876543',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      idDependencia: 1,
      cargo: 'DIRECTOR TÉCNICO',
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '87654321' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    await waitFor(() => {
      expect(viaticosService.obtenerCargosPorDependencia).toHaveBeenCalledWith(1);
    });

    // En el Paso 1 es informativo; avanzar al Paso 2 para configurar y cambiar el cargo
    const btnContinuar = screen.getByRole('button', { name: /Guardar y Continuar/i });
    fireEvent.click(btnContinuar);

    // En el Paso 2, abrir el selector de cargo/dependencia
    const btnCambiarCargo = screen.getByRole('button', { name: /Cambiar cargo/i });
    fireEvent.click(btnCambiarCargo);

    // Abrir el selector de dependencia y cambiar a Subdirección Académica (id 2)
    const depSelectBtn = document.getElementById('dependencia-asignada-select');
    expect(depSelectBtn).not.toBeNull();
    fireEvent.click(depSelectBtn!);

    await waitFor(() => {
      expect(screen.getByText('Subdirección Académica')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Subdirección Académica'));

    // Debe llamar a obtenerCargosPorDependencia con id 2
    await waitFor(() => {
      expect(viaticosService.obtenerCargosPorDependencia).toHaveBeenCalledWith(2);
    });
  });
});
