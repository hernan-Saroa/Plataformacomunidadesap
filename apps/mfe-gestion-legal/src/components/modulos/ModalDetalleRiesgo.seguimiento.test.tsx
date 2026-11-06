import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const mocks = vi.hoisted(() => ({
  getHistorial: vi.fn(),
  getSeguimientos: vi.fn(),
  crearSeguimiento: vi.fn(),
  actualizarSeguimiento: vi.fn(),
  hasPermission: vi.fn(() => true),
}));

vi.mock('../../../../services/api/legal.service', () => ({
  riesgosService: {
    getHistorial: mocks.getHistorial,
    getSeguimientos: mocks.getSeguimientos,
    crearSeguimiento: mocks.crearSeguimiento,
    actualizarSeguimiento: mocks.actualizarSeguimiento,
    getEvidenciaSeguimientoUrl: (archivo: string, nombre: string) => `http://legal/files/download/${archivo}?name=${nombre}`,
  },
}));
vi.mock('../../../../services/api/authService', () => ({
  authService: { hasPermission: mocks.hasPermission, getCurrentUser: () => ({ fullName: 'Ana Ruiz' }) },
}));

import { toast } from 'sonner';
import { ModalDetalleRiesgo } from './ModalDetalleRiesgo';

const EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

const riesgo: any = {
  id: 'r-1', codigo: 'R-2026-006', nombre: 'Riesgo', descripcion: 'muchos responsables llegan tarde',
  proceso: 'Defensa Judicial', tipo: 'GESTION', etapa: 'IDENTIFICADO', estado: 'ACTIVO',
  probabilidadInherente: 2, impactoInherente: 2, zonaInherente: 'BAJO',
  probabilidadResidual: 1, impactoResidual: 2, zonaResidual: 'BAJO',
  causas: [], consecuencias: [], planTratamiento: [], responsable: 'Ana Ruiz',
  controlesExistentes: [{ id: 'c1', descripcion: 'tener un monitoreo constante con el abogado en cuestión', efectividad: 90 }],
};

const seguimiento = (extra: any = {}) => ({
  id: 's1', riesgoId: 'r-1', controlId: 'c1', vigencia: 2026, cuatrimestre: 2, cuatrimestreLabel: 'Cuatrimestre 2',
  fechaEjecucion: '2026-06-05', comentarios: 'Se revisó con el abogado', resultado: 'APLICADO_PARCIALMENTE', efectividad: 70,
  evidencias: [{ nombre: 'acta.pdf', archivo: 'abc.pdf', url: 'files/abc.pdf', tipo: 'pdf', tamano: 2048 }],
  responsable: 'Ana Ruiz', createdAt: '', updatedAt: '', editable: true, ...extra,
});

const vista = (conSeguimiento: boolean): any => ({
  vigencia: 2026, hoy: '2026-06-10', config: { maxMb: 10, extensiones: EXT },
  historial: conSeguimiento ? [seguimiento()] : [],
  controles: [{
    controlId: 'c1',
    descripcion: riesgo.controlesExistentes[0].descripcion,
    efectividad: conSeguimiento ? 70 : 90,
    cortes: [
      { cuatrimestre: 1, label: 'Cuatrimestre 1', inicio: '2026-01-01', fin: '2026-04-30', estado: 'VENCIDO', puedeRegistrar: false, seguimiento: null },
      { cuatrimestre: 2, label: 'Cuatrimestre 2', inicio: '2026-05-01', fin: '2026-08-31', estado: conSeguimiento ? 'REGISTRADO' : 'PENDIENTE', puedeRegistrar: true, seguimiento: conSeguimiento ? seguimiento() : null },
      { cuatrimestre: 3, label: 'Cuatrimestre 3', inicio: '2026-09-01', fin: '2026-12-31', estado: 'PENDIENTE', puedeRegistrar: false, seguimiento: null },
    ],
  }],
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn() as any;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })) as any;
});

async function abrirPestanaControles() {
  render(<ModalDetalleRiesgo open onClose={vi.fn()} riesgo={riesgo} />);
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Controles/i }), { button: 0 });
  await screen.findByTestId('control-c1');
}

describe('ModalDetalleRiesgo · seguimiento cuatrimestral de controles (EFDS-2416)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPermission.mockReturnValue(true);
    mocks.getHistorial.mockResolvedValue([]);
    mocks.getSeguimientos.mockResolvedValue(vista(false));
  });

  it('cada control muestra el botón Registrar seguimiento y el estado de cada cuatrimestre', async () => {
    await abrirPestanaControles();
    const tarjeta = screen.getByTestId('control-c1');
    expect(within(tarjeta).getByRole('button', { name: /Registrar seguimiento/i })).toBeEnabled();
    expect(within(tarjeta).getByText('Cuatrimestre 1')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Cuatrimestre 2')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Cuatrimestre 3')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Vencido')).toBeInTheDocument();
    expect(within(tarjeta).getAllByText('Pendiente')).toHaveLength(2);
    expect(within(tarjeta).getByText('90% efectivo')).toBeInTheDocument();
  });

  it('sin permiso de edición no se ofrece registrar seguimiento', async () => {
    mocks.hasPermission.mockReturnValue(false);
    await abrirPestanaControles();
    expect(screen.queryByRole('button', { name: /Registrar seguimiento/i })).not.toBeInTheDocument();
  });

  it('el formulario valida los obligatorios y la fecha no puede ser posterior a hoy', async () => {
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);

    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));
    expect(await screen.findByText(/fecha de ejecución es obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/comentarios \/ observaciones son obligatorios/i)).toBeInTheDocument();
    expect(screen.getByText(/Seleccione el resultado/i)).toBeInTheDocument();
    expect(screen.getByText(/porcentaje entero entre 0 y 100/i)).toBeInTheDocument();
    expect(mocks.crearSeguimiento).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-11' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));
    expect(await screen.findByText(/no puede ser posterior a la fecha actual/i)).toBeInTheDocument();
  });

  it('muestra el responsable cargado automáticamente y no envía una evidencia de tipo no permitido', async () => {
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);
    expect(screen.getByLabelText(/Responsable del seguimiento/i)).toHaveValue('Ana Ruiz');

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-05' } });
    fireEvent.change(screen.getByLabelText(/Efectividad evaluada/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/Resultado del control/i), { target: { value: 'APLICADO' } });
    fireEvent.change(screen.getByLabelText(/Comentarios/i), { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText(/^Evidencias/i), { target: { files: [new File(['x'], 'virus.exe')] } });
    expect(await screen.findByText(/tipo no permitido/i)).toBeInTheDocument();
    mocks.crearSeguimiento.mockResolvedValue(seguimiento());
    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));
    await waitFor(() => expect(mocks.crearSeguimiento).toHaveBeenCalledTimes(1));
    const fd = mocks.crearSeguimiento.mock.calls[0][2] as FormData;
    expect(fd.getAll('evidencias')).toHaveLength(0); // el .exe nunca llegó a la lista
  });

  it('una fecha futura o fuera del cuatrimestre muestra el error al escribirla y no se envía al guardar', async () => {
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-11' } });
    expect(await screen.findByText(/no puede ser posterior a la fecha actual/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-04-30' } });
    expect(await screen.findByText(/dentro del cuatrimestre/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-05' } });
    await waitFor(() => expect(screen.queryByText(/no puede ser posterior|dentro del cuatrimestre/i)).not.toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-11' } });
    fireEvent.change(screen.getByLabelText(/Efectividad evaluada/i), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Resultado del control/i), { target: { value: 'APLICADO' } });
    fireEvent.change(screen.getByLabelText(/Comentarios/i), { target: { value: 'QA-E2E fecha futura' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));
    expect(await screen.findByText(/no puede ser posterior a la fecha actual/i)).toBeInTheDocument();
    expect(mocks.crearSeguimiento).not.toHaveBeenCalled();
  });

  it('al elegir un archivo inválido el error sale de inmediato y el archivo no se agrega', async () => {
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);

    fireEvent.change(screen.getByLabelText(/^Evidencias/i), { target: { files: [new File(['MZ'], 'virus.exe')] } });
    expect(await screen.findByText(/"virus\.exe": tipo no permitido/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar virus\.exe/i })).not.toBeInTheDocument();

    const grande = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(grande, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText(/^Evidencias/i), { target: { files: [grande] } });
    expect(await screen.findByText(/"grande\.pdf": supera el tamaño máximo de 10 MB/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar grande\.pdf/i })).not.toBeInTheDocument();

    // Un archivo válido sí se agrega y limpia el error
    fireEvent.change(screen.getByLabelText(/^Evidencias/i), { target: { files: [new File(['x'], 'acta.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('button', { name: /Quitar acta\.pdf/i })).toBeInTheDocument();
    expect(screen.queryByText(/tipo no permitido|supera el tamaño/i)).not.toBeInTheDocument();
  });

  it('registra el seguimiento con evidencias, recarga el seguimiento y el Timeline', async () => {
    mocks.crearSeguimiento.mockResolvedValue(seguimiento());
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);

    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-05' } });
    fireEvent.change(screen.getByLabelText(/Efectividad evaluada/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/Resultado del control/i), { target: { value: 'APLICADO_PARCIALMENTE' } });
    fireEvent.change(screen.getByLabelText(/Comentarios/i), { target: { value: 'Se revisó con el abogado' } });
    fireEvent.change(screen.getByLabelText(/^Evidencias/i), { target: { files: [new File(['x'], 'acta.pdf', { type: 'application/pdf' })] } });

    mocks.getSeguimientos.mockResolvedValue(vista(true));
    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));

    await waitFor(() => expect(mocks.crearSeguimiento).toHaveBeenCalledTimes(1));
    const [riesgoId, controlId, fd] = mocks.crearSeguimiento.mock.calls[0] as [string, string, FormData];
    expect(riesgoId).toBe('r-1');
    expect(controlId).toBe('c1');
    expect(fd.get('cuatrimestre')).toBe('2');
    expect(fd.get('resultado')).toBe('APLICADO_PARCIALMENTE');
    expect(fd.get('efectividad')).toBe('70');
    expect((fd.getAll('evidencias')[0] as File).name).toBe('acta.pdf');

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Seguimiento registrado'));
    // Se recarga el seguimiento (y con él el % del control) y el Timeline
    await waitFor(() => expect(mocks.getSeguimientos).toHaveBeenCalledTimes(2));
    expect(mocks.getHistorial).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('70% efectivo')).toBeInTheDocument();
  });

  it('el % mostrado es el del último seguimiento y el historial permite descargar evidencias', async () => {
    mocks.getSeguimientos.mockResolvedValue(vista(true));
    await abrirPestanaControles();
    const tarjeta = screen.getByTestId('control-c1');
    expect(within(tarjeta).getByText('70% efectivo')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Registrado')).toBeInTheDocument();

    const enlace = within(tarjeta).getByRole('link', { name: /acta\.pdf/i });
    expect(enlace).toHaveAttribute('href', 'http://legal/files/download/abc.pdf?name=acta.pdf');
    expect(within(tarjeta).getByText(/Historial de seguimientos \(1\)/)).toBeInTheDocument();
  });

  it('un cuatrimestre registrado se edita (un seguimiento por control y cuatrimestre)', async () => {
    mocks.getSeguimientos.mockResolvedValue(vista(true));
    mocks.actualizarSeguimiento.mockResolvedValue(seguimiento({ efectividad: 60 }));
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Editar Cuatrimestre 2/i }));
    await screen.findByText(/Editar seguimiento del control/i);
    expect(screen.getByText(/se editará el existente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comentarios/i)).toHaveValue('Se revisó con el abogado');

    fireEvent.change(screen.getByLabelText(/Efectividad evaluada/i), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => expect(mocks.actualizarSeguimiento).toHaveBeenCalledTimes(1));
    const [, seguimientoId, fd] = mocks.actualizarSeguimiento.mock.calls[0] as [string, string, FormData];
    expect(seguimientoId).toBe('s1');
    expect(fd.get('efectividad')).toBe('60');
    expect(fd.get('evidenciasConservar')).toBe('["abc.pdf"]');
    expect(mocks.crearSeguimiento).not.toHaveBeenCalled();
  });

  it('un cuatrimestre cerrado queda en solo lectura (sin opción de editar)', async () => {
    const v = vista(true);
    v.controles[0].cortes[1].puedeRegistrar = false;
    v.controles[0].cortes[1].seguimiento.editable = false;
    mocks.getSeguimientos.mockResolvedValue(v);
    await abrirPestanaControles();
    expect(screen.queryByRole('button', { name: /Editar Cuatrimestre 2/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Cuatrimestre cerrado: solo lectura/i)).toBeInTheDocument();
  });

  it('si el seguimiento falla, muestra los controles del riesgo y permite reintentar', async () => {
    mocks.getSeguimientos.mockRejectedValueOnce(new Error('500'));
    render(<ModalDetalleRiesgo open onClose={vi.fn()} riesgo={riesgo} />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Controles/i }), { button: 0 });
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo cargar el seguimiento/i);
    expect(screen.getByText(/tener un monitoreo constante/i)).toBeInTheDocument();

    mocks.getSeguimientos.mockResolvedValue(vista(false));
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByTestId('control-c1')).toBeInTheDocument();
  });

  it('el servidor rechaza el guardado: se muestra el error y el formulario sigue abierto', async () => {
    mocks.crearSeguimiento.mockRejectedValue(new Error('El cuatrimestre 2 de 2026 está cerrado'));
    await abrirPestanaControles();
    fireEvent.click(screen.getByRole('button', { name: /Registrar seguimiento/i }));
    await screen.findByText(/Registrar seguimiento del control/i);
    fireEvent.change(screen.getByLabelText(/Fecha de ejecución/i), { target: { value: '2026-06-05' } });
    fireEvent.change(screen.getByLabelText(/Efectividad evaluada/i), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText(/Resultado del control/i), { target: { value: 'APLICADO' } });
    fireEvent.change(screen.getByLabelText(/Comentarios/i), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar seguimiento/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('El cuatrimestre 2 de 2026 está cerrado'));
    expect(screen.getByText(/Registrar seguimiento del control/i)).toBeInTheDocument();
  });

  it('Exportar incluye los seguimientos registrados', async () => {
    mocks.getSeguimientos.mockResolvedValue(vista(true));
    let blobExportado: Blob | null = null;
    (window.URL as any).createObjectURL = vi.fn((b: Blob) => { blobExportado = b; return 'blob:x'; });
    (window.URL as any).revokeObjectURL = vi.fn();
    render(<ModalDetalleRiesgo open onClose={vi.fn()} riesgo={riesgo} />);
    await waitFor(() => expect(mocks.getSeguimientos).toHaveBeenCalled());
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Controles/i }), { button: 0 });
    await screen.findByTestId('control-c1'); // el seguimiento ya está en el estado

    fireEvent.click(screen.getByRole('button', { name: /Exportar/i }));
    const texto = await new Promise<string>((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.readAsText(blobExportado as unknown as Blob);
    });
    expect(texto).toContain('SEGUIMIENTO DE CONTROLES (CUATRIMESTRAL)');
    expect(texto).toContain('Cuatrimestre 2 2026 · 05/06/2026 · Aplicado parcialmente · 70% · Ana Ruiz');
    expect(texto).toContain('Evidencias: acta.pdf');
  });
});
