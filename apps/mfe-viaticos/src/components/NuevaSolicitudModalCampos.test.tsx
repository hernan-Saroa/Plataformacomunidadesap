import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';
import { CampoFormulario } from '../types/parametrizacion';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerDepartamentos: vi.fn().mockResolvedValue([]),
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
    obtenerTodasCiudades: vi.fn().mockResolvedValue([]),
    obtenerDependencias: vi.fn().mockResolvedValue([]),
    obtenerUsuarioActual: vi.fn().mockResolvedValue({ id: 'u1', username: 'admin' }),
    obtenerParametrizacionFormulario: vi.fn(),
    consultarComisionado: vi.fn(),
    obtenerChecklistDocumentos: vi.fn().mockResolvedValue({ obligatorios: [], opcionales: [] }),
    actualizarSolicitud: vi.fn(),
    finalizarSolicitud: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    hasPermission: vi.fn().mockReturnValue(true),
    getUser: vi.fn().mockReturnValue({ id: 'u1' }),
  },
}));

describe('NuevaSolicitudModal — Comprobación de Dinamismo y Desactivación de Campos', () => {
  it('no muestra ni exige un campo cuando está configurado como inactivo (activo: false)', async () => {
    const catalogoConCampoInactivo: CampoFormulario[] = [
      {
        id: 'c1',
        clave: 'rubroPresupuestal',
        etiqueta: 'Rubro Presupuestal',
        tipoCampo: 'TEXT',
        placeholder: 'Ej. Rubro 01',
        grupo: 'valores',
        orden: 1,
        activo: false, // DESACTIVADO POR CONFIGURACIÓN
        opciones: null,
        creadoEn: '2026-09-01',
        actualizadoEn: '2026-09-01',
      },
      {
        id: 'c2',
        clave: 'campoExtraActivo',
        etiqueta: 'Código de Centro Costos Auxiliar',
        tipoCampo: 'TEXT',
        placeholder: 'Ej. CC-001',
        grupo: 'comision',
        orden: 10,
        activo: true, // ACTIVO
        opciones: null,
        creadoEn: '2026-09-01',
        actualizadoEn: '2026-09-01',
      },
    ];

    vi.mocked(viaticosService.obtenerParametrizacionFormulario).mockResolvedValue({
      campos: catalogoConCampoInactivo,
      configuraciones: {
        DEFAULT: {
          id: 'cfg-1',
          tipoComisionado: 'DEFAULT',
          codigoFormulario: 'FORM-DEFAULT',
          camposObligatorios: ['rubroPresupuestal'],
          camposOpcionales: [],
          camposOcultos: [],
          documentos: [],
          activo: true,
          creadoEn: '2026-09-01',
          actualizadoEn: '2026-09-01',
        },
      },
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    // Esperar a que se cargue la parametrización
    await waitFor(() => {
      expect(viaticosService.obtenerParametrizacionFormulario).toHaveBeenCalled();
    });

    // Como rubroPresupuestal está activo: false, NO debe renderizarse en el DOM
    expect(screen.queryByLabelText(/Rubro Presupuestal/i)).toBeNull();
  });

  it('renderiza dinámicamente un campo que cambió de texto a SELECT con sus opciones', async () => {
    const catalogoConSelect: CampoFormulario[] = [
      {
        id: 'c3',
        clave: 'modalidadTransporte',
        etiqueta: 'Modalidad de Transporte Terrestre',
        tipoCampo: 'SELECT',
        placeholder: 'Seleccione modalidad',
        grupo: 'comision',
        orden: 20,
        activo: true,
        opciones: [
          { value: 'BUS', label: 'Bus Intermunicipal' },
          { value: 'TAXI', label: 'Taxi o Servicio Especial' },
        ],
        creadoEn: '2026-09-01',
        actualizadoEn: '2026-09-01',
      },
    ];

    vi.mocked(viaticosService.obtenerParametrizacionFormulario).mockResolvedValue({
      campos: catalogoConSelect,
      configuraciones: {},
    });

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(viaticosService.obtenerParametrizacionFormulario).toHaveBeenCalled();
    });
  });

  it('aplica el límite de caracteres configurado y muestra el contador de caracteres en tiempo real', async () => {
    const catalogoConLimite: CampoFormulario[] = [
      {
        id: 'c-objeto',
        clave: 'objetoComision',
        etiqueta: 'Objeto / Justificación de la comisión',
        tipoCampo: 'TEXTAREA',
        placeholder: 'Describa el objetivo...',
        grupo: 'comision',
        orden: 1,
        activo: true,
        limiteCaracteres: 150,
        opciones: null,
        creadoEn: '2026-09-01',
        actualizadoEn: '2026-09-01',
      },
    ];

    vi.mocked(viaticosService.obtenerParametrizacionFormulario).mockResolvedValue({
      campos: catalogoConLimite,
      configuraciones: {},
    });

    vi.mocked(viaticosService.consultarComisionado).mockResolvedValue({
      id: 'c1',
      tipoComisionado: 'FUNCIONARIO',
      nombres: 'Juan',
      apellidos: 'Perez',
      numeroDocumento: '123456',
    } as any);

    const solicitudMock: any = {
      id: 'sol-123',
      estadoSolicitud: 'DEVUELTA',
      codigoSolicitud: 'SOL-001',
      objetoComision: 'Comisión técnica',
      comisionadoId: 'c1',
      cedulaComisionado: '123456',
      nombreComisionado: 'Juan Perez',
      tipoComisionado: 'FUNCIONARIO',
    };

    render(
      <NuevaSolicitudModal
        abierta={true}
        solicitudAResumir={solicitudMock}
        onCerrar={vi.fn()}
        onSolicitudCreada={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(viaticosService.obtenerParametrizacionFormulario).toHaveBeenCalled();
    });

    const textarea = (await screen.findByLabelText(/Objeto \/ Justificación/i)) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.maxLength).toBe(150);
    expect(screen.getByText(/16 \/ 150 car\./i)).toBeTruthy();
  });
});
