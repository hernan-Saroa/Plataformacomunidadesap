import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocentesBulkUpload } from './BancoDocentesBulkUpload';
import { bulkUploadBancoDocentes, getRundConvocatorias } from '../../../services/api/ptaApi';
import { downloadBancoDocentesTemplate } from '../../../utils/bancoDocentesExcel';

vi.mock('../../../services/api/ptaApi', () => ({ getRundConvocatorias: vi.fn().mockResolvedValue([]), bulkUploadBancoDocentes: vi.fn() }));
vi.mock('../../../utils/bancoDocentesExcel', () => ({ downloadBancoDocentesTemplate: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

const props = { onBack: vi.fn(), onSuccess: vi.fn() };
const archivo = () => new File(['x'], 'CargaDocentes_RUND_2026-1.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
});

beforeEach(() => {
  vi.mocked(downloadBancoDocentesTemplate).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('descarga la plantilla con el período seleccionado', () => {
  render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-1" />);
  fireEvent.click(screen.getByRole('button', { name: /Descargar Plantilla Excel/ }));
  expect(downloadBancoDocentesTemplate).toHaveBeenCalledWith('2026-1');
});

it('si el período seleccionado no es AAAA-1/2 deja que la plantilla use el período vigente', () => {
  render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="Todos" />);
  fireEvent.click(screen.getByRole('button', { name: /Descargar Plantilla Excel/ }));
  expect(downloadBancoDocentesTemplate).toHaveBeenCalledWith(undefined);
});

it('las instrucciones describen el formato oficial de una sola hoja', () => {
  render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-1" />);
  expect(screen.getByText(/Hoja CARGA_DOCENTES con las 38 columnas oficiales/)).toBeTruthy();
  expect(screen.queryByText(/dos hojas/)).toBeNull();
});

it('al subir el archivo lo valida en modo previsualización con el período y luego importa los válidos', async () => {
  vi.mocked(bulkUploadBancoDocentes).mockResolvedValue({
    success: true,
    data: {
      total: 3, created: 2, updated: 0, unchanged: 0, errors: 1, results: [],
      errorDetails: [{ fila: 5, hoja: 'CARGA_DOCENTES', columna: 'TERRITORIAL', message: 'Territorial inválida' }],
    },
  } as any);
  const { container } = render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-1" />);
  const file = archivo();
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });

  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenCalledWith(file, true, false, '2026-1', undefined));
  const importar = await screen.findByRole('button', { name: /Importar ahora/ });
  fireEvent.click(importar);

  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenLastCalledWith(file, false, true, '2026-1', undefined));
  await waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
});

it('rechaza archivos que no sean xlsx, xls o csv sin llamar al backend', () => {
  const { container } = render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-1" />);
  const zona = container.querySelector('[class*="border-dashed"]') as HTMLElement | null;
  const pdf = new File(['x'], 'docentes.pdf', { type: 'application/pdf' });
  expect(zona).not.toBeNull();
  fireEvent.drop(zona!, { dataTransfer: { files: [pdf] } });
  expect(bulkUploadBancoDocentes).not.toHaveBeenCalled();
});

it('permite buscar y reutilizar una convocatoria del período y asociar docentes sin cambios', async () => {
  vi.mocked(getRundConvocatorias).mockResolvedValue([{ nombre: 'Convocatoria Pública 2026', clave: 'convocatoria publica 2026' }]);
  vi.mocked(bulkUploadBancoDocentes).mockResolvedValue({ success: true, data: {
    total: 1, created: 0, updated: 0, unchanged: 1, errors: 0, results: [], errorDetails: [],
  } } as any);
  const { container } = render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-2" />);
  const input = screen.getByRole('combobox', { name: /Convocatoria/ });
  fireEvent.change(input, { target: { value: 'publica' } });
  fireEvent.click(await screen.findByRole('option', { name: 'Convocatoria Pública 2026' }));
  const file = archivo();
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenCalledWith(file, true, false, '2026-2', 'Convocatoria Pública 2026'));
  fireEvent.click(await screen.findByRole('button', { name: 'Asociar a convocatoria' }));
  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenLastCalledWith(file, false, false, '2026-2', 'Convocatoria Pública 2026'));
  expect(getRundConvocatorias).toHaveBeenCalledWith('2026-2');
});

it('permite un nombre nuevo aunque fallen las sugerencias y limpia archivo y nombre al cambiar de período', async () => {
  vi.mocked(getRundConvocatorias).mockRejectedValue(new Error('Sin conexión'));
  const view = render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-2" />);
  await screen.findByText(/No se cargaron las sugerencias/);
  fireEvent.change(screen.getByRole('combobox', { name: /Convocatoria/ }), { target: { value: 'Convocatoria nueva' } });
  expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Convocatoria nueva');
  view.rerender(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2025-2" />);
  await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe(''));
  await waitFor(() => expect(getRundConvocatorias).toHaveBeenLastCalledWith('2025-2'));
});

it('permite asociar filas sin cambios si se escribe la convocatoria después de validar un archivo con errores', async () => {
  vi.mocked(getRundConvocatorias).mockResolvedValue([]);
  vi.mocked(bulkUploadBancoDocentes).mockResolvedValue({ success: true, data: {
    total: 2, created: 0, updated: 0, unchanged: 1, errors: 1, results: [],
    errorDetails: [{ fila: 3, columna: 'TERRITORIAL', message: 'Territorial inválida' }],
  } } as any);
  const { container } = render(<BancoDocentesBulkUpload {...props} periodoSeleccionado="2026-2" />);
  const file = archivo();
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenCalledWith(file, true, false, '2026-2', undefined));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nueva convocatoria' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Importar ahora (1)' }));
  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenLastCalledWith(file, false, true, '2026-2', 'Nueva convocatoria'));
});
