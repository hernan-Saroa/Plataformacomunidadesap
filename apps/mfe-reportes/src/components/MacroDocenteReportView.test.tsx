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
      if (endpoint.endsWith('/macro-docente/opciones')) return {};
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
    await waitFor(() => expect(exportRundReportToExcel).toHaveBeenCalledTimes(1));
    const [rows, columnas, meta, prefix] = (exportRundReportToExcel as any).mock.calls[0];
    expect(prefix).toBe('RUND_Macro_Docente_Historial');
    expect(meta.filtros['Período académico']).toBe('2025-2');
    expect(meta.filtros['Territorial']).toBe('Bogotá');
    // El documento viaja tal cual lo entregó el backend (ya enmascarado ahí); el frontend no lo vuelve a tocar.
    expect(columnas.map((c: any) => c.key)).toContain('documento_identidad');
    expect(rows[0].documento_identidad).toBe('******7890');

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportRundReportToPDF).toHaveBeenCalledTimes(1));
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

describe('MacroDocenteReportView — catálogo de filtros y exportación completa (EFDS-1364 v2)', () => {
  const fila = (n: number) => ({ ...HISTORIAL_ITEM, asignatura_codigo: `A${n}`, asignatura_nombre: `Asignatura ${n}` });

  it('al abrir carga los períodos con historial, deja el más reciente seleccionado y habilita la consulta', async () => {
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/macro-docente/opciones')) {
        return params?.periodo
          ? { periodos: ['2026-2', '2025-1'], territoriales: ['Bogotá', 'Cali'], cetaps: ['CETAP Centro'], programas: ['Administración Pública'], nucleosTematicos: ['Ciencias Sociales'] }
          : { periodos: ['2026-2', '2025-1'], territoriales: [], cetaps: [], programas: [], nucleosTematicos: [] };
      }
      return { items: [], total: 0, pages: 1 };
    });

    render(<MacroDocenteReportView />);

    // El campo pasa de texto libre a lista desplegable cuando llega el catálogo: se vuelve a consultar el elemento.
    await waitFor(() => expect((screen.getByLabelText('Período académico') as HTMLSelectElement).value).toBe('2026-2'));
    const periodo = screen.getByLabelText('Período académico') as HTMLSelectElement;
    expect(Array.from(periodo.options).map((o) => o.value)).toEqual(['', '2026-2', '2025-1']);
    expect(screen.getByRole('button', { name: /consultar macro docente/i })).toBeEnabled();

    const territorial = (await screen.findByLabelText('Territorial')) as HTMLSelectElement;
    await waitFor(() => expect(Array.from(territorial.options).map((o) => o.value)).toEqual(['', 'Bogotá', 'Cali']));
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/macro-docente/opciones'), { periodo: '2026-2' });
  });

  it('exporta TODAS las filas del filtro aplicado aunque el listado tenga varias páginas', async () => {
    const pagina = (n: number) => (n === 1
      ? { items: [fila(1), fila(2)], total: 3, pages: 2 }
      : { items: [fila(3)], total: 3, pages: 2 });
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/macro-docente/opciones')) return { periodos: ['2026-2'], territoriales: [], cetaps: [], programas: [], nucleosTematicos: [] };
      return pagina(params?.limit === 200 ? params.page : 1);
    });
    const { exportRundReportToExcel } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    await waitFor(() => expect((screen.getByLabelText('Período académico') as HTMLSelectElement).value).toBe('2026-2'));
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Asignatura 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportRundReportToExcel).toHaveBeenCalledTimes(1));
    const [rows, , meta] = (exportRundReportToExcel as any).mock.calls[0];
    expect(rows.map((r: any) => r.asignatura_codigo)).toEqual(['A1', 'A2', 'A3']);
    expect(meta.totalRegistros).toBe(3);
    expect(meta.filtros['Período académico']).toBe('2026-2');
  });

  it('avisa si falla la exportación completa y no genera archivo', async () => {
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/macro-docente/opciones')) return {};
      if (params?.limit === 200) throw new Error('timeout');
      return { items: [fila(1)], total: 3, pages: 2 };
    });
    const { toast } = await import('sonner');
    const { exportRundReportToPDF } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2026-2' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Asignatura 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo exportar el historial', expect.anything()));
    expect(exportRundReportToPDF).not.toHaveBeenCalled();
  });
});

describe('MacroDocenteReportView — bordes del catálogo y de los filtros (EFDS-1364 v2)', () => {
  const CAT = (extra: any = {}) => ({ periodos: ['2027-1', '2026-2'], territoriales: [], cetaps: [], programas: [], nucleosTematicos: [], ...extra });

  it('si el catálogo falla avisa y deja los filtros como texto libre para no bloquear la consulta', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/macro-docente/opciones')) throw new Error('catálogo caído');
      return { items: [HISTORIAL_ITEM], total: 1, pages: 1 };
    });
    const { toast } = await import('sonner');

    render(<MacroDocenteReportView />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo cargar el catálogo de filtros del Macro Docente', expect.anything()));

    const periodo = screen.getByLabelText('Período académico');
    expect(periodo.tagName).toBe('INPUT');
    fireEvent.change(periodo, { target: { value: '2025-2' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
  });

  it('al cambiar de período descarta la selección de territorial que ya no existe en el nuevo catálogo', async () => {
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/macro-docente/opciones')) {
        if (params?.periodo === '2027-1') return CAT({ territoriales: ['Bogotá', 'Cali'] });
        if (params?.periodo === '2026-2') return CAT({ territoriales: ['Medellín'] });
        return CAT();
      }
      return { items: [], total: 0, pages: 1 };
    });

    render(<MacroDocenteReportView />);
    await waitFor(() => expect((screen.getByLabelText('Territorial') as HTMLSelectElement).options.length).toBe(3));
    fireEvent.change(screen.getByLabelText('Territorial'), { target: { value: 'Cali' } });
    expect((screen.getByLabelText('Territorial') as HTMLSelectElement).value).toBe('Cali');

    fireEvent.change(screen.getByLabelText('Período académico'), { target: { value: '2026-2' } });
    await waitFor(() => expect(Array.from((screen.getByLabelText('Territorial') as HTMLSelectElement).options).map((o) => o.value)).toEqual(['', 'Medellín']));
    expect((screen.getByLabelText('Territorial') as HTMLSelectElement).value).toBe('');
  });

  it('envía al backend los filtros elegidos en las listas y los muestra como metadata del export', async () => {
    mockGet(async (endpoint: string, params?: any) => {
      if (endpoint.endsWith('/macro-docente/opciones')) return CAT({ territoriales: ['Bogotá', 'Cali'], cetaps: ['CETAP Cali'], programas: ['Prog A'], nucleosTematicos: ['Núcleo 1'] });
      return { items: [HISTORIAL_ITEM], total: 1, pages: 1 };
    });
    const { exportRundReportToPDF } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    await waitFor(() => expect((screen.getByLabelText('CETAP') as HTMLSelectElement).options.length).toBe(2));
    fireEvent.change(screen.getByLabelText('Territorial'), { target: { value: 'Cali' } });
    fireEvent.change(screen.getByLabelText('CETAP'), { target: { value: 'CETAP Cali' } });
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'Prog A' } });
    fireEvent.change(screen.getByLabelText('Núcleo temático'), { target: { value: 'Núcleo 1' } });
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/macro-docente$/),
      { periodo: '2027-1', territorial: 'Cali', cetap: 'CETAP Cali', programa: 'Prog A', nucleoTematico: 'Núcleo 1', page: 1, limit: 25 },
    );
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(exportRundReportToPDF).toHaveBeenCalledTimes(1));
    expect((exportRundReportToPDF as any).mock.calls[0][2].filtros).toEqual({
      'Docente': undefined, 'Período académico': '2027-1', 'Territorial': 'Cali', 'CETAP': 'CETAP Cali', 'Programa': 'Prog A', 'Núcleo temático': 'Núcleo 1',
    });
  });

  it('«Limpiar filtros» oculta los resultados y deshabilita la consulta hasta elegir de nuevo', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/macro-docente/opciones')) return CAT();
      return { items: [HISTORIAL_ITEM], total: 1, pages: 1 };
    });

    render(<MacroDocenteReportView />);
    await waitFor(() => expect((screen.getByLabelText('Período académico') as HTMLSelectElement).value).toBe('2027-1'));
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    await waitFor(() => expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /consultar macro docente/i })).toBeDisabled();
  });

  it('con una sola página exporta lo que ya tiene sin volver a consultar al backend', async () => {
    mockGet(async (endpoint: string) => {
      if (endpoint.endsWith('/macro-docente/opciones')) return CAT();
      return { items: [HISTORIAL_ITEM], total: 1, pages: 1 };
    });
    const { exportRundReportToExcel } = await import('../utils/rundReportExport');

    render(<MacroDocenteReportView />);
    await waitFor(() => expect((screen.getByLabelText('Período académico') as HTMLSelectElement).value).toBe('2027-1'));
    fireEvent.click(screen.getByRole('button', { name: /consultar macro docente/i }));
    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
    const llamadasAntes = (apiClient.get as any).mock.calls.filter((c: any[]) => !String(c[0]).endsWith('/opciones')).length;

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    await waitFor(() => expect(exportRundReportToExcel).toHaveBeenCalledTimes(1));
    const llamadasDespues = (apiClient.get as any).mock.calls.filter((c: any[]) => !String(c[0]).endsWith('/opciones')).length;
    expect(llamadasDespues).toBe(llamadasAntes);
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
