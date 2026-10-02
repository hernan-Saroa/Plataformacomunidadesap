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
    subirDocumento: vi.fn(),
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
];

const mockCargos: Cargo[] = [
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

describe('NuevaSolicitudModal — Cuentas Bancarias y Cargos con Salario Relacional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(viaticosService.obtenerDependencias).mockResolvedValue(mockDependencias);
    vi.mocked(viaticosService.obtenerCargosPorDependencia).mockResolvedValue(mockCargos);
  });

  it('muestra el historial de cuentas bancarias y preselecciona la cuenta principal', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-1',
      numeroDocumento: '1098765432',
      primerNombre: 'Ana',
      primerApellido: 'Martínez',
      email: 'ana.martinez@esap.edu.co',
      telefonoContacto: '3110000000',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      idDependencia: 1,
      cargo: 'DIRECTOR TÉCNICO',
      salarioBasico: 7500000,
      cuentasBancarias: [
        {
          id: 'cta-1',
          banco: 'BANCOLOMBIA',
          tipoCuenta: 'AHORROS',
          numeroCuenta: '9876543210',
          urlCertificadoBancario: 'https://storage.esap.edu.co/cert-bancolombia.pdf',
          esPrincipal: true,
        },
        {
          id: 'cta-2',
          banco: 'DAVIVIENDA',
          tipoCuenta: 'CORRIENTE',
          numeroCuenta: '1234567890',
          urlCertificadoBancario: null,
          esPrincipal: false,
        },
      ],
      cargos: [
        {
          id: 'crg-1',
          cargo: 'DIRECTOR TÉCNICO',
          salario: 7500000,
          esPrincipal: true,
        },
        {
          id: 'crg-2',
          cargo: 'ASESOR DE DIRECCIÓN',
          salario: 6800000,
          esPrincipal: false,
        },
      ],
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '1098765432' } });

    const btnConsultar = screen.getByRole('button', { name: /consultar/i });
    fireEvent.click(btnConsultar);

    // Debe mostrar ambas cuentas bancarias guardadas en modo informativo (Paso 1)
    await waitFor(() => {
      expect(screen.getByText('BANCOLOMBIA')).toBeDefined();
      expect(screen.getByText('DAVIVIENDA')).toBeDefined();
      expect(screen.getByText('9876543210')).toBeDefined();
      expect(screen.getByText('1234567890')).toBeDefined();
    });

    // Muestra badge de cuentas guardadas e indicación de informativo
    expect(screen.getByText(/2 guardada\(s\)/i)).toBeDefined();
    expect(screen.getAllByText(/Informativo · Paso 1/i).length).toBeGreaterThan(0);

    // En Paso 1 NO debe existir la opción de registrar otra cuenta ni modificar datos
    expect(screen.queryByRole('button', { name: /\+ Registrar otra cuenta bancaria/i })).toBeNull();

    // En el Paso 1, el salario del cargo DIRECTOR TÉCNICO se muestra de manera informativa
    expect(screen.getAllByText(/7\.500\.000/i).length).toBeGreaterThan(0);

    // Avanzar al Paso 2 con "Guardar y Continuar"
    const btnContinuar = screen.getByRole('button', { name: /Guardar y Continuar/i });
    fireEvent.click(btnContinuar);

    // En Paso 2 se despliegan los chips de cuentas registradas del comisionado para autocompletar
    await waitFor(() => {
      expect(screen.getByText(/Cuentas registradas del comisionado:/i)).toBeDefined();
    });

    // En Paso 2 NO se debe solicitar la certificación bancaria como soporte (se solicita en Paso 3)
    expect(screen.queryByText(/Certificación Bancaria \(Soporte PDF\)/i)).toBeNull();

    // Cambiar a la otra cuenta (Davivienda) en Paso 2 al hacer clic en el botón de cuenta
    const btnDavivienda = screen.getByRole('button', { name: /DAVIVIENDA/i });
    expect(btnDavivienda).toBeDefined();
    fireEvent.click(btnDavivienda);
  });

  it('si no hay cuenta bancaria registrada, Paso 1 indica que no se ha registrado y en Paso 2 no se duplican formularios ni se pide certificado', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-sin-cuenta',
      numeroDocumento: '77889900',
      primerNombre: 'Carlos',
      primerApellido: 'Gómez',
      email: 'carlos@esap.edu.co',
      telefonoContacto: '3109998877',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      idDependencia: 1,
      cargo: 'PROFESIONAL ESPECIALIZADO',
      salarioBasico: 4800000,
      cuentasBancarias: [],
      cargos: [
        {
          id: 'crg-1',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4800000,
          esPrincipal: true,
        },
      ],
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '77889900' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar/i }));

    // En Paso 1 debe indicar claramente que NO se ha registrado cuenta bancaria
    await waitFor(() => {
      expect(screen.getByText(/No se ha registrado cuenta bancaria para este comisionado/i)).toBeDefined();
    });

    // En Paso 1 no hay campos editables ni botones para registrar
    expect(screen.queryByPlaceholderText(/Ej\. 1234567890/i)).toBeNull();

    // Avanzar al Paso 2
    const btnContinuar = screen.getByRole('button', { name: /Guardar y Continuar/i });
    fireEvent.click(btnContinuar);

    // En Paso 2 NO se debe pedir el certificado soporte (se solicita en Paso 3)
    await waitFor(() => {
      expect(screen.queryByText(/Certificación Bancaria \(Soporte PDF\)/i)).toBeNull();
    });
    // No hay formulario duplicado de registro de cuenta
    expect(screen.queryByText(/Nueva Cuenta Bancaria del Comisionado/i)).toBeNull();
  });

  it('permite cambiar entre los cargos históricos y sincroniza el salario relacional', async () => {
    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-2',
      numeroDocumento: '55667788',
      primerNombre: 'Pedro',
      primerApellido: 'López',
      email: 'pedro@esap.edu.co',
      telefonoContacto: '3123456789',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      idDependencia: 1,
      cargo: 'DIRECTOR TÉCNICO',
      salarioBasico: 7500000,
      cuentasBancarias: [],
      cargos: [
        {
          id: 'crg-1',
          cargo: 'DIRECTOR TÉCNICO',
          salario: 7500000,
          esPrincipal: true,
        },
        {
          id: 'crg-2',
          cargo: 'PROFESIONAL ESPECIALIZADO',
          salario: 4800000,
          esPrincipal: false,
        },
      ],
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '55667788' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar/i }));

    // Paso 1 es informativo; avanzar al Paso 2 donde se decide y configura el cargo y salario
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar y Continuar/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Continuar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Cargos previos:/i)).toBeDefined();
    });

    const salarioInput = document.getElementById('salario-cargo-relacional') as HTMLInputElement;
    expect(salarioInput.value).toBe('7.500.000');

    // Cambiar al cargo PROFESIONAL ESPECIALIZADO usando el botón rápido
    const chipProf = screen.getByRole('button', { name: /PROFESIONAL ESPECIALIZADO/i });
    fireEvent.click(chipProf);

    // El salario relacional debe actualizarse a 4.800.000
    await waitFor(() => {
      expect(salarioInput.value).toBe('4.800.000');
    });

    // Modificar manualmente el salario relacional
    fireEvent.change(salarioInput, { target: { value: '5200000' } });
    expect(salarioInput.value).toBe('5.200.000');
  });

  it('inicializa obligacion_tributaria en false por defecto sin requerir click y deseleccionar, evitando null', async () => {
    vi.mocked(viaticosService.obtenerParametrizacionFormulario).mockResolvedValue({
      campos: [
        {
          id: 1,
          nombreCampo: 'obligacion_tributaria',
          etiqueta: 'Esta obligado a facturación electronica',
          tipoCampo: 'BOOLEAN',
          seccion: 'comision',
          requerido: false,
          orden: 1,
          activo: true,
        },
      ],
      configuraciones: {},
    });

    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'com-1',
      numeroDocumento: '1098765432',
      primerNombre: 'Ana',
      primerApellido: 'Martínez',
      email: 'ana.martinez@esap.edu.co',
      telefonoContacto: '3110000000',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      esFacturadorElectronico: false,
      idDependencia: 1,
      cargo: 'DIRECTOR TÉCNICO',
      salarioBasico: 7500000,
      cuentasBancarias: [],
      cargos: [],
    });

    vi.mocked(viaticosService.actualizarSolicitud).mockResolvedValue({
      id: 'sol-123',
    } as any);

    render(
      <NuevaSolicitudModal
        abierta={true}
        solicitudId="sol-123"
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    const inputDoc = screen.getByPlaceholderText(/1019283746/i);
    fireEvent.change(inputDoc, { target: { value: '1098765432' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar/i }));

    // Paso 1: Al dar Guardar y Continuar avanza a Paso 2
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar y Continuar/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Continuar/i }));

    // Paso 2: Verificar el checkbox de facturación electrónica
    await waitFor(() => {
      expect(screen.getByText(/Esta obligado a facturación electronica/i)).toBeDefined();
    });

    const checkbox = screen.getByRole('checkbox', {
      name: /Esta obligado a facturación electronica/i,
    }) as HTMLInputElement;

    // El checkbox debe estar en false por defecto sin requerir seleccionarlo y deseleccionarlo
    expect(checkbox.checked).toBe(false);

    // Al interactuar con el checkbox
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

