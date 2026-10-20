import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportarAsignaturas } from './ImportarAsignaturas';
import { useImportAsignaturas, type ImportResult } from '../hooks/useImportAsignaturas';

vi.mock('../hooks/useImportAsignaturas', () => ({ useImportAsignaturas: vi.fn() }));
vi.mock('../utils/catalogImportTemplate', () => ({ downloadCatalogImportTemplate: vi.fn() }));

function preview(): ImportResult {
  return {
    success: true, dry_run: true, periodo: '2026-2', tiempo_ms: 1,
    carga: {
      programas: { creados: 0, actualizados: 3, omitidos: 11, sin_cambios: 11 },
      nucleos_tematicos: { creados: 0, actualizados: 0, omitidos: 33, sin_cambios: 33 },
      asignaturas: { creados: 47, actualizados: 440, omitidos: 5, sin_cambios: 5 },
      cetaps: { creados: 0, actualizados: 0, omitidos: 271, sin_cambios: 271 },
      ofertas_cetap_programa: { creados: 325, actualizados: 0, omitidos: 0, sin_cambios: 0 },
    },
    indicadores_pta: {
      asignaturas_modalidad_sin_definir: 0, asignaturas_con_excepcion: 2,
      horas_pta_calculadas_promedio: 159, asignaturas_disponibles_por_dt: {},
    },
    advertencias: [], errores: [], relaciones_cruzadas: [],
  };
}

const uploadCatalog = vi.fn();
let result: ImportResult;

beforeEach(() => {
  vi.clearAllMocks();
  result = preview();
  vi.mocked(useImportAsignaturas).mockImplementation(() => ({
    uploadCatalog, getPeriodos: vi.fn().mockResolvedValue([{ codigo: '2026-2', estado: 'en_curso' }]),
    checkEstructuraStatus: vi.fn().mockResolvedValue({ isReady: true }),
    resetImportState: vi.fn(), loading: false, progress: 0, result, error: null,
  } as unknown as ReturnType<typeof useImportAsignaturas>));
});
afterEach(cleanup);

describe('vista previa de una carga en un período sin oferta', () => {
  it('cuenta todo el archivo sin duplicar el alias sin_cambios ni importar automáticamente', async () => {
    render(<ImportarAsignaturas onBack={vi.fn()} initialPeriodo="2026-2" />);
    expect(await screen.findByText('Archivo validado — falta confirmar la importación')).toBeTruthy();
    expect(within(screen.getByText('Programas del archivo').parentElement!).getByText('14')).toBeTruthy();
    expect(within(screen.getByText('Asignaturas del archivo').parentElement!).getByText('492')).toBeTruthy();
    expect(screen.getByText(/Aunque el período 2026-2 esté vacío/)).toBeTruthy();
    expect(screen.getByText(/«Por actualizar» indica cambios al catálogo compartido/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Importar ahora' })).toBeTruthy();
    expect(uploadCatalog).not.toHaveBeenCalled();
    expect(screen.queryByText('Parcial')).toBeNull();
    expect(within(screen.getByRole('row', { name: /Programas Académicos/ })).getByText('OK')).toBeTruthy();
  });

  it('mantiene los conteos y el estado correcto con respuestas que solo incluyen omitidos', () => {
    for (const cuenta of Object.values(result.carga)) delete cuenta.sin_cambios;
    render(<ImportarAsignaturas onBack={vi.fn()} initialPeriodo="2026-2" />);
    expect(within(screen.getByText('Asignaturas del archivo').parentElement!).getByText('492')).toBeTruthy();
    expect(screen.queryByText('Parcial')).toBeNull();
  });

  it('distingue los rechazados de los registros reutilizables y conserva sus errores', () => {
    result.success = false;
    result.carga.asignaturas.rechazadas = 1;
    result.errores = ['ASIGNATURAS fila 494: falta codigo_programa.'];
    render(<ImportarAsignaturas onBack={vi.fn()} initialPeriodo="2026-2" />);
    expect(within(screen.getByText('Asignaturas del archivo').parentElement!).getByText('493')).toBeTruthy();
    expect(screen.getByText('ASIGNATURAS fila 494: falta codigo_programa.')).toBeTruthy();
    expect(screen.getAllByRole('row').filter(row => within(row).queryByText('Parcial'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Importar válidos (492)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Importar ahora' })).toBeNull();
  });

  it('conserva las advertencias reales que devuelve la validación', () => {
    result.advertencias = ['Una asignatura requiere revisión de modalidad.'];
    render(<ImportarAsignaturas onBack={vi.fn()} initialPeriodo="2026-2" />);
    expect(screen.getByText(/Una asignatura requiere revisión de modalidad/)).toBeTruthy();
    expect(screen.getByText('1 advertencia(s)')).toBeTruthy();
  });
});
