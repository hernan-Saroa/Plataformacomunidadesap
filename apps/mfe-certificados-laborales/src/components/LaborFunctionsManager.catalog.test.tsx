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
const profile = { id: 'p1', combined_code: '202812', position_code: '2028', grade_code: '12',
  position_name: 'Profesional de prueba', department_name: 'Dirección', functions: [], function_count: 2 };
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
    render(<LaborFunctionsManager />); await tick();
    expect(screen.getByText('Profesional de prueba')).toBeTruthy();
    expect(screen.queryByText('Asociados')).toBeNull();
    expect(screen.queryByText('Contratos asociados')).toBeNull();
    expect(screen.getByRole('button', { name: /Carga masiva/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Agregar individual/i })).toBeTruthy();
    expect(api.consultarEmpleadoFuncionesLaborales).not.toHaveBeenCalled();
  });
  it('distinguishes a failed catalog request from an empty catalog and retries', async () => {
    vi.mocked(api.listarFuncionesLaborales).mockRejectedValueOnce(new Error('Sin respuesta de PostgreSQL'));
    render(<LaborFunctionsManager />); await tick();
    expect(screen.getByRole('alert').textContent).toContain('Sin respuesta de PostgreSQL');
    expect(screen.queryByText('La matriz todavía está vacía')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await tick();
    expect(screen.getByText('Profesional de prueba')).toBeTruthy();
  });
  it('ignores an old list response after changing the search', async () => {
    let resolve!: (v: any) => void;
    vi.mocked(api.listarFuncionesLaborales).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<LaborFunctionsManager />); await tick();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por código/), { target: { value: 'nuevo' } });
    vi.mocked(api.listarFuncionesLaborales).mockResolvedValue(result([{ ...profile, position_name: 'Resultado nuevo' }]) as any);
    await tick();
    await act(async () => { resolve(result()); });
    expect(screen.getByText('Resultado nuevo')).toBeTruthy();
    expect(screen.queryByText('Profesional de prueba')).toBeNull();
  });
  it('queries a person only after opening the lookup and entering a search', async () => {
    vi.mocked(api.consultarEmpleadoFuncionesLaborales).mockResolvedValue({ items: [], total: 0, sources: { local: 0, oracle: 0, oracleAvailable: true } } as any);
    render(<LaborFunctionsManager />); await tick();
    fireEvent.click(screen.getByRole('button', { name: /Consultar empleado/i })); await tick(450);
    expect(api.consultarEmpleadoFuncionesLaborales).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(/Nombre completo o número/), { target: { value: '12345678' } });
    await tick(450);
    expect(api.consultarEmpleadoFuncionesLaborales).toHaveBeenCalledWith('12345678');
  });
});
