// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MacroDocenteReportView } from './MacroDocenteReportView';
import { apiClient } from '../services/api/apiClient';

vi.mock('../services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../config/environment', () => ({
  getApiGatewayBaseUrl: () => 'http://localhost:3000',
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

const DOCENTE_OPCION = { docente_id: 'doc-1', nombre_completo: 'Ana Pérez', documento_identidad: '123456' };

async function seleccionarDocente(idSuffix = '') {
  const input = screen.getByPlaceholderText('Escriba al menos 3 letras…');
  fireEvent.change(input, { target: { value: 'Ana' } });
  const opcion = await screen.findByText('Ana Pérez');
  fireEvent.mouseDown(opcion);
  return idSuffix;
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

  it('usa el endpoint dedicado de consulta puntual (F022) cuando se fija docente y período', async () => {
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/banco-docentes')) return { items: [DOCENTE_OPCION], total: 1, pages: 1 };
      if (endpoint.endsWith('/macro-docente/consulta')) {
        expect(params).toEqual({ docenteId: 'doc-1', periodo: '2025-2' });
        return { items: [HISTORIAL_ITEM], total: 1 };
      }
      throw new Error(`No debería llamarse el listado general en modo consulta puntual: ${endpoint}`);
    });

    render(<MacroDocenteReportView />);
    await seleccionarDocente();
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2025-2' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));

    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 4, name: /consulta puntual/i })).toBeInTheDocument();
    // Sin paginación: el universo docente+período es naturalmente pequeño.
    expect(screen.queryByText(/página/i)).not.toBeInTheDocument();
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

describe('AccesosExternosPanel — acceso externo temporal auditado (REQ-RUND-F020/F022)', () => {
  const ACCESO_ACTIVO = {
    id: 'acceso-1', enteNombre: 'Procuraduría', docenteId: 'doc-1', activo: true, token: 'tok-123',
    otorgadoPor: 'ggp@esap.edu.co',
    fechaInicio: new Date(Date.now() - 86_400_000).toISOString(),
    fechaFin: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const BITACORA_ENTRY = {
    id: 'log-1', createdAt: new Date().toISOString(), tipoConsulta: 'EXTERNA', actorId: 'ENTE_EXTERNO:Procuraduría', periodo: '2025-2', totalResultados: 3,
  };

  it('carga los accesos otorgados y la bitácora al hacer clic en "Ver accesos y bitácora"', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/accesos-externos')) return { data: { accesos: [ACCESO_ACTIVO], bitacora: [BITACORA_ENTRY] } };
      return { items: [], total: 0, pages: 1 };
    });

    render(<MacroDocenteReportView />);
    fireEvent.click(screen.getByRole('button', { name: /ver accesos y bitácora/i }));

    await waitFor(() => expect(screen.getByText('Procuraduría')).toBeInTheDocument());
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('ENTE_EXTERNO:Procuraduría')).toBeInTheDocument();
  });

  it('exige ente, fechas y docente antes de crear un acceso externo', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/accesos-externos')) return { data: { accesos: [], bitacora: [] } };
      return { items: [], total: 0, pages: 1 };
    });
    const { toast } = await import('sonner');

    render(<MacroDocenteReportView />);
    fireEvent.click(screen.getByRole('button', { name: /ver accesos y bitácora/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /otorgar acceso/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /otorgar acceso/i }));
    expect(toast.error).toHaveBeenCalledWith('Ente, fecha de inicio y fecha de fin son obligatorios.');
    expect(apiClient.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/ente externo/i), { target: { value: 'Procuraduría' } });
    fireEvent.change(screen.getByLabelText('Vigente desde'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Vigente hasta'), { target: { value: '2025-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: /otorgar acceso/i }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Seleccione el docente'));
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('crea un acceso externo acotado a un docente con vigencia, y expone el enlace para copiar', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/banco-docentes')) return { items: [DOCENTE_OPCION], total: 1, pages: 1 };
      if (endpoint.endsWith('/accesos-externos')) return { data: { accesos: [ACCESO_ACTIVO], bitacora: [] } };
      return { items: [], total: 0, pages: 1 };
    });
    (apiClient.post as any).mockResolvedValue({ data: { token: 'tok-nuevo', enteNombre: 'Procuraduría' } });

    render(<MacroDocenteReportView />);
    fireEvent.click(screen.getByRole('button', { name: /ver accesos y bitácora/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /otorgar acceso/i })).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/ente externo/i), { target: { value: 'Procuraduría' } });
    const inputDocente = screen.getAllByPlaceholderText('Escriba al menos 3 letras…')[1];
    fireEvent.change(inputDocente, { target: { value: 'Ana' } });
    fireEvent.mouseDown(await screen.findByText('Ana Pérez'));
    fireEvent.change(screen.getByLabelText('Vigente desde'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Vigente hasta'), { target: { value: '2025-06-30' } });

    fireEvent.click(screen.getByRole('button', { name: /otorgar acceso/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/accesos-externos'),
      expect.objectContaining({ enteNombre: 'Procuraduría', docenteId: 'doc-1' }),
    ));
    const body = (apiClient.post as any).mock.calls[0][1];
    expect(new Date(body.fechaFin).getTime()).toBeGreaterThan(new Date(body.fechaInicio).getTime());
    await waitFor(() => expect(screen.getByText(/acceso creado para procuraduría/i)).toBeInTheDocument());
  });

  it('revoca un acceso externo activo', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/accesos-externos')) return { data: { accesos: [ACCESO_ACTIVO], bitacora: [] } };
      return { items: [], total: 0, pages: 1 };
    });

    render(<MacroDocenteReportView />);
    fireEvent.click(screen.getByRole('button', { name: /ver accesos y bitácora/i }));
    await waitFor(() => expect(screen.getByText('Procuraduría')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Revocar acceso'));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith(
      expect.stringContaining('/accesos-externos/acceso-1'),
    ));
  });
});
