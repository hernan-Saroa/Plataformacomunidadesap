import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BancoDocentesBulkUpload } from './BancoDocentesBulkUpload';
import { bulkUploadBancoDocentes } from '../../../services/api/rundApi';
import { downloadBancoDocentesTemplate } from '../../../utils/bancoDocentesExcel';

vi.mock('../../../services/api/rundApi', () => ({ bulkUploadBancoDocentes: vi.fn() }));
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

  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenCalledWith(file, true, false, '2026-1'));
  const importar = await screen.findByRole('button', { name: /Importar ahora/ });
  fireEvent.click(importar);

  await waitFor(() => expect(bulkUploadBancoDocentes).toHaveBeenLastCalledWith(file, false, true, '2026-1'));
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
