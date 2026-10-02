import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NuevaSolicitudModal from './NuevaSolicitudModal';
import viaticosService from '../services/api/viaticosService';

vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerDepartamentos: vi.fn().mockResolvedValue([]),
    obtenerCiudadesPorDepartamento: vi.fn().mockResolvedValue([]),
    obtenerTodasCiudades: vi.fn().mockResolvedValue([]),
    obtenerDependencias: vi.fn().mockResolvedValue([]),
    obtenerUsuarioActual: vi.fn().mockResolvedValue({ id: 'u1', username: 'admin' }),
    obtenerParametrizacionFormulario: vi.fn().mockResolvedValue({ campos: [], configuraciones: {} }),
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

describe('NuevaSolicitudModal — Alerta de Solicitudes Formato 023 Pendientes', () => {
  it('muestra la alerta y la lista de solicitudes pendientes en la parte superior del paso 1', async () => {
    const mockComisionadoConPendientes = {
      id: 'com-001',
      numeroDocumento: '1019283746',
      primerNombre: 'Carlos',
      primerApellido: 'Gómez',
      email: 'carlos.gomez@esap.edu.co',
      telefonoContacto: '3001234567',
      tipoComisionado: 'FUNCIONARIO',
      origenDatos: 'ESAP',
      autorizacionHabeasData: true,
      solicitudesPendientes: [
        {
          id: 'sol-023-1',
          consecutivoUnico: 'SOL-2026-0042',
          codigoSolicitud: 'SOL-2026-0042',
          estadoSolicitud: 'EN_VERIFICACION',
          destinoCiudad: 'Medellín',
          destinoDepartamento: 'Antioquia',
          fechaInicio: '2026-10-15',
          fechaFin: '2026-10-18',
          objetoComision: 'Auditoría presencial a sede territorial Antioquia',
          montoViaticos: 850000,
          montoGastosViaje: 150000,
          totalGeneral: 1000000,
          creadoEn: '2026-09-20T10:00:00Z',
        },
      ],
    };

    (viaticosService.consultarComisionado as any).mockResolvedValue(mockComisionadoConPendientes);

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={() => {}}
        onSolicitudCreada={() => {}}
      />,
    );

    const inputDoc = screen.getByLabelText(/Documento de Identidad/i);
    fireEvent.change(inputDoc, { target: { value: '1019283746' } });

    const btnConsultar = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(btnConsultar);

    await waitFor(() => {
      expect(screen.getByText(/Atención: El comisionado tiene solicitudes de Formato 023 pendientes/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/SOL-2026-0042/i)).toBeInTheDocument();
    expect(screen.getByText(/Auditoría presencial a sede territorial Antioquia/i)).toBeInTheDocument();
    expect(screen.getByText(/Medellín, Antioquia/i)).toBeInTheDocument();
    expect(screen.getByText(/1 solicitud en trámite/i)).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando el comisionado tiene contrato vencido', async () => {
    (viaticosService.consultarComisionado as any).mockRejectedValue(
      new Error('No es posible generar la solicitud de comisión. El comisionado tiene su contrato o vinculación laboral vencida con fecha 2024-12-31.'),
    );

    render(
      <NuevaSolicitudModal
        abierta={true}
        onCerrar={() => {}}
        onSolicitudCreada={() => {}}
      />,
    );

    const inputDoc = screen.getByLabelText(/Documento de Identidad/i);
    fireEvent.change(inputDoc, { target: { value: '99887766' } });

    const btnConsultar = screen.getByRole('button', { name: /Consultar/i });
    fireEvent.click(btnConsultar);

    await waitFor(() => {
      expect(screen.getByText(/vinculación laboral vencida/i)).toBeInTheDocument();
    });
  });
});

