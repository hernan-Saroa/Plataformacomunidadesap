import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// El módulo importa legalService/authService (usados por el componente principal y sus
// modales hijos); se mockean para que los tests no dependan del backend real. Los métodos
// quedan como spies (vi.fn) reconfigurables por test vía vi.mocked(...).mockResolvedValue(...).
vi.mock('../../../../services/api/legal.service', () => ({
  legalService: {
    getTerminosListado: vi.fn(),
    eliminarTermino: vi.fn(),
    updateTermino: vi.fn(),
  },
}));
vi.mock('../../../../services/api/authService', () => ({
  authService: { hasRole: vi.fn(() => false), getCurrentUser: vi.fn(() => null) },
}));

import { VistaLista, VistaTimeline, ModuloTerminosInformesV3, formatearFuenteInformativa } from './ModuloTerminosInformesV3';
import { SolicitudInforme } from '../core/types';
import { PermisosProvider } from '../config/PermisosContext';
import { ConfiguracionesSIGLProvider } from '../config/ConfiguracionesSIGLContext';
import { legalService } from '../../../../services/api/legal.service';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

function crearSolicitud(overrides: Partial<SolicitudInforme> = {}): SolicitudInforme {
  return {
    id: 'TERM-2026-0001',
    etapa: 'RECIBIDA',
    tipoInforme: 'MANUAL',
    enteSolicitante: 'Contraloría',
    radicadoExterno: 'N/A',
    asunto: 'Informe de contabilidad — septiembre 2026',
    responsable: 'Luis Ramírez Torres',
    fechaSolicitud: new Date('2026-08-01'),
    fechaVencimiento: new Date('2026-09-10'),
    diasTotales: 30,
    diasRestantes: 10,
    ...overrides,
  } as SolicitudInforme;
}

describe('formatearFuenteInformativa', () => {
  it('devuelve "Sin especificar" cuando no hay fundamento normativo', () => {
    expect(formatearFuenteInformativa(undefined)).toBe('Sin especificar');
    expect(formatearFuenteInformativa([])).toBe('Sin especificar');
  });

  it('formatea una sola fuente como "tipo: cita"', () => {
    expect(formatearFuenteInformativa([{ tipo: 'Resolución', cita: 'Res. 123 de 2024' }]))
      .toBe('Resolución: Res. 123 de 2024');
  });

  it('une múltiples fuentes con "; "', () => {
    const resultado = formatearFuenteInformativa([
      { tipo: 'Resolución', cita: 'Res. 123 de 2024' },
      { tipo: 'Contrato', cita: 'Contrato N° 45' },
    ]);
    expect(resultado).toBe('Resolución: Res. 123 de 2024; Contrato: Contrato N° 45');
  });
});

describe('VistaLista · Calendario de Vencimientos', () => {
  it('reemplaza "Tipo de Actividad" por "Nombre de Informe" e incluye Destinatario y Fuente Informativa', () => {
    render(<VistaLista solicitudes={[crearSolicitud()]} onVerDetalle={vi.fn()} />);

    expect(screen.getByText('Nombre de Informe')).toBeInTheDocument();
    expect(screen.getByText('Destinatario de Informe')).toBeInTheDocument();
    expect(screen.getByText('Fuente Informativa')).toBeInTheDocument();
    expect(screen.queryByText('Tipo de Actividad')).not.toBeInTheDocument();
  });

  it('muestra el destinatario y la fuente informativa de la solicitud', () => {
    render(
      <VistaLista
        solicitudes={[
          crearSolicitud({
            destinatario: 'Contaduría General de la Nación',
            fundamentoNormativo: [{ tipo: 'Resolución', cita: 'Res. 123 de 2024' }],
          }),
        ]}
        onVerDetalle={vi.fn()}
      />,
    );

    expect(screen.getByText('Contaduría General de la Nación')).toBeInTheDocument();
    expect(screen.getByText('Resolución: Res. 123 de 2024')).toBeInTheDocument();
  });

  it('usa valores por defecto cuando no hay destinatario ni fuente informativa registrados', () => {
    render(<VistaLista solicitudes={[crearSolicitud()]} onVerDetalle={vi.fn()} />);

    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getByText('Sin especificar')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// Regresión: bug "Eliminar Término" muestra el toast de éxito pero el registro no desaparece.
//
// Causa raíz #1 (colisión de identidad): el radicado visible (solicitud.id, ej. "PD-2024-046")
// no es único por término — dos términos de módulos distintos pueden compartir el mismo
// numeroRadicado. El módulo padre resolvía el UUID real re-buscando `solicitudes.find(s =>
// s.id === idClicado)`, que podía resolver siempre al primer coincidente, eliminando/archivando
// un registro distinto al que el usuario veía en pantalla. El fix pasa el UUID real
// (solicitud.metadata?.uuid) directamente desde el punto de clic, sin volver a buscar por el id
// visible. Estos tests fijan ese contrato en VistaLista y VistaTimeline.
// ---------------------------------------------------------------------------------------------
describe('VistaLista / VistaTimeline · onEliminar/onArchivar deben usar el UUID real, no el radicado visible', () => {
  it('VistaLista → Eliminar: llama a onEliminar con metadata.uuid, no con el id visible', async () => {
    const user = userEvent.setup();
    const onEliminar = vi.fn();
    render(
      <VistaLista
        solicitudes={[crearSolicitud({ id: 'PD-2024-046', metadata: { uuid: 'uuid-real-123' } })]}
        onVerDetalle={vi.fn()}
        onEliminar={onEliminar}
      />,
    );

    await user.click(screen.getByTitle('Eliminar'));

    expect(onEliminar).toHaveBeenCalledWith('uuid-real-123');
    expect(onEliminar).not.toHaveBeenCalledWith('PD-2024-046');
  });

  it('VistaLista → Archivar: llama a onArchivar con metadata.uuid, no con el id visible', async () => {
    const user = userEvent.setup();
    const onArchivar = vi.fn();
    render(
      <VistaLista
        solicitudes={[crearSolicitud({ id: 'PD-2024-046', metadata: { uuid: 'uuid-real-456' } })]}
        onVerDetalle={vi.fn()}
        onArchivar={onArchivar}
      />,
    );

    await user.click(screen.getByTitle('Archivar (Cumplido)'));

    expect(onArchivar).toHaveBeenCalledWith('uuid-real-456');
  });

  it('VistaLista: sin metadata.uuid, cae de vuelta al id visible (compatibilidad con datos incompletos)', async () => {
    const user = userEvent.setup();
    const onEliminar = vi.fn();
    render(
      <VistaLista
        solicitudes={[crearSolicitud({ id: 'SIN-UUID-001' })]}
        onVerDetalle={vi.fn()}
        onEliminar={onEliminar}
      />,
    );

    await user.click(screen.getByTitle('Eliminar'));

    expect(onEliminar).toHaveBeenCalledWith('SIN-UUID-001');
  });

  it('VistaTimeline: con dos términos que comparten el mismo radicado, cada botón Eliminar resuelve su propio UUID', async () => {
    const user = userEvent.setup();
    const onEliminar = vi.fn();
    render(
      <VistaTimeline
        solicitudes={[
          crearSolicitud({
            id: 'PD-2024-046',
            asunto: 'Auto de avocamiento',
            metadata: { uuid: 'uuid-primero' },
            fechaVencimiento: new Date('2026-01-01'),
          }),
          crearSolicitud({
            id: 'PD-2024-046',
            asunto: 'Requerimiento de otro módulo, mismo radicado',
            metadata: { uuid: 'uuid-segundo' },
            fechaVencimiento: new Date('2026-06-01'),
          }),
        ]}
        onVerDetalle={vi.fn()}
        onEliminar={onEliminar}
      />,
    );

    const botones = screen.getAllByTitle('Eliminar término');
    expect(botones).toHaveLength(2);

    await user.click(botones[1]);

    expect(onEliminar).toHaveBeenCalledWith('uuid-segundo');
    expect(onEliminar).not.toHaveBeenCalledWith('uuid-primero');
    expect(onEliminar).not.toHaveBeenCalledWith('PD-2024-046');
  });

  it('VistaTimeline → Archivar: llama a onArchivar con metadata.uuid, no con el id visible', async () => {
    const user = userEvent.setup();
    const onArchivar = vi.fn();
    render(
      <VistaTimeline
        solicitudes={[crearSolicitud({ id: 'PD-2024-046', metadata: { uuid: 'uuid-archivar-789' } })]}
        onVerDetalle={vi.fn()}
        onArchivar={onArchivar}
      />,
    );

    await user.click(screen.getByTitle('Archivar (marcar como Cumplido)'));

    expect(onArchivar).toHaveBeenCalledWith('uuid-archivar-789');
  });
});

// ---------------------------------------------------------------------------------------------
// Regresión end-to-end del bug reportado: "Al eliminar un término desde el Timeline de
// Vencimientos, aparece el toast 'Término eliminado' pero el registro sigue en el listado y los
// contadores/total no se actualizan". Monta el módulo completo (no solo la sub-vista) para
// probar la cadena real: clic en Eliminar → modal de confirmación → llamada al backend →
// refetch → re-render de la lista y de "Mostrando X de Y solicitudes".
// ---------------------------------------------------------------------------------------------
function crearTerminoBackend(overrides: Record<string, any> = {}) {
  return {
    id: 'uuid-default',
    numeroRadicado: 'PD-2024-000',
    estado: 'PENDIENTE',
    origenModulo: 'MANUAL',
    enteSolicitante: 'Contraloría',
    destinatario: '',
    fundamentoNormativo: [],
    nombreActuacion: 'Actuación de prueba',
    observaciones: '',
    responsableNombre: 'Luis Ramírez',
    responsableId: null,
    fechaBase: '2026-08-01T00:00:00.000Z',
    fechaVencimiento: '2026-09-10T00:00:00.000Z',
    diasTermino: 30,
    calculo: { diasRestantes: 10 },
    ...overrides,
  };
}

async function montarYEsperarCarga() {
  render(
    <PermisosProvider>
      <ConfiguracionesSIGLProvider>
        <ModuloTerminosInformesV3 />
      </ConfiguracionesSIGLProvider>
    </PermisosProvider>,
  );
  await waitFor(() => expect(legalService.getTerminosListado).toHaveBeenCalled());
}

/** Localiza la fila del Timeline que muestra `texto` (el radicado) y acota la búsqueda a esa
 * fila — con varios registros en pantalla, cada uno tiene su propio botón "Eliminar término"/
 * "Archivar", así que buscarlos sin acotar (getByTitle a secas) es ambiguo. */
function filaTimelineConTexto(texto: string): HTMLElement {
  const nodo = screen.getByText(texto);
  const fila = nodo.closest('.relative.pl-8.pb-4.border-l-2') as HTMLElement | null;
  if (!fila) throw new Error(`No se encontró la fila del Timeline para "${texto}"`);
  return fila;
}

describe('ModuloTerminosInformesV3 · Eliminar término desde el Timeline de Vencimientos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // vi.clearAllMocks() no vacía la cola de valores encadenados con mockResolvedValueOnce()
    // de un test anterior que no llegó a consumirlos todos; mockReset() sí lo hace.
    vi.mocked(legalService.getTerminosListado).mockReset();
    vi.mocked(legalService.eliminarTermino).mockReset();
    vi.mocked(legalService.updateTermino).mockReset();
  });

  it('al confirmar la eliminación, el registro desaparece del Timeline y "Mostrando X de Y" se recalcula', async () => {
    const user = userEvent.setup();
    const critico = crearTerminoBackend({
      id: 'uuid-critico',
      numeroRadicado: 'PD-2024-046',
      nombreActuacion: 'Auto de avocamiento',
      estado: 'VENCIDO',
      calculo: { diasRestantes: -123 },
    });
    const enTermino = crearTerminoBackend({ id: 'uuid-en-termino', numeroRadicado: 'PD-2024-050', calculo: { diasRestantes: 10 } });
    const urgente = crearTerminoBackend({ id: 'uuid-urgente', numeroRadicado: 'PD-2024-051', calculo: { diasRestantes: 3 } });

    vi.mocked(legalService.getTerminosListado)
      .mockResolvedValueOnce([critico, enTermino, urgente])
      // Tras el DELETE, el backend (con el fix de findAll()) ya no devuelve el eliminado.
      .mockResolvedValueOnce([enTermino, urgente]);
    vi.mocked(legalService.eliminarTermino).mockResolvedValue(undefined);

    await montarYEsperarCarga();

    await waitFor(() => expect(screen.getByText('PD-2024-046')).toBeInTheDocument());
    expect(screen.getByText('Mostrando 3 de 3 solicitudes')).toBeInTheDocument();

    await user.click(within(filaTimelineConTexto('PD-2024-046')).getByTitle('Eliminar término'));
    await user.click(await screen.findByRole('button', { name: /Sí, Eliminar/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Término eliminado'));
    expect(legalService.eliminarTermino).toHaveBeenCalledWith('uuid-critico');

    await waitFor(() => expect(screen.queryByText('PD-2024-046')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Mostrando 2 de 2 solicitudes')).toBeInTheDocument());
  });

  it('si el DELETE falla en el backend, no debe mostrarse el toast de éxito ni desaparecer el registro', async () => {
    const user = userEvent.setup();
    const critico = crearTerminoBackend({ id: 'uuid-critico', numeroRadicado: 'PD-2024-046', calculo: { diasRestantes: -123 } });
    const enTermino = crearTerminoBackend({ id: 'uuid-en-termino', numeroRadicado: 'PD-2024-050', calculo: { diasRestantes: 10 } });

    vi.mocked(legalService.getTerminosListado).mockResolvedValue([critico, enTermino]);
    vi.mocked(legalService.eliminarTermino).mockRejectedValue(new Error('backend caído'));

    await montarYEsperarCarga();

    await waitFor(() => expect(screen.getByText('PD-2024-046')).toBeInTheDocument());
    expect(screen.getByText('Mostrando 2 de 2 solicitudes')).toBeInTheDocument();

    await user.click(within(filaTimelineConTexto('PD-2024-046')).getByTitle('Eliminar término'));
    await user.click(await screen.findByRole('button', { name: /Sí, Eliminar/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error al eliminar término'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText('PD-2024-046')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 solicitudes')).toBeInTheDocument();
    // No se dispara un refetch tras un DELETE fallido: solo la carga inicial.
    expect(legalService.getTerminosListado).toHaveBeenCalledTimes(1);
  });

  it('con dos términos que comparten el mismo radicado, eliminar uno no elimina ni afecta al otro', async () => {
    const user = userEvent.setup();
    const compartidoA = crearTerminoBackend({
      id: 'uuid-a',
      numeroRadicado: 'PD-2024-046',
      nombreActuacion: 'Auto de avocamiento',
      calculo: { diasRestantes: -123 },
      fechaVencimiento: '2026-01-01T00:00:00.000Z',
    });
    const compartidoB = crearTerminoBackend({
      id: 'uuid-b',
      numeroRadicado: 'PD-2024-046',
      nombreActuacion: 'Requerimiento de otro módulo',
      calculo: { diasRestantes: 20 },
      fechaVencimiento: '2026-06-01T00:00:00.000Z',
    });

    vi.mocked(legalService.getTerminosListado)
      .mockResolvedValueOnce([compartidoA, compartidoB])
      .mockResolvedValueOnce([compartidoB]);
    vi.mocked(legalService.eliminarTermino).mockResolvedValue(undefined);

    await montarYEsperarCarga();

    await waitFor(() => expect(screen.getAllByText('PD-2024-046')).toHaveLength(2));

    const botonesEliminar = screen.getAllByTitle('Eliminar término');
    expect(botonesEliminar).toHaveLength(2);

    await user.click(botonesEliminar[0]);
    await user.click(await screen.findByRole('button', { name: /Sí, Eliminar/i }));

    await waitFor(() => expect(legalService.eliminarTermino).toHaveBeenCalledWith('uuid-a'));
    expect(legalService.eliminarTermino).not.toHaveBeenCalledWith('uuid-b');
  });
});

// ---------------------------------------------------------------------------------------------
// Regresión: el Excel exportado no incluía el título del reporte en el encabezado, a diferencia
// del PDF (que sí lo tiene). Este test monta el módulo completo, dispara la exportación real a
// Excel (mockeando solo la descarga vía window.URL.createObjectURL) y relee el .xlsx generado
// con ExcelJS para verificar que la fila 1 contiene el mismo título que el PDF.
// ---------------------------------------------------------------------------------------------
describe('ModuloTerminosInformesV3 · Exportar a Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(legalService.getTerminosListado).mockReset();
  });

  it('el Excel exportado incluye el título del reporte en el encabezado, igual que el PDF', async () => {
    const user = userEvent.setup();
    vi.mocked(legalService.getTerminosListado).mockResolvedValue([
      crearTerminoBackend({ id: 'uuid-1', numeroRadicado: 'PD-2024-100' }),
    ]);

    // jsdom no implementa Blob.arrayBuffer(), así que capturamos el ArrayBuffer directamente
    // del constructor de Blob en lugar de leerlo de vuelta desde el objeto Blob.
    let excelBufferCapturado: ArrayBuffer | null = null;
    const OriginalBlob = window.Blob;
    window.Blob = vi.fn((parts: BlobPart[], options?: BlobPropertyBag) => {
      excelBufferCapturado = parts[0] as ArrayBuffer;
      return new OriginalBlob(parts, options);
    }) as unknown as typeof Blob;
    window.URL.createObjectURL = vi.fn(() => '#');
    window.URL.revokeObjectURL = vi.fn();

    await montarYEsperarCarga();

    await user.click(screen.getAllByText('Exportar')[0]);
    await user.click(await screen.findByText('Excel'));

    await waitFor(() => expect(excelBufferCapturado).not.toBeNull());

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(excelBufferCapturado!) as unknown as ArrayBuffer);
    const worksheet = workbook.getWorksheet('Términos e Informes')!;

    expect(worksheet.getCell(1, 1).value).toBe('CALENDARIO DE VENCIMIENTOS — TÉRMINOS E INFORMES');
    expect(worksheet.getCell(2, 1).value).toBe('ID');
    expect(worksheet.getCell(3, 1).value).toBe('PD-2024-100');
  });
});
