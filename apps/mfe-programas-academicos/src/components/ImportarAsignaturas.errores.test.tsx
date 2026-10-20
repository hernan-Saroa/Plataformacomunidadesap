import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ImportarAsignaturas } from './ImportarAsignaturas';
import { apiClient } from '../services/api/apiClient';
import type { ImportResult } from '../hooks/useImportAsignaturas';

vi.mock('../services/api/apiClient', () => ({ apiClient: { upload: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../utils/catalogImportTemplate', () => ({ downloadCatalogImportTemplate: vi.fn() }));

const errors = [
  'ASIGNATURAS fila 490 (ASIG-00489, Pensum AP_34): nombre_programa "Administración Pública - Nocturno" corresponde a PRO-002, pero codigo_programa "PRO-001" corresponde a "Administración Pública - Diurno". Corrija la asociación entre código y nombre del programa antes de importar.',
  'ASIGNATURAS fila 492 (ASIG-00491, Pensum AP_36): nombre_programa "Administración Pública - Nocturno" corresponde a PRO-002, pero codigo_programa "PRO-001" corresponde a "Administración Pública - Diurno". Corrija la asociación entre código y nombre del programa antes de importar.',
];
const validationError = Object.assign(new Error('Validación del Excel fallida. ' + errors.join(' ')), {
  status: 400, response: { data: { message: 'Validación del Excel fallida (Reglas bloqueantes R1-R6).', errors } },
});
const count = { creados: 1, actualizados: 0, omitidos: 0 };
const validResult: ImportResult = {
  success: true, dry_run: true, periodo: '2026-2', tiempo_ms: 1,
  carga: { programas: count, asignaturas: count, nucleos_tematicos: count, cetaps: count, ofertas_cetap_programa: count },
  indicadores_pta: { asignaturas_modalidad_sin_definir: 0, asignaturas_con_excepcion: 0, horas_pta_calculadas_promedio: 192, asignaturas_disponibles_por_dt: {} },
  advertencias: [], errores: [], relaciones_cruzadas: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(apiClient.get).mockImplementation(async url => url.includes('periodos-academicos')
    ? [{ codigo: '2026-2', estado: 'en_curso' }] : { isReady: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function selectFile(container: HTMLElement, name = 'catalogo.xlsx') {
  await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeTruthy());
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['excel'], name)] } });
}

describe('errores de importación en pantalla y notificación', () => {
  it('muestra cada fila por separado, resume el toast y permite corregir y completar el cargue', async () => {
    vi.mocked(apiClient.upload).mockRejectedValueOnce(validationError);
    const onImportSuccess = vi.fn();
    const { container } = render(<ImportarAsignaturas onBack={vi.fn()} onImportSuccess={onImportSuccess} initialPeriodo="2026-2" />);
    await selectFile(container);
    expect(await screen.findByRole('heading', { name: 'El archivo necesita ajustes' })).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Qué debes corregir' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Fila 490')).toBeTruthy();
    expect(within(list).getByText('Fila 492')).toBeTruthy();
    expect(screen.getByText('catalogo.xlsx')).toBeTruthy();
    expect(screen.queryByText(/Reglas bloqueantes R1-R6/)).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('El archivo necesita ajustes', {
      description: 'Hay 2 problemas por corregir. Consulta el detalle en pantalla.',
    });
    expect(screen.queryByRole('button', { name: 'Importar ahora' })).toBeNull();
    expect(onImportSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cargar archivo corregido' }));
    vi.mocked(apiClient.upload).mockResolvedValueOnce(validResult);
    await selectFile(container, 'corregido.xlsx');
    const importar = await screen.findByRole('button', { name: 'Importar ahora' });
    expect(screen.queryByRole('heading', { name: 'El archivo necesita ajustes' })).toBeNull();
    vi.mocked(apiClient.upload).mockResolvedValueOnce({ ...validResult, dry_run: false });
    fireEvent.click(importar);
    expect(await screen.findByText('¡Importación exitosa!')).toBeTruthy();
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.upload).mock.calls.map(call => call[0])).toEqual([
      '/pta/api/v1/asignaturas-import/upload?dry_run=true&periodo_codigo=2026-2&omit_errors=false',
      '/pta/api/v1/asignaturas-import/upload?dry_run=true&periodo_codigo=2026-2&omit_errors=false',
      '/pta/api/v1/asignaturas-import/upload?dry_run=false&periodo_codigo=2026-2&omit_errors=false',
    ]);
  });

  it('presenta un fallo del servidor sin bloques de texto técnico y permite volver', async () => {
    vi.mocked(apiClient.upload).mockRejectedValueOnce(Object.assign(new Error('<html>Stack trace inesperado</html>'), { status: 502 }));
    const onBack = vi.fn();
    const { container } = render(<ImportarAsignaturas onBack={onBack} initialPeriodo="2026-2" />);
    await selectFile(container);
    expect(await screen.findByRole('heading', { name: 'No pudimos completar la carga' })).toBeTruthy();
    expect(screen.queryByText(/Stack trace inesperado/)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Qué debes corregir' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a programas' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
