import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsolidacionExpediente from './ConsolidacionExpediente';
import viaticosService from '../services/api/viaticosService';
import { SolicitudComisionResponse } from '../types/viaticos';

/**
 * Mock del servicio: la consolidación consume el backend como fuente de verdad
 * (previsualización de integridad + envío transaccional).
 */
vi.mock('../services/api/viaticosService', () => ({
  __esModule: true,
  default: {
    obtenerResumenConsolidacion: vi.fn(),
    consolidarSolicitud: vi.fn(),
    subirDocumento: vi.fn(),
  },
}));

const solicitudBase = (overrides: Partial<SolicitudComisionResponse> = {}): SolicitudComisionResponse => ({
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  comisionadoId: 'com-001',
  comisionado: {
    id: 'com-001',
    numeroDocumento: '123456789',
    primerNombre: 'Juan',
    segundoNombre: '',
    primerApellido: 'Suárez',
    segundoApellido: '',
    email: 'juan@esap.edu.co',
    telefonoContacto: '3001234567',
    tipoComisionado: 'FUNCIONARIO',
    origenDatos: 'HUMANO',
    autorizacionHabeasData: true,
  },
  destinoCiudad: 'Ibagué',
  destinoDepartamento: 'Tolima',
  fechaInicio: new Date('2026-10-01T00:00:00'),
  fechaFin: new Date('2026-10-05T00:00:00'),
  objetoComision: 'Comision institucional',
  prioridad: 'ALTA',
  rubroPresupuestal: 'Rubro 01',
  requiereTiquetes: true,
  montoViaticos: 700000,
  montoGastosViaje: 100000,
  diasComision: 5,
  estadoSolicitud: 'RADICADA',
  tipoComision: 'TERRESTRE',
  esInternacional: false,
  radicadoFueraJornada: false,
  extemporanea: false,
  creadoPorUsuarioId: 'user-001',
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  documentosSoporte: [],
  ...overrides,
});

const resumenCompleto = {
  solicitudId: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'RADICADA',
  esConsolidable: true,
  requiereEstado: ['RADICADA', 'EXTEMPORANEA', 'DEVUELTA'],
  errores: [],
  items: [],
  documentos: [{ codigo: 'CDP', nombre: 'CDP', cargado: true, pdf: true }],
};

const resumenIncompleto = {
  ...resumenCompleto,
  esConsolidable: false,
  errores: ['Falta documento obligatorio: RUT'],
  documentos: [
    { codigo: 'CDP', nombre: 'CDP', cargado: true, pdf: true },
    { codigo: 'RUT', nombre: 'RUT', cargado: false, pdf: false },
  ],
};

describe('ConsolidacionExpediente — Paso 4: Resumen de Expediente y Envío (RF-LIQ-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viaticosService.subirDocumento = vi.fn().mockResolvedValue({});
  });

  it('debe deshabilitar el envío y mostrar las tareas pendientes cuando el expediente está incompleto', async () => {
    viaticosService.obtenerResumenConsolidacion = vi.fn().mockResolvedValue(resumenIncompleto);

    render(
      <ConsolidacionExpediente
        solicitud={solicitudBase()}
        onConsolidada={vi.fn()}
        onCerrar={vi.fn()}
      />,
    );

    // El checklist muestra el RUT como faltante y el botón queda deshabilitado.
    await screen.findByText(/Tareas pendientes antes del envío/i);
    expect(screen.getByText(/Falta documento obligatorio: RUT/i)).toBeInTheDocument();

    const boton = screen.getByRole('button', {
      name: /Radicar y Enviar a Revisión/i,
    });
    expect(boton).toBeDisabled();

    // No se debe disparar el envío con pendientes.
    expect(viaticosService.consolidarSolicitud).not.toHaveBeenCalled();
  });

  it('debe permitir el envío cuando el expediente está completo y mostrar la pantalla de éxito con el consecutivo', async () => {
    viaticosService.obtenerResumenConsolidacion = vi.fn().mockResolvedValue(resumenCompleto);
    viaticosService.consolidarSolicitud = vi.fn().mockResolvedValue({
      success: true,
      id: 'sol-001',
      consecutivoUnico: 'COM-2026-0001',
      estadoAnterior: 'RADICADA',
      estadoSolicitud: 'SOLICITADO',
      mensaje: 'Consolidado',
    });
    const onConsolidada = vi.fn();

    render(
      <ConsolidacionExpediente
        solicitud={solicitudBase()}
        onConsolidada={onConsolidada}
        onCerrar={vi.fn()}
      />,
    );

    const boton = await screen.findByRole('button', {
      name: /Radicar y Enviar a Revisión/i,
    });
    expect(boton).toBeEnabled();

    fireEvent.click(boton);

    // Pantalla de éxito con confeti y consecutivo COM-2026-XXXX.
    await screen.findByText(/¡Expediente Consolidado con éxito!/i);
    expect(screen.getByText(/COM-2026-0001/i)).toBeInTheDocument();
    expect(viaticosService.consolidarSolicitud).toHaveBeenCalledWith('sol-001');
    expect(onConsolidada).not.toHaveBeenCalled();
  });

  it('debe notificar al padre cuando el usuario finaliza desde la pantalla de éxito', async () => {
    viaticosService.obtenerResumenConsolidacion = vi.fn().mockResolvedValue(resumenCompleto);
    viaticosService.consolidarSolicitud = vi.fn().mockResolvedValue({
      success: true,
      id: 'sol-001',
      consecutivoUnico: 'COM-2026-0001',
      estadoAnterior: 'RADICADA',
      estadoSolicitud: 'SOLICITADO',
      mensaje: 'Consolidado',
    });
    const onConsolidada = vi.fn();
    const onCerrar = vi.fn();

    render(
      <ConsolidacionExpediente
        solicitud={solicitudBase()}
        onConsolidada={onConsolidada}
        onCerrar={onCerrar}
      />,
    );

    const boton = await screen.findByRole('button', {
      name: /Radicar y Enviar a Revisión/i,
    });
    fireEvent.click(boton);

    await waitFor(() =>
      expect(screen.getByText(/Ir a mis solicitudes/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText(/Ir a mis solicitudes/i));

    expect(onConsolidada).toHaveBeenCalledWith(
      expect.objectContaining({
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
      }),
    );
    expect(onCerrar).toHaveBeenCalled();
  });
});
