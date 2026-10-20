// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectorCatalogo } from './SelectorCatalogo';
import { DisponibilidadAulas } from './DisponibilidadAulas';
import {
  getAulas, getCetaps, getDisponibilidadAula, getProgramas, getTerritoriales,
} from '../services/api/catalogoApi';

// Se conservan las constantes y los tipos reales del módulo; solo las llamadas al servidor se simulan.
vi.mock('../services/api/catalogoApi', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../services/api/catalogoApi')>()),
  getProgramas: vi.fn(), getCatalogoPorSemestre: vi.fn(), getAsignaturaPorCodigo: vi.fn(),
  getAulas: vi.fn(), getDisponibilidadAula: vi.fn(), getTerritoriales: vi.fn(), getCetaps: vi.fn(),
  crearAula: vi.fn(), actualizarAula: vi.fn(), eliminarAula: vi.fn(),
}));
// Piezas pesadas ajenas a lo que se prueba.
vi.mock('./GestionGrupos', () => ({ GestionGrupos: () => null }));
vi.mock('./BuscarPorCodigo', () => ({ BuscarPorCodigo: () => null }));

/**
 * El catálogo y la ocupación de aulas son del PERIODO seleccionado.
 *
 * Reportes de Tomás: el Catálogo Académico no cambiaba con el periodo, y al cambiar de periodo las
 * aulas seguían ocupadas. Se prueba lo que la pantalla le pide al servidor y lo que le dice al usuario.
 */
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('Catálogo Académico: depende del periodo', () => {
  it('pide los programas DEL PERIODO seleccionado y vuelve a pedirlos al cambiar de periodo', async () => {
    vi.mocked(getProgramas).mockResolvedValue([
      { id: '1', codigo: 'PRO-1', nombre: 'Programa uno', tipo: 'pregrado', nivel: 'pregrado', modalidad: 'presencial', horasBasePorCredito: 16 } as any,
    ]);
    const { rerender } = render(<SelectorCatalogo idPeriodo="220" />);
    await waitFor(() => expect(getProgramas).toHaveBeenCalledWith(undefined, '220'));

    rerender(<SelectorCatalogo idPeriodo="11" />);
    await waitFor(() => expect(getProgramas).toHaveBeenCalledWith(undefined, '11'));
  });

  it('un periodo sin oferta cargada NO dice «sin permisos»: dice que no tiene oferta y dónde cargarla', async () => {
    vi.mocked(getProgramas).mockResolvedValue([]);
    render(<SelectorCatalogo idPeriodo="220" />);
    expect(await screen.findByText('Este periodo no tiene oferta cargada')).toBeTruthy();
    expect(screen.getByText(/«Periodos»/)).toBeTruthy();
    expect(screen.queryByText('Sin niveles habilitados')).toBeNull();
  });

  it('sin periodo (cargando la cabecera) el vacío sigue siendo el de permisos', async () => {
    vi.mocked(getProgramas).mockResolvedValue([]);
    render(<SelectorCatalogo idPeriodo="" />);
    expect(await screen.findByText('Sin niveles habilitados')).toBeTruthy();
  });
});

describe('Disponibilidad de aulas: la ocupación es del periodo', () => {
  beforeEach(() => {
    vi.mocked(getAulas).mockResolvedValue([{ codigo: '101', nombre: 'Aula 101', sedeCodigo: 'SC', capacidad: 30, provisional: false } as any]);
    vi.mocked(getTerritoriales).mockResolvedValue([]);
    vi.mocked(getCetaps).mockResolvedValue([]);
    vi.mocked(getDisponibilidadAula).mockResolvedValue({ aula: '101', ocupada: [] });
  });

  it('pide la ocupación del aula con el periodo seleccionado y la repite al cambiarlo', async () => {
    const { rerender } = render(<DisponibilidadAulas idPeriodo="220" />);
    await waitFor(() => expect(getDisponibilidadAula).toHaveBeenCalledWith('101', { periodo: '220' }));

    rerender(<DisponibilidadAulas idPeriodo="11" />);
    await waitFor(() => expect(getDisponibilidadAula).toHaveBeenCalledWith('101', { periodo: '11' }));
  });

  it('sin periodo pide la ocupación sin acotar (como antes)', async () => {
    render(<DisponibilidadAulas />);
    await waitFor(() => expect(getDisponibilidadAula).toHaveBeenCalledWith('101', { periodo: undefined }));
  });
});
