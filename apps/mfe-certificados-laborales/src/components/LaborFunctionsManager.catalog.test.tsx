import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LaborFunctionsManager } from './LaborFunctionsManager';
import { certificadosService } from '../../services/api/certificados.service';

vi.mock('../../services/api/certificados.service', () => ({ certificadosService: { laborales: {
  listarFuncionesLaborales: vi.fn(), consultarEmpleadoFuncionesLaborales: vi.fn(),
  listarSeleccionFuncionesLaborales: vi.fn(),
} } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
const api = certificadosService.laborales;
const profile = { id: 'p1', id_number: '12345678', functions: [], function_count: 2 };
const result = (items = [profile]) => ({ items, total: items.length, page: 1, limit: 15, totalPages: 1,
  stats: { profiles: items.length, functions: items.length * 2 } });
const tick = async (ms = 300) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(result() as any);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Functions catalog without aggregate associations', () => {
  it('shows saved functions and management controls without querying employees', async () => {
    render(<LaborFunctionsManager canManage />); await tick();
    expect(screen.getByText('12345678')).toBeTruthy();
    expect(screen.queryByText('Asociados')).toBeNull();
    expect(screen.queryByText('Contratos asociados')).toBeNull();
    expect(screen.getByRole('button', { name: /Carga masiva/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Agregar individual/i })).toBeTruthy();
    expect(api.consultarEmpleadoFuncionesLaborales).not.toHaveBeenCalled();
  });
  it('distinguishes a failed catalog request from an empty catalog and retries', async () => {
    vi.mocked(api.listarFuncionesLaborales).mockRejectedValueOnce(new Error('Sin respuesta de PostgreSQL'));
    render(<LaborFunctionsManager canManage />); await tick();
    expect(screen.getByRole('alert').textContent).toContain('Sin respuesta de PostgreSQL');
    expect(screen.queryByText('La matriz todavía está vacía')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await tick();
    expect(screen.getByText('12345678')).toBeTruthy();
  });
  it('ignores an old list response after changing the search', async () => {
    let resolve!: (v: any) => void;
    vi.mocked(api.listarFuncionesLaborales).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por número de identificación/), { target: { value: '87654321' } });
    vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(result([{ ...profile, id_number: '87654321' }]) as any);
    await tick();
    await act(async () => { resolve(result()); });
    expect(screen.getByText('87654321')).toBeTruthy();
    expect(screen.queryByText('12345678')).toBeNull();
  });
  it('queries a person only after opening the lookup and entering a search', async () => {
    vi.mocked(api.consultarEmpleadoFuncionesLaborales).mockResolvedValue({ items: [], total: 0, sources: { local: 0, oracle: 0, oracleAvailable: true } } as any);
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: /Consultar empleado/i })); await tick(450);
    expect(api.consultarEmpleadoFuncionesLaborales).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(/Nombre completo o número/), { target: { value: '12345678' } });
    await tick(450);
    expect(api.consultarEmpleadoFuncionesLaborales).toHaveBeenCalledWith('12345678');
  });
  it('shows the selected labor linkage and copy controls without the old profile notice', async () => {
    vi.mocked(api.consultarEmpleadoFuncionesLaborales).mockResolvedValue({
      search: '53062883', total: 1, limit: 25,
      sources: { local: 1, oracle: 0, oracleAvailable: false },
      items: [{
        origen: 'local', full_name: 'DIANA MARIA GUTIERREZ RAMIREZ',
        id_number: '53062883', document_type: 'CC', email: 'diana@example.com',
        hiring_date: '2024-05-14', position_category: 'Cra. Administrativa',
        total_vinculaciones: 3, functions_match_status: 'MATCHED',
        matched_profile: { id: 'assigned', id_number: '53062883', function_count: 13, is_active: true },
        matrix: { position_code: '2028', grade_code: '16', combined_code: '202816',
          hierarchical_level: 'Profesional', position_name: 'Profesional Especializado',
          department_name: 'Dirección de Talento Humano', internal_group: 'Grupo de Personal' },
        profiles_same_code: 0, near_matches: [],
      }],
    } as any);
    render(<LaborFunctionsManager canManage />); await tick();
    fireEvent.click(screen.getByRole('button', { name: /Consultar empleado/i }));
    fireEvent.change(screen.getByPlaceholderText(/Nombre completo o número/), { target: { value: '53062883' } });
    await tick(450);
    expect(screen.getByText('DIANA MARIA GUTIERREZ RAMIREZ')).toBeTruthy();
    expect(screen.getByText('Profesional Especializado')).toBeTruthy();
    expect(screen.getByText('Dirección de Talento Humano')).toBeTruthy();
    expect(screen.getByText(/Tiene 3 vinculaciones/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar Código base' })).toBeTruthy();
    expect(screen.queryByText(/Ya existe un perfil que le aplica/)).toBeNull();
    expect(screen.queryByText(/13 funciones/)).toBeNull();
  });
});
