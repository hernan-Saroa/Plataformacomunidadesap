import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PresupuestoInbox from './PresupuestoInbox';

const mockPresupuestoData = {
  success: true,
  data: [
    {
      id: 'sol-001',
      codigo: 'COM-2026-0001',
      consecutivoUnico: 'COM-2026-0001',
      estado: 'EN_PRESUPUESTO',
      objeto: 'Capacitación territorial',
      ciudadDestino: 'Cali',
      departamentoDestino: 'Valle del Cauca',
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-05',
      diasComision: 5,
      montoTotal: 1100000,
      totalComision: 1100000,
      enviadoPresupuesto: true,
      fechaEnvioPresupuesto: '2026-10-25T10:00:00Z',
      nombreComisionado: 'Laura Rodríguez',
      cedulaComisionado: '1098765432',
      dependencia: 'Subdirección de Gestión Corporativa',
      comisionado: {
        id: 'com-001',
        numeroDocumento: '1098765432',
        primerNombre: 'Laura',
        primerApellido: 'Rodríguez',
        tipoComisionado: 'FUNCIONARIO',
      },
    },
    {
      id: 'sol-002',
      codigo: 'COM-2026-0002',
      consecutivoUnico: 'COM-2026-0002',
      estado: 'COMPROMETIDA',
      objeto: 'Auditoría regional',
      ciudadDestino: 'Bucaramanga',
      departamentoDestino: 'Santander',
      fechaInicio: '2026-11-10',
      fechaFin: '2026-11-12',
      diasComision: 3,
      montoTotal: 650000,
      totalComision: 650000,
      codigoRp: '2026-10-26_RP_54321',
      numeroRp: '54321',
      fechaRp: '2026-10-26',
      valorComprometido: 650000,
      rubroRp: 'C-01-02-03-Viáticos',
      modalidadPago: 'AVANCE',
      diasHabilesPrevios: 7,
      nombreComisionado: 'Carlos Martínez',
      cedulaComisionado: '79123456',
      dependencia: 'Dirección de Gestión Integral',
      comisionado: {
        id: 'com-002',
        numeroDocumento: '79123456',
        primerNombre: 'Carlos',
        primerApellido: 'Martínez',
        tipoComisionado: 'CONTRATISTA',
      },
    },
  ],
  total: 2,
  kpis: {
    pendientesRp: 1,
    comprometidas: 1,
    totalComprometido: 650000,
  },
  page: 1,
  limit: 20,
};

vi.mock('../services/api/viaticosService', () => {
  const service = {
    obtenerBandejaPresupuesto: vi.fn(),
    expedirRp: vi.fn(),
    cargaMasivaRp: vi.fn(),
    mapearSolicitudLista: vi.fn((s: any) => ({
      id: s.id,
      codigo: s.codigo || s.consecutivoUnico,
      nombreComisionado: s.nombreComisionado,
      cedulaComisionado: s.cedulaComisionado,
      dependencia: s.dependencia,
      cargo: 'Profesional',
      ciudadDestino: s.ciudadDestino,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      diasComision: s.diasComision,
      montoTotal: s.montoTotal,
      estado: s.estado,
      numeroRp: s.numeroRp,
      fechaRp: s.fechaRp,
      valorComprometido: s.valorComprometido,
      rubroRp: s.rubroRp,
      codigoRp: s.codigoRp,
      modalidadPago: s.modalidadPago,
      diasHabilesPrevios: s.diasHabilesPrevios,
    })),
  };
  return {
    default: service,
    viaticosService: service,
  };
});

vi.mock('../services/api/authService', () => ({
  default: {
    canExpedirRp: vi.fn(() => true),
    isPresupuesto: vi.fn(() => true),
  },
  authService: {
    canExpedirRp: vi.fn(() => true),
    isPresupuesto: vi.fn(() => true),
  },
}));

import viaticosService from '../services/api/viaticosService';

describe('PresupuestoInbox — [Etapa 7] RF-PRE-001', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (viaticosService.obtenerBandejaPresupuesto as any).mockResolvedValue(mockPresupuestoData);
  });

  it('renderiza la bandeja de presupuesto con KPIs y lista de comisiones', async () => {
    render(<PresupuestoInbox />);

    expect(screen.getByText(/Bandeja del Grupo de Presupuesto/i)).toBeDefined();
    expect(screen.getByText(/Etapa 7 · RF-PRE-001/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
      expect(screen.getByText('COM-2026-0002')).toBeDefined();
      expect(screen.getByText('Laura Rodríguez')).toBeDefined();
      expect(screen.getByText('Carlos Martínez')).toBeDefined();
    });
  });

  it('permite filtrar por estado (Pendientes RP vs Comprometidas)', async () => {
    render(<PresupuestoInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
    });

    const botonComprometidas = screen.getByRole('button', { name: /Comprometidas/i });
    fireEvent.click(botonComprometidas);

    await waitFor(() => {
      expect(viaticosService.obtenerBandejaPresupuesto).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'COMPROMETIDA',
        }),
      );
    });
  });

  it('abre el modal de Registrar RP al hacer clic en el botón de la fila correspondiente', async () => {
    render(<PresupuestoInbox />);

    await waitFor(() => {
      expect(screen.getByText('COM-2026-0001')).toBeDefined();
    });

    const botonExpedir = screen.getByRole('button', { name: /Registrar RP|Expedir RP/i });
    fireEvent.click(botonExpedir);

    await waitFor(() => {
      expect(screen.getByText(/Registrar Registro Presupuestal \(RP\)|Expedir Registro Presupuestal/i)).toBeDefined();
    });
  });

  it('abre el modal de Carga Masiva de RP al hacer clic en el botón superior', async () => {
    render(<PresupuestoInbox />);

    const botonCargaMasiva = screen.getByRole('button', { name: /Carga Masiva de RPs/i });
    fireEvent.click(botonCargaMasiva);

    await waitFor(() => {
      expect(screen.getByText(/Procesamiento transaccional de plantilla/i)).toBeDefined();
      expect(screen.getByText(/Descargar Plantilla CSV/i)).toBeDefined();
    });
  });

  it('RF-PRE-003: renderiza la columna Modalidad de Pago y el badge de AVANCE con días hábiles disponibles', async () => {
    render(<PresupuestoInbox />);

    await waitFor(() => {
      expect(screen.getByText('Modalidad de Pago')).toBeDefined();
      expect(screen.getByText('AVANCE')).toBeDefined();
      expect(screen.getByText(/7 días hábiles disponibles/i)).toBeDefined();
    });
  });
});
