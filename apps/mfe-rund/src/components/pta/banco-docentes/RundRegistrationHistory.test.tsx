import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RundRegistrationHistory, formatRegistrationDate } from './RundRegistrationHistory';
import { getRundRegistrationHistory, getRundRegistrationHistoryDetail } from '../../../services/api/rundApi';

vi.mock('../../../services/api/rundApi', () => ({ getRundRegistrationHistory: vi.fn(), getRundRegistrationHistoryDetail: vi.fn(), downloadBancoDocentesBulkSupport: vi.fn() }));
const event = { id: 'batch', tipo: 'MASIVO' as const, periodo: '2026-2', titulo: '100-docentes.xlsx', responsable: 'Gestora de Prueba',
  fecha: '2026-10-22T14:00:00Z', fechaFin: '2026-10-22T14:10:00Z', estado: 'COMPLETADA',
  resumen: { total: 100, creados: 100, actualizados: 0, sinCambios: 0, errores: 0 }, detalleCompleto: true };
const page = { data: [event], total: 1, page: 1, limit: 20, pages: 1, accesoCompleto: true };
const detail = { event, registros: [{ nombre: 'Docente de Prueba', documento_identidad: '123456', correo: 'docente@example.invalid',
  periodo: '2026-2', resultado: 'CREADO', fila: 2, fecha: '2026-10-22T14:00:00Z' }], total: 100, page: 1, limit: 25, pages: 4, detalleCompleto: true, accesoCompleto: true };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getRundRegistrationHistory).mockResolvedValue(page); vi.mocked(getRundRegistrationHistoryDetail).mockResolvedValue(detail); });
afterEach(cleanup);

describe('Pestaña de trazabilidad RUND', () => {
  it('agrupa cargas y creaciones por periodo, muestra responsables y abre el detalle bajo demanda', async () => {
    vi.mocked(getRundRegistrationHistory).mockResolvedValue({ ...page, total: 2, data: [event,
      { ...event, id: 'manual', tipo: 'INDIVIDUAL', periodo: '2025-2', titulo: 'Docente Individual', resumen: { total: 1, creados: 1 } }] });
    render(<RundRegistrationHistory canDownloadOriginal />);
    await screen.findByText('100-docentes.xlsx');
    expect(screen.getByRole('region', { name: 'Periodo 2026-2' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Periodo 2025-2' })).toBeTruthy();
    expect(screen.getAllByText('Gestora de Prueba')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Archivo original' })).toBeTruthy();
    expect(getRundRegistrationHistoryDetail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver personas' }));
    await screen.findByText('Docente de Prueba');
    expect(getRundRegistrationHistoryDetail).toHaveBeenCalledWith('MASIVO', 'batch', expect.objectContaining({ periodoCarga: '2026-2', page: 1 }));
    const region = within(screen.getByRole('region', { name: 'Personas de 100-docentes.xlsx' }));
    fireEvent.click(region.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(getRundRegistrationHistoryDetail).toHaveBeenLastCalledWith('MASIVO', 'batch', expect.objectContaining({ page: 2, periodoCarga: '2026-2' })));
  });

  it('los lectores no reciben descarga del archivo original y el detalle parcial se identifica', async () => {
    vi.mocked(getRundRegistrationHistoryDetail).mockResolvedValue({ ...detail, detalleCompleto: false });
    render(<RundRegistrationHistory periodoCarga="2026-2" />);
    await screen.findByText('100-docentes.xlsx');
    expect(screen.queryByRole('button', { name: 'Archivo original' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver personas' }));
    expect(await screen.findByText('Detalle histórico parcial')).toBeTruthy();
    expect(screen.getByText('Docente de Prueba')).toBeTruthy();
  });

  it('distingue una recuperación de la carga original y muestra los resultados documentados sin atribuirlos a Sistema', async () => {
    const recoveredEvent = { ...event, origen: 'RECUPERACION_INFORMATIVA' as const, responsable: 'No registrado', responsableRecuperacion: 'Sistema',
      resumen: { total: 263, recuperados: 263 } };
    vi.mocked(getRundRegistrationHistory).mockResolvedValue({ ...page, data: [recoveredEvent] });
    vi.mocked(getRundRegistrationHistoryDetail).mockResolvedValue({ ...detail, event: recoveredEvent, registros: [{ ...detail.registros[0], resultado: 'RECUPERADO' }] });
    render(<RundRegistrationHistory periodoCarga="2026-2" />);
    await screen.findByText('Recuperación histórica');
    expect(screen.getByText('No quedó registrado')).toBeTruthy();
    expect(screen.getByText(/Recuperación ejecutada por: Proceso automático/)).toBeTruthy();
    expect(screen.queryByText('Sistema')).toBeNull();
    expect(screen.getByText('Perfiles con información recuperada')).toBeTruthy();
    expect(screen.queryByText('Creados')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver personas' }));
    expect(await screen.findByText('Información recuperada')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Fecha de recuperación' })).toBeTruthy();
    expect(screen.queryByText('Resultado no conservado')).toBeNull();
  });

  it('filtra por tipo sin cambiar el periodo seleccionado y distingue los errores de una lista vacía', async () => {
    vi.mocked(getRundRegistrationHistory).mockRejectedValueOnce(new Error('Sin acceso'));
    render(<RundRegistrationHistory periodoCarga="2026-2" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Sin operaciones registradas')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('100-docentes.xlsx');
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de operación' }), { target: { value: 'INDIVIDUAL' } });
    await waitFor(() => expect(getRundRegistrationHistory).toHaveBeenLastCalledWith(expect.objectContaining({ periodoCarga: '2026-2', tipo: 'INDIVIDUAL', page: 1 })));
  });

  it('descarta respuestas tardías de otro periodo', async () => {
    let resolveOld: (value: any) => void = () => {};
    vi.mocked(getRundRegistrationHistory).mockImplementationOnce(() => new Promise<any>(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ ...page, data: [{ ...event, periodo: '2025-2', titulo: 'Periodo nuevo seleccionado.xlsx' }] });
    const view = render(<RundRegistrationHistory periodoCarga="2026-2" />);
    view.rerender(<RundRegistrationHistory periodoCarga="2025-2" />);
    await screen.findByText('Periodo nuevo seleccionado.xlsx');
    await act(async () => resolveOld(page));
    expect(screen.queryByText('100-docentes.xlsx')).toBeNull();
  });

  it('muestra las horas en Colombia aunque el navegador use otra zona', () => {
    expect(formatRegistrationDate('2026-10-22T14:00:00Z')).toMatch(/9:00:00/);
  });
});
