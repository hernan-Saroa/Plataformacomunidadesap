// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MacroDocenteReportView } from './MacroDocenteReportView';
import { apiClient } from '../services/api/apiClient';

vi.mock('../services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../utils/rundReportExport', () => ({
  exportRundReportToExcel: vi.fn(),
  exportRundReportToPDF: vi.fn(),
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function mockGet(impl: (endpoint: string, params?: any) => any) {
  (apiClient.get as any).mockImplementation(impl);
}

const HISTORIAL_ITEM = {
  docente_id: 'doc-1',
  docente_nombre: 'Ana Pérez',
  documento_identidad: '******7890',
  periodo: '2025-2',
  territorial: 'Bogotá',
  cetap: 'CETAP Centro',
  programa: 'Administración Pública',
  nucleo_tematico: 'Ciencias Sociales',
  asignatura_codigo: 'A1',
  asignatura_nombre: 'Gestión Pública',
  horas: 64,
  proteccion_datos: { acceso_completo: false, campos_sensibles: ['DOCUMENTO_IDENTIDAD'], campos_enmascarados: ['DOCUMENTO_IDENTIDAD'] },
};

describe('MacroDocenteReportView — historial nacional de asignaturas (REQ-RUND-F020/F022)', () => {
  it('exige al menos un docente o un período antes de permitir consultar', async () => {
    mockGet(async () => ({ items: [], total: 0, pages: 1 }));
    render(<MacroDocenteReportView />);

    const boton = await screen.findByRole('button', { name: /consultar macro docente/i });
    expect(boton).toBeDisabled();
  });

  it('consulta el historial con el período indicado y lo muestra en la tabla', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/macro-docente') || endpoint.includes('/macro-docente')) {
        return { items: [HISTORIAL_ITEM], total: 1, pages: 1 };
      }
      return { items: [], total: 0, pages: 1 };
    });

    render(<MacroDocenteReportView />);
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2025-2' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));

    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
    expect(screen.getByText(/1 asignatura/)).toBeInTheDocument();
  });

  it('muestra un error legible si el backend rechaza la consulta (p. ej. sin permiso pta.macro_docente.consultar)', async () => {
    mockGet(async () => {
      throw new Error('Acceso denegado');
    });
    const { toast } = await import('sonner');

    render(<MacroDocenteReportView />);
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2025-2' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('exportar a Excel/PDF incluye el documento (ya enmascarado por el backend) y los filtros aplicados como metadata', async () => {
    mockGet(async () => ({ items: [HISTORIAL_ITEM], total: 1, pages: 1 }));
    const { exportRundReportToExcel, exportRundReportToPDF } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2025-2' } });
    fireEvent.change(screen.getByLabelText('Territorial'), { target: { value: 'Bogotá' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    expect(exportRundReportToExcel).toHaveBeenCalledTimes(1);
    const [rows, columnas, meta, prefix] = (exportRundReportToExcel as any).mock.calls[0];
    expect(prefix).toBe('RUND_Macro_Docente_Historial');
    expect(meta.filtros['Período académico']).toBe('2025-2');
    expect(meta.filtros['Territorial']).toBe('Bogotá');
    // El documento viaja tal cual lo entregó el backend (ya enmascarado ahí); el frontend no lo vuelve a tocar.
    expect(columnas.map((c: any) => c.key)).toContain('documento_identidad');
    expect(rows[0].documento_identidad).toBe('******7890');

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(exportRundReportToPDF).toHaveBeenCalledTimes(1);
    expect((exportRundReportToPDF as any).mock.calls[0][3]).toBe('RUND_Macro_Docente_Historial');
  });

  it('no exporta y avisa cuando no hay resultados para el filtro aplicado', async () => {
    mockGet(async () => ({ items: [], total: 0, pages: 1 }));
    const { toast } = await import('sonner');
    const { exportRundReportToExcel } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2099-1' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    expect(exportRundReportToExcel).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalled();
  });
});
